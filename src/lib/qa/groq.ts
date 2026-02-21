/* utsav */
import Groq from "groq-sdk";
import { isConfiguredEnvValue } from "@/lib/config";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const RESOLVED_GROQ_API_KEY = GROQ_API_KEY || "placeholder";

const groq = new Groq({ apiKey: RESOLVED_GROQ_API_KEY });

export function isGroqConfigured(): boolean {
  return isConfiguredEnvValue(GROQ_API_KEY);
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

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a code Q&A assistant. Answer ONLY using the provided evidence.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama-3.1-8b-instant",
    temperature: 0.1,
    max_tokens: 1024,
  });

  return completion.choices[0]?.message?.content || "No answer generated.";
}
