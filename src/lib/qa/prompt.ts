import { Chunk } from "@/types";

export function buildPrompt(question: string, chunks: Chunk[]): string {
  const evidence = chunks
    .map((c, i) => `[Evidence ${i+1}: ${c.file_path} (lines ${c.start_line}-${c.end_line})]\n${c.content}`)
    .join('\n\n');

return `You are an expert technical code intelligence assistant. Use the provided evidence to answer the question clearly, concisely, and accurately.
Guidelines:
1. Answer the question directly using the provided code snippets and documentation.
2. Back every claim by citing the file path and line numbers using this exact format: [path/to/file.ext:L10-L20].
3. If the retrieved snippets partially answer the question, explain the architecture and patterns revealed by the evidence and note what details remain uncovered.
4. Only if the retrieved snippets are completely irrelevant to the question should you state: "Insufficient evidence in the indexed codebase."
5. Do NOT hallucinate or guess APIs not evidenced in the snippets.

EVIDENCE:
${evidence}

QUESTION:
${question}

ANSWER:`;
}
