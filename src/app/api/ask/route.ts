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

    if (!question || !sourceId) {
      return NextResponse.json({ error: "Question and Source ID are required." }, { status: 400 });
    }

    // Generate embedding for the question
    let queryEmbedding: number[] | undefined;
    try {
      queryEmbedding = await embedSingle(question);
    } catch (error) {
      console.error("Embedding error:", error);
    }

    // Retrieve relevant chunks
    const chunks = await hybridSearch(sourceId, question, queryEmbedding);

    if (chunks.length === 0) {
      return NextResponse.json({
        answer: "No relevant code found for the question.",
        citations: [],
        retrievedSnippets: [],
      });
    }

    // Generate answer
    const prompt = buildPrompt(question, chunks);
    const answer = await generateAnswer(prompt);

    // Extract citations
    const citations = extractCitations(answer, chunks);
    const retrievedSnippets = formatRetrievedSnippets(chunks);

    // Save history
    const { error: historyError } = await supabase.from("qa_history").insert({
      source_id: sourceId,
      question,
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

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Ask API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process question" }, { status: 500 });
  }
}
