"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Github, Layers, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
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
        setLoadingProvider(null);
      }
    } catch {
      setError("Sign-in is not configured. Set Supabase environment variables and try again.");
      setLoadingProvider(null);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e0e11] px-4 py-16 text-white">
      <section className="w-full max-w-md rounded-xl border border-white/10 bg-[#17171c] p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white">
            <Layers className="h-4 w-4 text-[#ff7759]" />
          </div>
          <div>
            <span className="font-mono text-base font-bold tracking-tight text-white">RepoLens</span>
            <div className="cohere-mono-label text-[9px] -mt-0.5">ENTERPRISE ACCESS</div>
          </div>
        </div>

        <h1 className="mt-6 text-xl font-bold tracking-tight text-white font-mono">Sign In to Workspace</h1>
        <p className="mt-1 text-xs text-white/55">Authenticate to access your indexed repositories and citations.</p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => handleOAuthSignIn("google")}
            disabled={loadingProvider !== null}
            className="btn-cohere-primary w-full !py-2.5 text-xs text-center justify-center"
          >
            {loadingProvider === "google" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <span>Sign In with Google</span>
            )}
          </button>

          {githubLoginEnabled ? (
            <button
              type="button"
              onClick={() => handleOAuthSignIn("github")}
              disabled={loadingProvider !== null}
              className="btn-cohere-outline w-full !py-2.5 text-xs text-center justify-center"
            >
              <Github className="h-3.5 w-3.5" />
              {loadingProvider === "github" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Redirecting to GitHub...</span>
                </>
              ) : (
                <span>Sign In with GitHub</span>
              )}
            </button>
          ) : null}
        </div>

        <div className="mt-6 border-t border-white/[0.08] pt-4 text-center">
          <p className="text-[11px] text-white/40 font-mono">
            Protected by enterprise row-level security and encrypted tokens.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0e0e11]" />}>
      <LoginContent />
    </Suspense>
  );
}

