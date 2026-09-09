import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

import { supabase } from "@/lib/db";
import { checkRepoLimit, checkRepoSize, LimitExceededError } from "@/lib/check-limits";

function buildUserPlanQuery(plan: "free" | "pro" | "team") {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { plan }, error: null }),
  };
}

function buildSourceCountQuery(count: number) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockResolvedValue({ count, error: null }),
  };
}

describe("check-limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides unrestricted access for all users in free tool mode", async () => {
    const result = await checkRepoLimit("user-1");
    expect(result.plan).toBe("team");
    expect(result.count).toBe(0);
  });

  it("allows repo size within the plan cap", () => {
    expect(() => checkRepoSize(10 * 1024 * 1024, "free")).not.toThrow();
  });

  it("throws when repository size exceeds plan cap", () => {
    expect(() => checkRepoSize(50 * 1024 * 1024, "free")).toThrow(LimitExceededError);
  });
});
