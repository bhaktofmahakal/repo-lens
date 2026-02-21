import { NextRequest, NextResponse } from "next/server";
import { embedSingle } from "@/lib/embeddings/hf";
import { hybridSearch } from "@/lib/retrieval/search";
import { buildPrompt } from "@/lib/qa/prompt";
import { generateAnswer } from "@/lib/qa/groq";
import { extractCitations, formatRetrievedSnippets } from "@/lib/qa/citations";
import { supabase } from "@/lib/db";
import { AskResponse } from "@/types";

const INSUFFICIENT_EVIDENCE_PREFIX = "insufficient evidence in the indexed codebase";
const QUESTION_STOPWORDS = new Set([
  "the",
  "is",
  "are",
  "was",
  "were",
  "how",
  "what",
  "where",
  "when",
  "why",
  "which",
  "who",
  "whom",
  "whose",
  "a",
  "an",
  "of",
  "to",
  "for",
  "from",
  "in",
  "on",
  "by",
  "with",
  "and",
  "or",
  "as",
  "it",
  "this",
  "that",
  "implemented",
  "handled",
]);

function buildSnippetPreview(snippet: string): string {
  const oneLine = snippet.replace(/\s+/g, " ").trim();
  if (oneLine.length <= 160) return oneLine;
  return `${oneLine.slice(0, 157)}...`;
}

function extractQuestionTerms(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^\w\s./:-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2 && !QUESTION_STOPWORDS.has(term));
}

function rankSnippetForQuestion(
  snippet: ReturnType<typeof formatRetrievedSnippets>[number],
  terms: string[],
  questionLower: string,
): number {
  const path = snippet.filePath.toLowerCase();
  const content = snippet.snippet.toLowerCase();
  const asksStyling = /\b(style|styling|theme|dark mode|dark|css|ui|color|colors|class)\b/i.test(questionLower);

  let score = 0;
  for (const term of terms) {
    if (path.includes(term)) score += 3;
    if (content.includes(term)) score += 1;
  }

  if (asksStyling) {
    if (path.endsWith(".css") || path.endsWith(".scss") || path.endsWith(".sass") || path.endsWith(".less")) {
      score += 5;
    }
    if (path.endsWith(".html") || path.endsWith(".tsx") || path.endsWith(".jsx")) {
      score += 2;
    }
    if (content.includes(":root") || content.includes("background") || content.includes("color:")) {
      score += 2;
    }
  }

  return score;
}

function selectFallbackSnippets(
  question: string,
  snippets: ReturnType<typeof formatRetrievedSnippets>,
): ReturnType<typeof formatRetrievedSnippets> {
  if (snippets.length <= 3) return snippets;

  const questionLower = question.toLowerCase();
  const terms = extractQuestionTerms(question);
  const ranked = snippets
    .map((snippet, index) => ({
      snippet,
      score: rankSnippetForQuestion(snippet, terms, questionLower),
      index,
    }))
    .sort((a, b) => (b.score === a.score ? a.index - b.index : b.score - a.score));

  const hasPositiveMatch = ranked.some((item) => item.score > 0);
  const base = hasPositiveMatch ? ranked.filter((item) => item.score > 0) : ranked;
  const selected = base.slice(0, 3).map((item) => item.snippet);

  return selected.length > 0 ? selected : snippets.slice(0, 3);
}

function buildEvidenceBackedFallbackAnswer(
  question: string,
  snippets: ReturnType<typeof formatRetrievedSnippets>,
): string {
  const selectedSnippets = selectFallbackSnippets(question, snippets);
  const lines = selectedSnippets
    .map(
      (snippet) =>
        `- [${snippet.filePath}:L${snippet.startLine}-L${snippet.endLine}] ${buildSnippetPreview(snippet.snippet)}`,
    )
    .join("\n");

  return `I could not generate a full narrative answer, but relevant evidence was retrieved for "${question}":\n${lines}\n\nUse these cited files and line ranges to verify the exact flow.`;
}

export async function POST(req: NextRequest) {
  try {
    const { question, sourceId } = await req.json();

    const normalizedQuestion = typeof question === "string" ? question.trim() : "";
    if (!normalizedQuestion || !sourceId) {
      return NextResponse.json({ error: "Question and Source ID are required." }, { status: 400 });
    }

    let queryEmbedding: number[] | undefined;
    try {
      queryEmbedding = await embedSingle(normalizedQuestion);
    } catch (error) {
      console.error("Embedding error:", error);
    }

    const chunks = await hybridSearch(sourceId, normalizedQuestion, queryEmbedding);
    const hasEvidence = chunks.length > 0;

    let answer = "Insufficient evidence in the indexed codebase.";
    let citations: ReturnType<typeof extractCitations> = [];
    let retrievedSnippets: ReturnType<typeof formatRetrievedSnippets> = [];
    let noteWhenInsufficientEvidence: string | undefined;

    if (!hasEvidence) {
      noteWhenInsufficientEvidence = "No indexed chunks were retrieved for this question.";
    } else {
      try {
        const prompt = buildPrompt(normalizedQuestion, chunks);
        answer = await generateAnswer(prompt);
      } catch (error) {
        console.error("LLM answer generation failed:", error);
        answer =
          "Insufficient evidence in the indexed codebase. Retrieved snippets are provided below for manual verification.";
      }

      citations = extractCitations(answer, chunks);
      retrievedSnippets = formatRetrievedSnippets(chunks);

      if (
        answer.trim().toLowerCase().startsWith(INSUFFICIENT_EVIDENCE_PREFIX) &&
        retrievedSnippets.length > 0
      ) {
        answer = buildEvidenceBackedFallbackAnswer(normalizedQuestion, retrievedSnippets);
      }

      if (citations.length === 0) {
        noteWhenInsufficientEvidence = "No citable chunks were available for this answer.";
      }
    }

    const { error: historyError } = await supabase.from("qa_history").insert({
      source_id: sourceId,
      question: normalizedQuestion,
      answer,
      citations_json: citations,
    });

    if (historyError) {
      console.error("Failed to save QA history:", historyError);
    }

    const response: AskResponse = {
      answer,
      citations,
      retrievedSnippets,
    };
    if (noteWhenInsufficientEvidence) {
      response.note_when_insufficient_evidence = noteWhenInsufficientEvidence;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Ask API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process question" }, { status: 500 });
  }
}
