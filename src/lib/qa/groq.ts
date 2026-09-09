import Groq from "groq-sdk";
import { isConfiguredEnvValue } from "@/lib/config";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const RESOLVED_GROQ_API_KEY = GROQ_API_KEY || "placeholder";

const groq = new Groq({ apiKey: RESOLVED_GROQ_API_KEY });

export const PRIMARY_GROQ_MODEL = process.env.GROQ_MODEL_ID || "qwen/qwen3.8-27b";
export const FALLBACK_GROQ_MODELS = [
  PRIMARY_GROQ_MODEL,
  "qwen/qwen3.8-27b",
  "groq/compound-mini",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "groq/compound",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

export function cleanModelResponse(text: string): string {
  if (!text) return "";
  // Strip reasoning/thought wrappers (e.g. <think>...</think>) from reasoning models
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

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
              "You are an enterprise code intelligence assistant. Answer directly and technically using the provided evidence. Cite files and exact line numbers like [path/file.ext:L10-L20].",
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

      const raw = completion.choices[0]?.message?.content || "";
      const cleaned = cleanModelResponse(raw);
      if (cleaned) {
        return cleaned;
      }
    } catch (error: any) {
      lastError = error;
      console.warn(`Groq completion failed with model ${model}:`, error?.message || error);
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Dynamic discovery fallback: query available models from the account
  try {
    const modelList = await groq.models.list();
    const availableChatModels = modelList.data
      .map((m) => m.id)
      .filter(
        (id) =>
          !id.includes("whisper") &&
          !id.includes("guard") &&
          !id.includes("orpheus") &&
          !candidateModels.includes(id),
      );

    for (const model of availableChatModels) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "You are an enterprise code intelligence assistant. Answer directly and technically using the provided evidence. Cite files and exact line numbers like [path/file.ext:L10-L20].",
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

        const raw = completion.choices[0]?.message?.content || "";
        const cleaned = cleanModelResponse(raw);
        if (cleaned) {
          return cleaned;
        }
      } catch (err) {
        console.warn(`Dynamic Groq fallback model ${model} failed:`, err);
      }
    }
  } catch (discoveryErr) {
    console.warn("Failed to dynamically list Groq models:", discoveryErr);
  }

  throw lastError || new Error("Failed to generate answer with all available Groq models.");
}

