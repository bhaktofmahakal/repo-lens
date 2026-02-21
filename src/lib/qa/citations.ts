/* utsav */
import { config } from "@/lib/config";
import { Chunk, Citation } from "@/types";

function toCitation(chunk: Chunk): Citation {
  return {
    filePath: chunk.file_path,
    startLine: chunk.start_line,
    endLine: chunk.end_line,
    snippet: chunk.content,
    sourceUrl: chunk.source_url,
  };
}

function dedupeCitations(citations: Citation[]): Citation[] {
  return citations.filter(
    (citation, index, list) =>
      index ===
      list.findIndex(
        (item) =>
          item.filePath === citation.filePath &&
          item.startLine === citation.startLine &&
          item.endLine === citation.endLine,
      ),
  );
}

export function extractCitations(answer: string, chunks: Chunk[]): Citation[] {
  const citations: Citation[] = [];
  const lowercaseAnswer = answer.toLowerCase();

  for (const chunk of chunks) {
    const path = chunk.file_path.toLowerCase();
    const fileName = path.split("/").pop() || path;
    if (lowercaseAnswer.includes(path) || lowercaseAnswer.includes(fileName)) {
      citations.push(toCitation(chunk));
    }
  }

  const fallbackCitations = chunks.map(toCitation);
  const selected = citations.length > 0 ? citations : fallbackCitations;

  return dedupeCitations(selected).slice(0, config.defaultCitationLimit);
}

export function formatRetrievedSnippets(chunks: Chunk[]): Citation[] {
  return chunks.slice(0, config.defaultSnippetLimit).map(toCitation);
}
