import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { supabase } from "@/lib/db";
import { config } from "@/lib/config";
import {
  isBinaryFile,
  isIgnoredPath,
  isProbablyBinaryContent,
  isSupportedTextFile,
  sanitizeForDatabase,
} from "@/lib/ingestion/filters";
import { chunkFile } from "@/lib/ingestion/chunker";
import { embedTexts } from "@/lib/embeddings/hf";
import { IngestResult } from "@/types";

const execFileAsync = promisify(execFile);
const CHUNK_INSERT_BATCH_SIZE = 250;

async function collectRepoFiles(baseDir: string, dir: string, files: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".git") continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectRepoFiles(baseDir, fullPath, files);
      continue;
    }

    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
    files.push(relativePath);
  }
}

type IngestPrivateGithubParams = {
  sourceId: string;
  userId: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  githubToken: string;
};

export async function ingestPrivateGithubRepo(
  params: IngestPrivateGithubParams,
): Promise<IngestResult> {
  const cloneParent = await mkdtemp(path.join(tmpdir(), "repolens-private-"));
  const cloneDir = path.join(cloneParent, "repo");
  const cloneUrl = `https://x-access-token:${encodeURIComponent(params.githubToken)}@github.com/${params.owner}/${params.repo}.git`;

  try {
    await execFileAsync("git", ["clone", "--depth", "1", cloneUrl, cloneDir], {
      windowsHide: true,
    });

    const files: string[] = [];
    await collectRepoFiles(cloneDir, cloneDir, files);

    let totalFiles = 0;
    let totalChars = 0;
    const allChunks: Array<{
      source_id: string;
      file_path: string;
      start_line: number;
      end_line: number;
      content: string;
      source_url: string;
    }> = [];

    for (const relativePath of files) {
      if (
        isBinaryFile(relativePath) ||
        !isSupportedTextFile(relativePath) ||
        isIgnoredPath(relativePath)
      ) {
        continue;
      }

      const fullPath = path.join(cloneDir, relativePath);
      const rawContent = await readFile(fullPath, "utf8").catch(() => "");
      if (!rawContent) continue;
      if (isProbablyBinaryContent(rawContent)) continue;

      const content = sanitizeForDatabase(rawContent);
      if (!content.trim()) continue;

      totalFiles += 1;
      totalChars += content.length;

      if (totalFiles > config.maxTotalFiles || totalChars > config.maxTotalChars) {
        break;
      }

      const safePath = sanitizeForDatabase(relativePath);
      const sourceUrl = sanitizeForDatabase(
        `https://github.com/${params.owner}/${params.repo}/blob/${params.defaultBranch}/${relativePath}`,
      );

      const fileChunks = chunkFile(safePath, content, sourceUrl).flatMap((chunk) => {
        if (
          !chunk.file_path ||
          typeof chunk.start_line !== "number" ||
          typeof chunk.end_line !== "number" ||
          !chunk.content
        ) {
          return [];
        }

        return [
          {
            source_id: params.sourceId,
            file_path: chunk.file_path,
            start_line: chunk.start_line,
            end_line: chunk.end_line,
            content: chunk.content,
            source_url: chunk.source_url ?? sourceUrl,
            user_id: params.userId,
          },
        ];
      });

      allChunks.push(...fileChunks);
    }

    if (allChunks.length > 0) {
      const textsToEmbed = allChunks.map((chunk) => chunk.content);
      let embeddings: number[][] | null = null;

      try {
        embeddings = await embedTexts(textsToEmbed);
        if (embeddings.length !== allChunks.length) {
          throw new Error("Embedding result count mismatch.");
        }
      } catch {
        embeddings = null;
      }

      const chunksWithEmbeddings = allChunks.map((chunk, index) => ({
        ...chunk,
        file_path: sanitizeForDatabase(chunk.file_path),
        content: sanitizeForDatabase(chunk.content),
        source_url: chunk.source_url ? sanitizeForDatabase(chunk.source_url) : null,
        embedding: embeddings ? embeddings[index] : null,
      }));

      for (let i = 0; i < chunksWithEmbeddings.length; i += CHUNK_INSERT_BATCH_SIZE) {
        const batch = chunksWithEmbeddings.slice(i, i + CHUNK_INSERT_BATCH_SIZE);
        const { error } = await supabase.from("chunks").insert(batch);
        if (error) {
          throw new Error("Failed to persist private GitHub chunks.");
        }
      }
    }

    return {
      sourceId: params.sourceId,
      fileCount: totalFiles,
      chunkCount: allChunks.length,
      repoSizeBytes: totalChars,
    };
  } finally {
    await rm(cloneParent, { recursive: true, force: true });
  }
}
