"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ConnectionState = {
  connected: boolean;
  loading: boolean;
  error: string | null;
};

export function GitHubConnectionCard() {
  const [state, setState] = useState<ConnectionState>({
    connected: false,
    loading: true,
    error: null,
  });

  const loadStatus = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch("/api/github/token");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to load status");
      }

      setState({ connected: data.connected === true, loading: false, error: null });
    } catch {
      setState({ connected: false, loading: false, error: "Failed to load GitHub status." });
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const connectGitHub = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback?connect=github", window.location.origin).toString();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          scopes: "repo",
          redirectTo,
        },
      });

      if (error) {
        throw new Error("Unable to start GitHub OAuth flow.");
      }
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: "Failed to connect GitHub." }));
    }
  };

  const disconnectGitHub = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch("/api/github/token", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to disconnect");
      }

      setState({ connected: false, loading: false, error: null });
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: "Failed to disconnect GitHub." }));
    }
  };

  return (
    <article className="rounded-xl border border-white/10 bg-[#111111] p-5">
      <h2 className="text-lg font-semibold">GitHub Connection</h2>
      <p className="mt-2 text-sm text-white/60">
        Connect GitHub to allow private repository ingestion using read-only repo scope.
      </p>
      <p className="mt-3 text-sm text-white/80">
        Status: <span className={state.connected ? "text-emerald-300" : "text-white/70"}>{state.connected ? "Connected" : "Not connected"}</span>
      </p>
      <div className="mt-4 flex gap-2">
        {!state.connected ? (
          <button
            type="button"
            onClick={connectGitHub}
            disabled={state.loading}
            className="rounded-lg bg-[#F04D26] px-4 py-2 text-sm font-medium text-white hover:bg-[#de4723] disabled:opacity-50"
          >
            {state.loading ? "Connecting..." : "Connect GitHub"}
          </button>
        ) : (
          <button
            type="button"
            onClick={disconnectGitHub}
            disabled={state.loading}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/5 disabled:opacity-50"
          >
            {state.loading ? "Disconnecting..." : "Disconnect"}
          </button>
        )}
      </div>
      {state.error ? <p className="mt-3 text-sm text-red-300">{state.error}</p> : null}
    </article>
  );
}
