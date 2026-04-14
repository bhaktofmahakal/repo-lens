import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestAuth } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { capturePosthogEvent } from "@/lib/posthog";

const feedbackSchema = z.object({
  session_id: z.string().uuid(),
  query_text: z.string().min(1),
  answer_text: z.string().min(1),
  rating: z.enum(["up", "down"]),
  latency_ms: z.number().int().nonnegative().optional(),
});

type FeedbackRequest = z.infer<typeof feedbackSchema>;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRequestAuth(req);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload.", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const payload: FeedbackRequest = parsed.data;
    const supabase = await createClient();

    const { error } = await supabase.from("answer_feedback").insert({
      user_id: auth.user.id,
      session_id: payload.session_id,
      query_text: payload.query_text,
      answer_text: payload.answer_text,
      rating: payload.rating,
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to save feedback.", code: "INSERT_FAILED" },
        { status: 500 },
      );
    }

    void capturePosthogEvent(auth.user.id, {
      event: "answer_rated",
      properties: {
        session_id: payload.session_id,
        rating: payload.rating,
        latency_ms: payload.latency_ms ?? 0,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to process feedback.", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
