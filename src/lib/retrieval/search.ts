/* utsav */
import { supabase } from "@/lib/db";
import { Chunk } from "@/types";

// Keyword-based retrieval using PostgreSQL full-text search
export async function keywordSearch(sourceId: string, query: string, topK = 10): Promise<Chunk[]> {
  const { data, error} = await supabase
    .from("chunks")
    .select("*")
    .eq("source_id", sourceId)
    .textSearch("content", query, {
      type: "websearch",
      config: "english",
    })
    .limit(topK);

  if (error) throw error;
  return data || [];
}

// Fallback: simple ILIKE search if FTS fails
export async function fallbackSearch(sourceId: string, query: string, topK = 10): Promise<Chunk[]> {
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
  
  let queryBuilder = supabase
    .from("chunks")
    .select("*")
    .eq("source_id", sourceId);
  
  // Search for any keyword
  keywords.forEach(keyword => {
    queryBuilder = queryBuilder.or(`content.ilike.%${keyword}%,file_path.ilike.%${keyword}%`);
  });
  
  const { data, error } = await queryBuilder.limit(topK);
  if (error) throw error;
  return data || [];
}

// Vector-based search using pgvector
export async function vectorSearch(sourceId: string, queryEmbedding: number[], topK = 10): Promise<Chunk[]> {
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
