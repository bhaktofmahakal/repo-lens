import { HfInference } from "@huggingface/inference";

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL_ID = "sentence-transformers/all-mpnet-base-v2";

const hf = new HfInference(HF_TOKEN);

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!HF_TOKEN || HF_TOKEN === 'placeholder') {
    throw new Error("Missing HF_TOKEN environment variable.");
  }

  // Batch texts (max 32 per request)
  const BATCH_SIZE = 32;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const result = await hf.featureExtraction({
          model: MODEL_ID,
          inputs: batch,
        });
        
        // HF SDK returns number[][] or number[][][] (for sequence tokens) or number[]
        if (!Array.isArray(result)) {
            throw new Error(`Unexpected result from HF SDK: ${JSON.stringify(result)}`);
        }

        // Handle different possible shapes from SDK
        const batchEmbeddings: number[][] = result.map((item: any) => {
            if (Array.isArray(item)) {
                // If it's number[][] (sequence), mean-pool or take first token? 
                // Feature extraction usually returns [batch, seq, dim] if not pooled
                // But for sentence-transformers it usually returns [batch, dim]
                if (Array.isArray(item[0])) {
                   // Sequence output [seq, dim] -> take first token (CLS) or average
                   return item[0]; 
                }
                return item;
            }
            return [item]; // Single number? Should not happen for embeddings
        });

        allEmbeddings.push(...batchEmbeddings);
        break; // Success
      } catch (error: any) {
        if (error?.status === 503) {
          // Model loading, wait and retry
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 10000));
          continue;
        }
        retryCount++;
        if (retryCount >= maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  return allEmbeddings;
}

export async function embedSingle(text: string): Promise<number[]> {
  const result = await embedTexts([text]);
  return result[0];
}
