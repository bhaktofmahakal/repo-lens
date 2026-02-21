/* utsav */
import Groq from "groq-sdk";

const GROQ_API_KEY = process.env.GROQ_API_KEY || 'placeholder';

const groq = new Groq({ apiKey: GROQ_API_KEY });

export async function generateAnswer(prompt: string): Promise<string> {
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
