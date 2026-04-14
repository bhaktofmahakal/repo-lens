"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Github } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OAuthProvider = "google" | "github";

function buildCallbackUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

function LoginContent() {
  const githubLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_GITHUB_LOGIN === "true";
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") || "/dashboard",
    [searchParams],
  );
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    setLoadingProvider(provider);
    setError(null);

    try {
      const supabase = createClient();
      const redirectTo = buildCallbackUrl(`/auth/callback?next=${encodeURIComponent(callbackUrl)}`);

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (signInError) {
        setError("Unable to start sign-in. Please try again.");
      }
    } catch {
      setError("Sign-in is not configured. Set Supabase environment variables and try again.");
      setLoadingProvider(null);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#151515] px-6 py-16 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111111] p-8">
        <h1 className="text-2xl font-semibold">Sign in to RepoLens</h1>
        <p className="mt-2 text-sm text-white/60">Choose an OAuth provider to continue.</p>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => handleOAuthSignIn("google")}
            disabled={loadingProvider !== null}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            {loadingProvider === "google" ? "Redirecting..." : "Sign in with Google"}
          </button>
          {githubLoginEnabled ? (
            <button
              type="button"
              onClick={() => handleOAuthSignIn("github")}
              disabled={loadingProvider !== null}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              <Github className="h-4 w-4" />
              {loadingProvider === "github" ? "Redirecting..." : "Sign in with GitHub"}
            </button>
          ) : (
            <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
              GitHub login is temporarily disabled.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#151515]" />}>
      <LoginContent />
    </Suspense>
  );
}
