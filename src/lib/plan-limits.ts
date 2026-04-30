export const PLAN_LIMITS = {
  free: { repos_per_month: 3, queries_per_month: 50, max_repo_size_mb: 45, private_repos: false },
  pro: { repos_per_month: 25, queries_per_month: 500, max_repo_size_mb: 200, private_repos: true },
  team: {
    repos_per_month: Number.POSITIVE_INFINITY,
    queries_per_month: Number.POSITIVE_INFINITY,
    max_repo_size_mb: 500,
    private_repos: true,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;
