import { config } from "@/lib/config";
import { Chunk } from "@/types";

export function chunkFile(filePath: string, content: string, sourceUrl?: string): Partial<Chunk>[] {
  if (content.length > config.maxFileChars) {
    return [];
  }

  const lines = content.split('\n');
  const chunks: Partial<Chunk>[] = [];
  const WINDOW_SIZE = 60;
  const OVERLAP = 10;

  for (let i = 0; i < lines.length; i += (WINDOW_SIZE - OVERLAP)) {
    const startLine = i + 1;
    const endLine = Math.min(i + WINDOW_SIZE, lines.length);
    const chunkContent = lines.slice(i, endLine).join('\n');
    
    chunks.push({
      file_path: filePath,
      start_line: startLine,
      end_line: endLine,
      content: chunkContent,
      source_url: sourceUrl ? `${sourceUrl}#L${startLine}-L${endLine}` : undefined,
    });

    if (endLine === lines.length) break;
  }

  return chunks;
}
