import { NextRequest, NextResponse } from "next/server";
import { embedSingle } from "@/lib/embeddings/hf";
import { hybridSearch } from "@/lib/retrieval/search";
import { buildPrompt } from "@/lib/qa/prompt";
import { generateAnswer } from "@/lib/qa/groq";
import { extractCitations, formatRetrievedSnippets } from "@/lib/qa/citations";
import { supabase } from "@/lib/db";
import { AskResponse } from "@/types";

const INSUFFICIENT_EVIDENCE_PREFIX = "insufficient evidence in the indexed codebase";

function buildSnippetPreview(snippet: string): string {
  const oneLine = snippet.replace(/\s+/g, " ").trim();
  if (oneLine.length <= 160) return oneLine;
  return `${oneLine.slice(0, 157)}...`;
}

function buildEvidenceBackedFallbackAnswer(
  question: string,
  snippets: ReturnType<typeof formatRetrievedSnippets>,
): string {
  const lines = snippets
    .slice(0, 3)
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
