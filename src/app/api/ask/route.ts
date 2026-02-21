/* utsav */
import { NextRequest, NextResponse } from "next/server";
import { embedSingle } from "@/lib/embeddings/hf";
import { hybridSearch } from "@/lib/retrieval/search";
import { buildPrompt } from "@/lib/qa/prompt";
import { generateAnswer } from "@/lib/qa/groq";
import { extractCitations, formatRetrievedSnippets } from "@/lib/qa/citations";
import { supabase } from "@/lib/db";
import { AskResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { question, sourceId } = await req.json();

    const normalizedQuestion = typeof question === "string" ? question.trim() : "";
    if (!normalizedQuestion || !sourceId) {
      return NextResponse.json({ error: "Question and Source ID are required." }, { status: 400 });
    }

    // Generate embedding for the question
    let queryEmbedding: number[] | undefined;
    try {
      queryEmbedding = await embedSingle(normalizedQuestion);
    } catch (error) {
      console.error("Embedding error:", error);
    }

    // Retrieve relevant chunks
    const chunks = await hybridSearch(sourceId, normalizedQuestion, queryEmbedding);

    if (chunks.length === 0) {
      return NextResponse.json({
        answer: "Insufficient evidence in the indexed codebase.",
        citations: [],
        retrievedSnippets: [],
        note_when_insufficient_evidence: "No indexed chunks were retrieved for this question.",
      });
    }

    let answer = "Insufficient evidence in the indexed codebase.";
    try {
      const prompt = buildPrompt(normalizedQuestion, chunks);
      answer = await generateAnswer(prompt);
    } catch (error) {
      console.error("LLM answer generation failed:", error);
      answer =
        "Insufficient evidence in the indexed codebase. Retrieved snippets are provided below for manual verification.";
    }

    // Extract citations
    const citations = extractCitations(answer, chunks);
    const retrievedSnippets = formatRetrievedSnippets(chunks);

    // Save history
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
    if (citations.length === 0) {
      response.note_when_insufficient_evidence = "No citable chunks were available for this answer.";
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Ask API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process question" }, { status: 500 });
  }
}
