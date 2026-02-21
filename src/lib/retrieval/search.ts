import { config } from "@/lib/config";
import { supabase } from "@/lib/db";
import { Chunk } from "@/types";

const CODE_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".cs",
  ".cpp",
  ".c",
  ".h",
  ".hpp",
  ".sql",
  ".swift",
  ".kt",
  ".kts",
]);

const DOC_EXTENSIONS = new Set([".md", ".txt", ".rst", ".adoc"]);
const QUERY_STOPWORDS = new Set([
  "the",
  "is",
  "are",
  "was",
  "were",
  "how",
  "what",
  "where",
  "when",
  "why",
  "which",
  "who",
  "whom",
  "whose",
  "a",
  "an",
  "of",
  "to",
  "for",
  "from",
  "in",
  "on",
  "by",
  "with",
  "and",
  "or",
  "as",
  "it",
  "this",
  "that",
  "coming",
]);

function normalizeTextQuery(query: string): string {
  return query.replace(/[^\w\s./:-]/g, " ").trim();
}

function escapeLikeTerm(term: string): string {
  return term.replace(/[%,]/g, " ").replace(/'/g, "''").trim();
}

function getPathExtension(filePath: string): string {
  const filename = filePath.toLowerCase().split("/").pop() || filePath.toLowerCase();
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex === -1 ? "" : filename.slice(dotIndex);
}

function isDocumentationPath(filePath: string): boolean {
  const normalized = filePath.toLowerCase();
  const extension = getPathExtension(normalized);
  if (DOC_EXTENSIONS.has(extension)) return true;

  return normalized.includes("readme") || normalized.includes("changelog") || normalized.includes("docs/");
}

export function rankRetrievedChunks(chunks: Chunk[], query: string, topK: number): Chunk[] {
  const normalizedQuery = normalizeTextQuery(query).toLowerCase();
  const queryTerms = normalizedQuery
    .split(/\s+/)
    .filter((term) => term.length > 2 && !QUERY_STOPWORDS.has(term));
  const asksImplementation = /\b(where|handled|implemented|function|class|api|auth|retry|logic|flow)\b/i.test(query);
  const asksDataFlow = /\b(data|fetch|source|coming|load|api|flow|pipeline|from where|where from)\b/i.test(query);
  const flowHintTerms = asksDataFlow
    ? ["api", "route", "fetch", "prisma", "supabase", "store", "query", "database"]
    : [];

  const ranked = chunks
    .map((chunk) => {
      const path = chunk.file_path.toLowerCase();
      const extension = getPathExtension(path);
      const content = chunk.content.toLowerCase();
      const isDoc = isDocumentationPath(path);
      const isCode = CODE_EXTENSIONS.has(extension);

      let score = typeof chunk.similarity === "number" ? chunk.similarity * 2 : 0;
      if (isCode) score += 1.6;
      if (isDoc) score -= 1.4;
      if (path.includes("/src/") || path.includes("/app/") || path.includes("/lib/")) score += 0.9;
      if (asksImplementation && isCode) score += 0.8;
      if (asksImplementation && isDoc) score -= 0.8;
      if (asksDataFlow && path.includes("/api/")) score += 1.3;
      if (asksDataFlow && path.endsWith("/route.ts")) score += 1.2;
      if (asksDataFlow && (content.includes("fetch(") || content.includes("prisma.") || content.includes("supabase"))) {
        score += 0.8;
      }
      if (asksDataFlow && (path.endsWith("page.tsx") || path.endsWith("page.ts"))) score -= 0.6;

      for (const term of queryTerms) {
        if (path.includes(term)) score += 0.45;
        if (content.includes(term)) score += 0.15;
      }
      for (const term of flowHintTerms) {
        if (path.includes(term)) score += 0.22;
        if (content.includes(term)) score += 0.08;
      }

      return { chunk, score };
    })
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const deduped: Chunk[] = [];
  for (const item of ranked) {
    const key = `${item.chunk.file_path}:${item.chunk.start_line}:${item.chunk.end_line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item.chunk);
    if (deduped.length >= topK) break;
  }

  return deduped;
}

export function buildFallbackOrFilter(query: string): string {
  const normalized = normalizeTextQuery(query).toLowerCase();
  const keywords = normalized
    .split(/\s+/)
    .filter((token) => token.length > 2 && !QUERY_STOPWORDS.has(token))
    .map(escapeLikeTerm);
  const uniqueTerms = [...new Set(keywords)];

  const terms = uniqueTerms.length > 0 ? uniqueTerms : [escapeLikeTerm(normalized)].filter(Boolean);
  return terms.flatMap((term) => [`content.ilike.%${term}%`, `file_path.ilike.%${term}%`]).join(",");
}

export async function keywordSearch(sourceId: string, query: string, topK = 10): Promise<Chunk[]> {
  const normalizedQuery = normalizeTextQuery(query);
  if (!normalizedQuery) return [];

  const { data, error} = await supabase
    .from("chunks")
    .select("*")
    .eq("source_id", sourceId)
    .textSearch("content", normalizedQuery, {
      type: "websearch",
      config: "english",
    })
    .limit(topK);

  if (error) throw error;
  return data || [];
}

export async function fallbackSearch(sourceId: string, query: string, topK = 10): Promise<Chunk[]> {
  const queryBuilder = supabase
    .from("chunks")
    .select("*")
    .eq("source_id", sourceId);

  const filter = buildFallbackOrFilter(query);
  const finalQuery = filter ? queryBuilder.or(filter) : queryBuilder;

  const { data, error } = await finalQuery.limit(topK);
  if (error) throw error;
  return data || [];
}

// Keeps answers citable when text/vector matching misses.
export async function sourceFallbackSearch(sourceId: string, topK = 10): Promise<Chunk[]> {
  const { data, error } = await supabase
    .from("chunks")
    .select("*")
    .eq("source_id", sourceId)
    .order("created_at", { ascending: false })
    .limit(topK);

  if (error) throw error;
  return data || [];
}

export async function vectorSearch(sourceId: string, queryEmbedding: number[], topK = 10): Promise<Chunk[]> {
  if (queryEmbedding.length !== config.embeddingDimension) {
    console.error(
      `Vector search skipped due to embedding dimension mismatch. Expected ${config.embeddingDimension}, got ${queryEmbedding.length}.`,
    );
    return [];
  }

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: 0.1,
    match_count: topK,
    p_source_id: sourceId,
  });

  if (error) throw error;
  return data || [];
}

export async function hybridSearch(sourceId: string, query: string, queryEmbedding?: number[], topK = 10): Promise<Chunk[]> {
  if (queryEmbedding) {
    try {
      const vectorResults = await vectorSearch(sourceId, queryEmbedding, topK);
      if (vectorResults.length > 0) return rankRetrievedChunks(vectorResults, query, topK);
    } catch (error) {
      console.error("Vector search error:", error);
    }
  }

  try {
    const results = await keywordSearch(sourceId, query, topK);
    if (results.length > 0) return rankRetrievedChunks(results, query, topK);
    
    const fallbackResults = await fallbackSearch(sourceId, query, topK);
    if (fallbackResults.length > 0) return rankRetrievedChunks(fallbackResults, query, topK);

    const sourceFallbackResults = await sourceFallbackSearch(sourceId, topK);
    return rankRetrievedChunks(sourceFallbackResults, query, topK);
  } catch (error) {
    console.error("Search error, using fallback:", error);
    const fallbackResults = await fallbackSearch(sourceId, query, topK);
    if (fallbackResults.length > 0) return rankRetrievedChunks(fallbackResults, query, topK);
    const sourceFallbackResults = await sourceFallbackSearch(sourceId, topK);
    return rankRetrievedChunks(sourceFallbackResults, query, topK);
  }
}
