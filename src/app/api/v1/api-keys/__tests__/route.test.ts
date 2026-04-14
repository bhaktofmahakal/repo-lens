import { beforeEach, describe, expect, it, vi } from "vitest";
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

import { requireRequestAuth } from "@/lib/auth-guard";
import { isSupabaseConfigured, supabase } from "@/lib/db";
import { GET, POST } from "@/app/api/v1/api-keys/route";

const USER_ID = "00000000-0000-0000-0000-000000000001";

describe("/api/v1/api-keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(requireRequestAuth).mockResolvedValue({ user: { id: USER_ID } } as never);
  });

  it("lists API keys for the authenticated user", async () => {
    const listQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "00000000-0000-0000-0000-000000000010",
            name: "default",
            key_prefix: "rpl_abc123",
            created_at: "2026-01-01T00:00:00.000Z",
            last_used_at: null,
            revoked_at: null,
          },
        ],
        error: null,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(listQuery as never);

    const req = new NextRequest("http://localhost:3000/api/v1/api-keys");
    const res = await GET(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(payload.keys)).toBe(true);
    expect(payload.keys[0].name).toBe("default");
  });

  it("creates an API key and returns raw key once", async () => {
    const createQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "00000000-0000-0000-0000-000000000011",
          name: "CLI",
          key_prefix: "rpl_deadbeef",
          created_at: "2026-01-01T00:00:00.000Z",
        },
        error: null,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(createQuery as never);

    const req = new NextRequest("http://localhost:3000/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "CLI" }),
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(201);
    expect(payload.key.name).toBe("CLI");
    expect(typeof payload.key.api_key).toBe("string");
    expect(payload.key.api_key.startsWith("rpl_")).toBe(true);
  });
});