import { Octokit } from "@octokit/rest";
import { supabase } from "@/lib/db";
import { config, isConfiguredEnvValue } from "@/lib/config";
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
const GITHUB_INGEST_TIME_BUDGET_MS = 45_000;

async function fetchTextWithTimeout(url: string, timeoutMs: number, githubToken?: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: githubToken
        ? {
            Authorization: `Bearer ${githubToken}`,
          }
        : undefined,
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.error("GitHub raw fetch failed:", url, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function createOctokitClient(githubToken?: string): Octokit {
  const token = githubToken || process.env.GITHUB_TOKEN;
  if (isConfiguredEnvValue(token)) {
    return new Octokit({ auth: token });
  }

  // Unauthenticated access supports public repositories and avoids failures from placeholder tokens.
  return new Octokit();
}

type IngestGitHubOptions = {
  githubToken?: string;
  allowPrivate?: boolean;
  maxRepoSizeMb?: number;
  userId?: string;
};

export async function ingestGitHub(
  repoUrl: string,
  sourceId: string,
  options?: IngestGitHubOptions,
): Promise<IngestResult> {
  const startedAt = Date.now();
  const octokit = createOctokitClient(options?.githubToken);
  const urlParts = repoUrl.replace('https://github.com/', '').split('/');
  if (urlParts.length < 2) throw new Error("Invalid GitHub URL");
  const [owner, repo] = urlParts;

  const { data: repoMeta } = await octokit.repos.get({ owner, repo });
  if (repoMeta.private && !options?.allowPrivate) {
    throw new Error("Private repositories are not supported.");
  }

  const repoSizeBytes = (repoMeta.size || 0) * 1024;
  if (options?.maxRepoSizeMb && repoSizeBytes > options.maxRepoSizeMb * 1024 * 1024) {
    throw new Error(`Repository exceeds the ${options.maxRepoSizeMb} MB limit.`);
  }

  const defaultBranch = repoMeta.default_branch || "main";

  let treeSha = defaultBranch;
  try {
    const { data: branch } = await octokit.repos.getBranch({ owner, repo, branch: defaultBranch });
    treeSha = branch.commit.sha;
  } catch (error) {
    console.error("Failed to resolve default branch SHA, falling back to branch name:", error);
  }

  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: '1',
  });

  let totalFiles = 0;
  let totalChars = 0;
  const allChunks: any[] = [];
  const blobEntries = tree.tree.filter((entry) => {
    if (entry.type !== "blob" || !entry.path) return false;
    return !isBinaryFile(entry.path) && isSupportedTextFile(entry.path) && !isIgnoredPath(entry.path);
  });

  let limitReached = false;
  for (let i = 0; i < blobEntries.length && !limitReached; i += config.githubFetchConcurrency) {
    if (Date.now() - startedAt > GITHUB_INGEST_TIME_BUDGET_MS) {
      console.warn("GitHub ingest time budget reached. Returning partial ingest result.");
      limitReached = true;
      break;
    }

    const batch = blobEntries.slice(i, i + config.githubFetchConcurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (entry) => {
        if (Date.now() - startedAt > GITHUB_INGEST_TIME_BUDGET_MS) {
          return null;
        }

        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${entry.path}`;
        const rawContent = await fetchTextWithTimeout(rawUrl, 15000, options?.githubToken);
        if (!rawContent) return null;
        if (isProbablyBinaryContent(rawContent)) return null;

        const content = sanitizeForDatabase(rawContent);
        if (!content.trim()) return null;

        const sourcePath = sanitizeForDatabase(entry.path!);
        const sourceUrl = sanitizeForDatabase(`https://github.com/${owner}/${repo}/blob/${defaultBranch}/${entry.path}`);
        const fileChunks = chunkFile(sourcePath, content, sourceUrl).map((chunk) => ({
          ...chunk,
          source_id: sourceId,
          user_id: options?.userId,
        }));
        if (fileChunks.length === 0) return null;

        return {
          fileCount: 1,
          charCount: content.length,
          chunks: fileChunks,
        };
      }),
    );

    for (const settled of batchResults) {
      if (settled.status !== "fulfilled") {
        console.error("GitHub file batch worker failed:", settled.reason);
        continue;
      }

      const result = settled.value;
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

    for (let i = 0; i < chunksWithEmbeddings.length; i += CHUNK_INSERT_BATCH_SIZE) {
      const batch = chunksWithEmbeddings.slice(i, i + CHUNK_INSERT_BATCH_SIZE);
      const { error } = await supabase.from('chunks').insert(batch);
      if (error) {
        throw new Error(`Failed to persist GitHub chunks batch ${Math.floor(i / CHUNK_INSERT_BATCH_SIZE) + 1}: ${error.message}`);
      }
    }
  }

  return {
    sourceId,
    fileCount: totalFiles,
    chunkCount: allChunks.length,
    repoSizeBytes,
  };
}
