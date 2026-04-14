import AdmZip from "adm-zip";
import { supabase } from "@/lib/db";
import { config } from "@/lib/config";
import {
  isBinaryFile,
  isIgnoredPath,
  isProbablyBinaryContent,
  isSupportedTextFile,
  sanitizeForDatabase,
} from "./filters";
import { chunkFile } from "./chunker";
import { embedTexts } from "@/lib/embeddings/hf";
import { IngestResult } from "@/types";

const CHUNK_INSERT_BATCH_SIZE = 250;

export async function ingestZip(buffer: Buffer, sourceId: string, userId: string): Promise<IngestResult> {
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();
  
  let totalFiles = 0;
  let totalChars = 0;
  const allChunks: any[] = [];

  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;
    if (isBinaryFile(entry.name) || !isSupportedTextFile(entry.entryName) || isIgnoredPath(entry.entryName)) continue;
    if (entry.entryName.includes('..')) continue; // Blocks zip-slip paths.

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
    const sourceUrl = `/source?sourceId=${sourceId}&path=${encodeURIComponent(filePath)}`;
    const fileChunks = chunkFile(filePath, content, sourceUrl);
    allChunks.push(...fileChunks.map(c => ({ ...c, source_id: sourceId, user_id: userId })));
  }

  if (allChunks.length > 0) {
    const textsToEmbed = allChunks.map((chunk) => chunk.content);
    let embeddings: number[][] | null = null;

    try {
      embeddings = await embedTexts(textsToEmbed);
      if (embeddings.length !== allChunks.length) {
        throw new Error(`Embedding result count mismatch: expected ${allChunks.length}, got ${embeddings.length}.`);
      }
    } catch (error) {
      console.error("Embedding generation failed during ZIP ingest. Continuing with lexical fallback:", error);
      embeddings = null;
    }

    const chunksWithEmbeddings = allChunks.map((c, i) => ({
      ...c,
      file_path: sanitizeForDatabase(c.file_path),
      content: sanitizeForDatabase(c.content),
      source_url: c.source_url ? sanitizeForDatabase(c.source_url) : null,
      embedding: embeddings ? embeddings[i] : null,
    }));

    for (let i = 0; i < chunksWithEmbeddings.length; i += CHUNK_INSERT_BATCH_SIZE) {
      const batch = chunksWithEmbeddings.slice(i, i + CHUNK_INSERT_BATCH_SIZE);
      const { error } = await supabase.from('chunks').insert(batch);
      if (error) {
        throw new Error(`Failed to persist ZIP chunks batch ${Math.floor(i / CHUNK_INSERT_BATCH_SIZE) + 1}: ${error.message}`);
      }
    }
  }

  return {
    sourceId,
    fileCount: totalFiles,
    chunkCount: allChunks.length,
  };
}
