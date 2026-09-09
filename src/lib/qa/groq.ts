import Groq from "groq-sdk";
import { isConfiguredEnvValue } from "@/lib/config";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const RESOLVED_GROQ_API_KEY = GROQ_API_KEY || "placeholder";

const groq = new Groq({ apiKey: RESOLVED_GROQ_API_KEY });

export const PRIMARY_GROQ_MODEL = process.env.GROQ_MODEL_ID || "llama-3.3-70b-versatile";
export const FALLBACK_GROQ_MODELS = [
  PRIMARY_GROQ_MODEL,
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
];

export function isGroqConfigured(): boolean {
  return isConfiguredEnvValue(GROQ_API_KEY);
}

export function getCurrentGroqModel(): string {
  return PRIMARY_GROQ_MODEL;
}

export async function checkGroqHealth(): Promise<boolean> {
  if (!isGroqConfigured()) return false;

  try {
    await groq.models.list();
    return true;
  } catch (error) {
    console.error("Groq health check failed:", error);
    return false;
  }
}

export async function generateAnswer(prompt: string): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error("Missing GROQ_API_KEY environment variable.");
  }

  const candidateModels = Array.from(new Set(FALLBACK_GROQ_MODELS));
  let lastError: unknown = null;

  for (const model of candidateModels) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000); // 25 second timeout

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are an enterprise code intelligence assistant. Answer ONLY using the provided evidence. Be concise, direct, accurate, and provide code references with exact line citations where relevant.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model,
        temperature: 0.1,
        max_tokens: 2048,
      });

      return completion.choices[0]?.message?.content || "No answer generated.";
    } catch (error: any) {
      lastError = error;
      console.warn(`Groq completion failed with model ${model}:`, error?.message || error);
      // If error is due to model deprecation/not found, try next model in fallback chain
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error("Failed to generate answer with all available Groq models.");
}

