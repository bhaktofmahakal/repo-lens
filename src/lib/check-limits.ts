import { supabase } from "@/lib/db";
import { PLAN_LIMITS, PlanTier } from "@/lib/plan-limits";

function getMonthBounds() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

function toPlanTier(value: string | null | undefined): PlanTier {
  if (value === "pro" || value === "team") return value;
  return "free";
}

function nextPlan(plan: PlanTier): "pro" | "team" {
  return plan === "free" ? "pro" : "team";
}

export class LimitExceededError extends Error {
  readonly code = "LIMIT_EXCEEDED";
  readonly planRequired: "pro" | "team";

  constructor(message: string, planRequired: "pro" | "team") {
    super(message);
    this.name = "LimitExceededError";
    this.planRequired = planRequired;
  }
}

export async function getUserPlan(userId: string): Promise<PlanTier> {
  const { data, error } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load user plan.");
  }

  return toPlanTier(data?.plan);
}

export async function checkRepoLimit(_userId: string): Promise<{ plan: PlanTier; count: number }> {
  // RepoLens is 100% free with open developer access
  return { plan: "team", count: 0 };
}

export async function checkQueryLimit(_userId: string): Promise<{ plan: PlanTier; count: number }> {
  // RepoLens is 100% free with open developer access
  return { plan: "team", count: 0 };
}

export function checkRepoSize(sizeBytes: number, plan: PlanTier): void {
  const maxBytes = PLAN_LIMITS[plan].max_repo_size_mb * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    throw new LimitExceededError(
      `Repository exceeds the ${PLAN_LIMITS[plan].max_repo_size_mb} MB limit for the ${plan} plan.`,
      nextPlan(plan),
    );
  }
}

export function checkPrivateRepoAllowed(plan: PlanTier): void {
  if (!PLAN_LIMITS[plan].private_repos) {
    throw new LimitExceededError("Private repositories require a paid plan.", "pro");
  }
}
