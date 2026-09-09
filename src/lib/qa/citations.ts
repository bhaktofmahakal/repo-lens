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

/**
 * Automatically linkifies code citations in markdown text,
 * transforming [path/to/file.ext:L10-L20] or [file.ts:L15]
 * into clickable markdown links pointing to /source or the original repository file.
 */
export function linkifyCitations(
  content: string,
  sourceId?: string,
  citations?: Citation[],
): string {
  if (!content) return "";

  // If text already wraps in [[citation]](url) or [citation](url), do not double wrap
  // Match [filePath:LX-LY] that is neither preceded by '[' nor followed by '](' or '('
  const citationRegex = /(^|[^[])\[([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+):L?(\d+)(?:-L?(\d+))?\](?![\](])/g;

  return content.replace(citationRegex, (fullMatch, prefix, filePath, startLine, endLine) => {
    const matchingCitation = citations?.find(
      (c) => c.filePath.toLowerCase() === filePath.toLowerCase(),
    );

    const lineHash = endLine ? `#L${startLine}-L${endLine}` : `#L${startLine}`;

    let targetUrl = matchingCitation?.sourceUrl;
    if (!targetUrl && sourceId) {
      targetUrl = `/source?sourceId=${encodeURIComponent(sourceId)}&path=${encodeURIComponent(filePath)}${lineHash}`;
    }

    if (targetUrl) {
      return `${prefix}[[${filePath}:L${startLine}${endLine ? `-L${endLine}` : ""}]](${targetUrl})`;
    }

    return fullMatch;
  });
}
