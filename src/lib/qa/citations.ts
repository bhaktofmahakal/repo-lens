import { Chunk, Citation } from "@/types";

export function extractCitations(answer: string, chunks: Chunk[]): Citation[] {
  const citations: Citation[] = [];
  const lowercaseAnswer = answer.toLowerCase();

  for (const chunk of chunks) {
    if (lowercaseAnswer.includes(chunk.file_path.toLowerCase())) {
      citations.push({
        filePath: chunk.file_path,
        startLine: chunk.start_line,
        endLine: chunk.end_line,
        snippet: chunk.content,
        sourceUrl: chunk.source_url,
      });
    }
  }

  // Deduplicate by file and line range
  const uniqueCitations = citations.filter((c, index, self) =>
    index === self.findIndex((t) => (
      t.filePath === c.filePath && t.startLine === c.startLine && t.endLine === c.endLine
    ))
  );

  return uniqueCitations;
}

export function formatRetrievedSnippets(chunks: Chunk[]): Citation[] {
  return chunks.map(c => ({
    filePath: c.file_path,
    startLine: c.start_line,
    endLine: c.end_line,
    snippet: c.content,
    sourceUrl: c.source_url,
  }));
}
