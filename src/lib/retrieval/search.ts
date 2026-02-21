/* utsav */
import { config } from "@/lib/config";
import { supabase } from "@/lib/db";
import { Chunk } from "@/types";

function normalizeTextQuery(query: string): string {
  return query.replace(/[^\w\s./:-]/g, " ").trim();
}

function escapeLikeTerm(term: string): string {
  return term.replace(/[%,]/g, " ").replace(/'/g, "''").trim();
}

export function buildFallbackOrFilter(query: string): string {
  const normalized = normalizeTextQuery(query).toLowerCase();
  const keywords = normalized.split(/\s+/).filter((token) => token.length > 2).map(escapeLikeTerm);
  const uniqueTerms = [...new Set(keywords)];

  const terms = uniqueTerms.length > 0 ? uniqueTerms : [escapeLikeTerm(normalized)].filter(Boolean);
  return terms.flatMap((term) => [`content.ilike.%${term}%`, `file_path.ilike.%${term}%`]).join(",");
}

// Keyword-based retrieval using PostgreSQL full-text search
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

// Fallback: simple ILIKE search if FTS fails
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

// Vector-based search using pgvector
export async function vectorSearch(sourceId: string, queryEmbedding: number[], topK = 10): Promise<Chunk[]> {
  if (queryEmbedding.length !== config.embeddingDimension) {
    console.error(
      `Vector search skipped due to embedding dimension mismatch. Expected ${config.embeddingDimension}, got ${queryEmbedding.length}.`,
    );
    return [];
  }

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: 0.1, // Adjust as needed
    match_count: topK,
    p_source_id: sourceId,
  });

  if (error) throw error;
  return data || [];
}

export async function hybridSearch(sourceId: string, query: string, queryEmbedding?: number[], topK = 10): Promise<Chunk[]> {
  // If embedding is provided, try vector search first
  if (queryEmbedding) {
    try {
      const vectorResults = await vectorSearch(sourceId, queryEmbedding, topK);
      if (vectorResults.length > 0) return vectorResults;
    } catch (error) {
      console.error("Vector search error:", error);
    }
  }

  // Fallback to keyword search
  try {
    const results = await keywordSearch(sourceId, query, topK);
    if (results.length > 0) return results;
    
    // Fallback to ILIKE if FTS returns nothing
    return await fallbackSearch(sourceId, query, topK);
  } catch (error) {
    console.error("Search error, using fallback:", error);
    return await fallbackSearch(sourceId, query, topK);
  }
}
