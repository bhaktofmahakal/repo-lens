import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireRequestAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/posthog", () => ({
  capturePosthogEvent: vi.fn(),
}));

import { requireRequestAuth } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/feedback/route";

describe("POST /api/feedback", () => {
  it("stores feedback on valid request", async () => {
    vi.mocked(requireRequestAuth).mockResolvedValue({
      user: { id: "00000000-0000-0000-0000-000000000001" },
    } as never);

    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    vi.mocked(createClient).mockResolvedValue({ from } as never);

    const req = new NextRequest("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: "00000000-0000-0000-0000-000000000002",
        query_text: "Where is auth?",
        answer_text: "Auth is in src/lib/auth.ts",
        rating: "up",
      }),
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
