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

  // Use octokit to list all files recursively
  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: 'HEAD',
    recursive: '1',
  });

  let totalFiles = 0;
  let totalChars = 0;
  const allChunks: any[] = [];

  for (const entry of tree.tree) {
    if (entry.type !== 'blob') continue;
    if (isBinaryFile(entry.path!) || isIgnoredPath(entry.path!)) continue;

    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${entry.path}`;
    const response = await fetch(rawUrl);
    if (!response.ok) continue;

    const rawContent = await response.text();
    if (isProbablyBinaryContent(rawContent)) continue;

    const content = sanitizeForDatabase(rawContent);
    if (!content.trim()) continue;

    totalFiles++;
    totalChars += content.length;

    if (totalFiles > config.maxTotalFiles || totalChars > config.maxTotalChars) {
      break;
    }

    const sourcePath = sanitizeForDatabase(entry.path!);
    const sourceUrl = sanitizeForDatabase(`https://github.com/${owner}/${repo}/blob/HEAD/${entry.path}`);
    const fileChunks = chunkFile(sourcePath, content, sourceUrl);
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
