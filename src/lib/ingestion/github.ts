/* utsav */
import { Octokit } from "@octokit/rest";
import { supabase } from "@/lib/db";
import { config } from "@/lib/config";
import { isBinaryFile, isIgnoredPath, isProbablyBinaryContent, sanitizeForDatabase } from "./filters";
import { chunkFile } from "./chunker";
import { embedTexts } from "@/lib/embeddings/hf";
import { IngestResult } from "@/types";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Optional token
});

export async function ingestGitHub(repoUrl: string, sourceId: string): Promise<IngestResult> {
  const urlParts = repoUrl.replace('https://github.com/', '').split('/');
  if (urlParts.length < 2) throw new Error("Invalid GitHub URL");
  const [owner, repo] = urlParts;

  const { data: repoMeta } = await octokit.repos.get({ owner, repo });
  if (repoMeta.private) {
    throw new Error("Private repositories are not supported.");
  }

  // Use octokit to list all files recursively
  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: repoMeta.default_branch || "HEAD",
    recursive: '1',
  });

  let totalFiles = 0;
  let totalChars = 0;
  const allChunks: any[] = [];
  const blobEntries = tree.tree.filter((entry) => {
    if (entry.type !== "blob" || !entry.path) return false;
    return !isBinaryFile(entry.path) && !isIgnoredPath(entry.path);
  });

  let limitReached = false;
  for (let i = 0; i < blobEntries.length && !limitReached; i += config.githubFetchConcurrency) {
    const batch = blobEntries.slice(i, i + config.githubFetchConcurrency);
    const batchResults = await Promise.all(
      batch.map(async (entry) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${entry.path}`;
        const response = await fetch(rawUrl);
        if (!response.ok) return null;

        const rawContent = await response.text();
        if (isProbablyBinaryContent(rawContent)) return null;

        const content = sanitizeForDatabase(rawContent);
        if (!content.trim()) return null;

        const sourcePath = sanitizeForDatabase(entry.path!);
        const sourceUrl = sanitizeForDatabase(`https://github.com/${owner}/${repo}/blob/HEAD/${entry.path}`);
        const fileChunks = chunkFile(sourcePath, content, sourceUrl).map((chunk) => ({ ...chunk, source_id: sourceId }));
        if (fileChunks.length === 0) return null;

        return {
          fileCount: 1,
          charCount: content.length,
          chunks: fileChunks,
        };
      }),
    );

    for (const result of batchResults) {
      if (!result) continue;

      if (totalFiles + result.fileCount > config.maxTotalFiles || totalChars + result.charCount > config.maxTotalChars) {
        limitReached = true;
        break;
      }

      totalFiles += result.fileCount;
      totalChars += result.charCount;
      allChunks.push(...result.chunks);
    }
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
      console.error("Embedding generation failed during GitHub ingest. Continuing with lexical fallback:", error);
      embeddings = null;
    }

    const chunksWithEmbeddings = allChunks.map((c, i) => ({
      ...c,
      file_path: sanitizeForDatabase(c.file_path),
      content: sanitizeForDatabase(c.content),
      source_url: c.source_url ? sanitizeForDatabase(c.source_url) : null,
      embedding: embeddings ? embeddings[i] : null,
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
