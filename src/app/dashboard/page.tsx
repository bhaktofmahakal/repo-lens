import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabase as adminSupabase } from "@/lib/db";
import { isGithubAppConfigured } from "@/lib/github-app";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plan-limits";
import { DashboardClient, type InstallationItem, type SourceItem } from "./DashboardClient";

type DashboardPageProps = {
  searchParams: Promise<{
    github?: string;
    github_app?: string;
  }>;
};

function githubOAuthStatusMessage(status: string | undefined): string | null {
  if (!status) return null;
  if (status === "connected") return "GitHub OAuth connected successfully.";
  if (status === "error") {
    return "GitHub OAuth did not connect. Check provider setup and token encryption config.";
  }
  return null;
}

function githubAppStatusMessage(status: string | undefined): string | null {
  if (!status) return null;
  if (status === "connected") return "GitHub App connected successfully. Your repositories are now loaded below.";
  if (status === "config_error" || status === "unavailable") {
    return "GitHub App setup is currently unavailable. Please try again later.";
  }
  if (status === "missing_installation") {
    return "GitHub did not return installation details. Please try again.";
  }
  if (status === "installation_not_found") {
    return "GitHub App installation could not be verified. Please try again.";
  }
  if (status === "save_failed") {
    return "GitHub App was installed, but linking it to your account failed. Please retry.";
  }
  if (status === "error") {
    return "GitHub App setup did not complete. Please try again.";
  }
  return null;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const githubAutoSyncEnabled = process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTOSYNC === "true";
  const githubAppConfigured = isGithubAppConfigured();
  const githubAppSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "";

  const oauthMsg = githubOAuthStatusMessage(params.github);
  const appMsg = githubAppStatusMessage(params.github_app);

  let notificationMessage: { type: "success" | "error"; text: string } | null = null;
  if (appMsg) {
    notificationMessage = {
      type: params.github_app === "connected" ? "success" : "error",
      text: appMsg,
    };
  } else if (oauthMsg) {
    notificationMessage = {
      type: params.github === "connected" ? "success" : "error",
      text: oauthMsg,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  let sources: SourceItem[] = [];
  let installations: InstallationItem[] = [];
  let totalChunks = 0;
  let totalQuestions = 0;
  let userPlan: PlanTier = "free";

  const userId = user.id;
  const userEmail = user.email?.toLowerCase() || "";
  const emailPrefix = userEmail.split("@")[0]?.toLowerCase() || "";

    // 1. Fetch user sources
    const { data: sourceRows } = await supabase
      .from("sources")
      .select("id, name, type, github_url, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    sources = (sourceRows as SourceItem[]) || [];

    // 2. Fetch user plan
    const { data: userProfile } = await adminSupabase
      .from("users")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();

    if (userProfile?.plan && userProfile.plan in PLAN_LIMITS) {
      userPlan = userProfile.plan as PlanTier;
    }

    // 3. Fetch knowledge chunks count
    const { count: chunkCount } = await adminSupabase
      .from("chunks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    totalChunks = chunkCount || 0;

    // 4. Fetch questions count
    const { count: questionCount } = await adminSupabase
      .from("qa_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    totalQuestions = questionCount || 0;

    // 5. Fetch GitHub App installations
    const { data: userInstallations } = await adminSupabase
      .from("github_app_installations")
      .select("installation_id, user_id, account_login, account_type, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    installations = (userInstallations as InstallationItem[]) || [];

    // Auto-link any unlinked installation if user has no linked installations yet
    if (installations.length === 0) {
      const { data: unlinked } = await adminSupabase
        .from("github_app_installations")
        .select("installation_id, user_id, account_login, account_type, updated_at")
        .is("user_id", null)
        .order("updated_at", { ascending: false })
        .limit(3);

      for (const inst of unlinked || []) {
        const loginLower = inst.account_login.toLowerCase();
        if (loginLower === emailPrefix || loginLower.includes(emailPrefix) || !emailPrefix) {
          await adminSupabase
            .from("github_app_installations")
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .eq("installation_id", inst.installation_id);

          installations.push({
            ...inst,
            user_id: userId,
          });
          break;
        }
      }
    }

  const planLimit = 999;

  return (
    <DashboardClient
      initialSources={sources}
      initialInstallations={installations}
      kpiStats={{
        totalSources: sources.length,
        totalChunks,
        totalQuestions,
        userPlan,
        planLimit,
        usedRepos: sources.length,
      }}
      githubAutoSyncEnabled={githubAutoSyncEnabled}
      githubAppConfigured={githubAppConfigured}
      githubAppSlug={githubAppSlug}
      notificationMessage={notificationMessage}
    />
  );
}
