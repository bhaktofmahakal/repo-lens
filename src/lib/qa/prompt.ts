/* utsav */
import { Chunk } from "@/types";

export function buildPrompt(question: string, chunks: Chunk[]): string {
  const evidence = chunks
    .map((c, i) => `[Evidence ${i+1}: ${c.file_path} (lines ${c.start_line}-${c.end_line})]\n${c.content}`)
    .join('\n\n');

return `You are a technical Q&A assistant for codebases. Use the provided evidence to answer the question concisely and accurately.
Every claim must be backed by evidence from the provided snippets.
For each claim, mention the file path and line range.
Prefer explicit references in this format: [path/to/file.ext:L10-L20].
If the evidence is insufficient to answer the question, state: "Insufficient evidence in the indexed codebase."
Do NOT use outside knowledge. Answer ONLY based on the provided evidence.

EVIDENCE:
${evidence}

QUESTION:
${question}

ANSWER:`;
}
