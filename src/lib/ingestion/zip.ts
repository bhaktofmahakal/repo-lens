/* utsav */
import AdmZip from "adm-zip";
import { supabase } from "@/lib/db";
import { config } from "@/lib/config";
import { isBinaryFile, isIgnoredPath, isProbablyBinaryContent, sanitizeForDatabase } from "./filters";
import { chunkFile } from "./chunker";
import { embedTexts } from "@/lib/embeddings/hf";
import { IngestResult } from "@/types";

export async function ingestZip(buffer: Buffer, sourceId: string): Promise<IngestResult> {
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();
  
  let totalFiles = 0;
  let totalChars = 0;
  const allChunks: any[] = [];

  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;
    if (isBinaryFile(entry.name) || isIgnoredPath(entry.entryName)) continue;
    if (entry.entryName.includes('..')) continue; // Path traversal guard

    const rawContent = entry.getData().toString('utf8');
    if (isProbablyBinaryContent(rawContent)) continue;

    const content = sanitizeForDatabase(rawContent);
    if (!content.trim()) continue;

    totalFiles++;
    totalChars += content.length;

    if (totalFiles > config.maxTotalFiles || totalChars > config.maxTotalChars) {
      break;
    }

    const filePath = sanitizeForDatabase(entry.entryName);
    const fileChunks = chunkFile(filePath, content);
    allChunks.push(...fileChunks.map(c => ({ ...c, source_id: sourceId })));
  }

  if (allChunks.length > 0) {
    // Generate embeddings
    const textsToEmbed = allChunks.map(c => c.content);
    const embeddings = await embedTexts(textsToEmbed);
    
    // Attach embeddings to chunks
    const chunksWithEmbeddings = allChunks.map((c, i) => ({
      ...c,
      file_path: sanitizeForDatabase(c.file_path),
      content: sanitizeForDatabase(c.content),
      source_url: c.source_url ? sanitizeForDatabase(c.source_url) : null,
      embedding: embeddings[i],
    }));

    const { error } = await supabase.from('chunks').insert(chunksWithEmbeddings);
    if (error) throw error;
  }

  return {
    sourceId,
    fileCount: totalFiles,
    chunkCount: allChunks.length,
  };
}
