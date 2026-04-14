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

export async function checkRepoLimit(userId: string): Promise<{ plan: PlanTier; count: number }> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan];

  if (!Number.isFinite(limits.repos_per_month)) {
    return { plan, count: 0 };
  }

  const { start, end } = getMonthBounds();
  const { count, error } = await supabase
    .from("sources")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start)
    .lt("created_at", end);

  if (error) {
    throw new Error("Failed to check repository limits.");
  }

  const currentCount = count || 0;
  if (currentCount >= limits.repos_per_month) {
    throw new LimitExceededError(
      `You reached the ${limits.repos_per_month} repositories/month limit for the ${plan} plan.`,
      nextPlan(plan),
    );
  }

  return { plan, count: currentCount };
}

export async function checkQueryLimit(userId: string): Promise<{ plan: PlanTier; count: number }> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan];

  if (!Number.isFinite(limits.queries_per_month)) {
    return { plan, count: 0 };
  }

  const { start, end } = getMonthBounds();
  const { count, error } = await supabase
    .from("qa_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start)
    .lt("created_at", end);

  if (error) {
    throw new Error("Failed to check query limits.");
  }

  const currentCount = count || 0;
  if (currentCount >= limits.queries_per_month) {
    throw new LimitExceededError(
      `You reached the ${limits.queries_per_month} queries/month limit for the ${plan} plan.`,
      nextPlan(plan),
    );
  }

  return { plan, count: currentCount };
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
