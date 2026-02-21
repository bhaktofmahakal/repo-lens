import { HfInference } from "@huggingface/inference";
import { config, isConfiguredEnvValue } from "@/lib/config";

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL_ID = process.env.HF_EMBEDDING_MODEL || "sentence-transformers/all-mpnet-base-v2";

const hf = new HfInference(HF_TOKEN);

function normalizeFeatureExtractionResult(result: unknown): number[][] {
  if (!Array.isArray(result)) {
    throw new Error(`Unexpected result from HF SDK: ${JSON.stringify(result)}`);
  }

  if (result.length === 0) return [];

  if (typeof result[0] === "number") {
    return [result as number[]];
  }

  return (result as unknown[]).map((item) => {
    if (!Array.isArray(item)) {
      throw new Error(`Unexpected embedding item shape: ${JSON.stringify(item)}`);
    }

    if (typeof item[0] === "number") {
      return item as number[];
    }

    if (Array.isArray(item[0])) {
      const tokenVectors = item as number[][];
      const dim = tokenVectors[0]?.length || 0;
      if (!dim) return [];

      const pooled = new Array(dim).fill(0);
      for (const token of tokenVectors) {
        for (let i = 0; i < dim; i++) {
          pooled[i] += token[i] ?? 0;
        }
      }

      return pooled.map((value) => value / tokenVectors.length);
    }

    throw new Error(`Unsupported embedding shape from HF SDK: ${JSON.stringify(item)}`);
  });
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!isConfiguredEnvValue(HF_TOKEN)) {
    throw new Error("Missing HF_TOKEN environment variable.");
  }

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

        const batchEmbeddings = normalizeFeatureExtractionResult(result);
        const wrongDim = batchEmbeddings.find((vector) => vector.length !== config.embeddingDimension);
        if (wrongDim) {
          throw new Error(
            `Embedding dimension mismatch. Expected ${config.embeddingDimension}, got ${wrongDim.length}.`,
          );
        }

        allEmbeddings.push(...batchEmbeddings);
        break;
      } catch (error: any) {
        if (error?.status === 503) {
          // HF can return 503 while the model is warming up.
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
