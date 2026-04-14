import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireRequestAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  isSupabaseConfigured: vi.fn(),
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/posthog", () => ({
  capturePosthogEvent: vi.fn(),
}));

import { requireRequestAuth } from "@/lib/auth-guard";
import { isSupabaseConfigured, supabase } from "@/lib/db";
import { capturePosthogEvent } from "@/lib/posthog";
import { POST } from "@/app/api/share/route";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const SOURCE_ID = "00000000-0000-0000-0000-000000000002";
const SHARE_UUID = "00000000-0000-0000-0000-000000000003";

describe("POST /api/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(requireRequestAuth).mockResolvedValue({ user: { id: USER_ID } } as never);
  });

  it("creates a share link for an owned source", async () => {
    const sourcesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: SOURCE_ID },
        error: null,
      }),
    };

    const sharedQuery = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          share_uuid: SHARE_UUID,
          is_public: true,
          expires_at: null,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        error: null,
      }),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "sources") return sourcesQuery as never;
      if (table === "shared_sessions") return sharedQuery as never;
      throw new Error(`Unexpected table: ${table}`);
    });

    const req = new NextRequest("http://localhost:3000/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId: SOURCE_ID, is_public: true }),
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.share_uuid).toBe(SHARE_UUID);
    expect(typeof payload.share_url).toBe("string");
    expect(payload.share_url).toContain(`/s/${SHARE_UUID}`);
    expect(vi.mocked(capturePosthogEvent)).toHaveBeenCalledTimes(1);
  });
});