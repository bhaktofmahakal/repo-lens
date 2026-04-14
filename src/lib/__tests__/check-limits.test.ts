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

  it("throws LIMIT_EXCEEDED when free repo quota is reached", async () => {
    const fromMock = vi.mocked(supabase.from);
    fromMock.mockImplementation((table: string) => {
      if (table === "users") {
        return buildUserPlanQuery("free") as never;
      }

      return buildSourceCountQuery(3) as never;
    });

    await expect(checkRepoLimit("user-1")).rejects.toBeInstanceOf(LimitExceededError);
  });

  it("allows repo size within the plan cap", () => {
    expect(() => checkRepoSize(10 * 1024 * 1024, "free")).not.toThrow();
  });

  it("throws when repository size exceeds plan cap", () => {
    expect(() => checkRepoSize(30 * 1024 * 1024, "free")).toThrow(LimitExceededError);
  });
});
