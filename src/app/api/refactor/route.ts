import { NextRequest, NextResponse } from "next/server";
import { embedSingle } from "@/lib/embeddings/hf";
import { hybridSearch } from "@/lib/retrieval/search";
import { generateAnswer } from "@/lib/qa/groq";
import { formatRetrievedSnippets } from "@/lib/qa/citations";
import {
  buildFallbackRefactorSuggestions,
  buildRefactorPrompt,
  parseRefactorSuggestions,
} from "@/lib/qa/refactor";
import { RefactorResponse, RefactorSuggestion } from "@/types";

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
      console.error("Refactor embedding error:", error);
    }

    const chunks = await hybridSearch(sourceId, normalizedQuestion, queryEmbedding, 8);
    if (chunks.length === 0) {
      const response: RefactorResponse = {
        suggestions: [],
        note_when_insufficient_evidence: "No indexed chunks were retrieved for refactor suggestions.",
      };
      return NextResponse.json(response);
    }

    const snippets = formatRetrievedSnippets(chunks);
    let suggestions: RefactorSuggestion[] = [];

    try {
      const prompt = buildRefactorPrompt(normalizedQuestion, chunks);
      const raw = await generateAnswer(prompt);
      suggestions = parseRefactorSuggestions(raw, snippets);
    } catch (error) {
      console.error("Refactor suggestion generation failed:", error);
    }

    if (suggestions.length === 0) {
      suggestions = buildFallbackRefactorSuggestions(snippets, normalizedQuestion);
    }

    const response: RefactorResponse = { suggestions };
    if (response.suggestions.length === 0) {
      response.note_when_insufficient_evidence = "No citable snippets were available for refactor suggestions.";
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Refactor API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate refactor suggestions" },
      { status: 500 },
    );
  }
}
