"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ConnectionState = {
  connected: boolean;
  checking: boolean;
  action: "connect" | "disconnect" | null;
  connectAvailable: boolean;
  error: string | null;
  unavailableReason: string | null;
};

export function GitHubConnectionCard() {
  const [state, setState] = useState<ConnectionState>({
    connected: false,
    checking: true,
    action: null,
    connectAvailable: false,
    error: null,
    unavailableReason: null,
  });

  const loadStatus = async () => {
    setState((prev) => ({ ...prev, checking: true, error: null }));

    try {
      const res = await fetch("/api/github/token");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to load status");
      }

      setState({
        connected: data.connected === true,
        checking: false,
        action: null,
        connectAvailable: data.connectAvailable === true,
        error: null,
        unavailableReason:
          typeof data.unavailableReason === "string" ? data.unavailableReason : null,
      });
    } catch {
      setState((prev) => ({
        ...prev,
        connected: false,
        checking: false,
        action: null,
        error: "Failed to load GitHub status.",
      }));
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const connectGitHub = async () => {
    if (!state.connectAvailable) return;

    setState((prev) => ({ ...prev, action: "connect", error: null }));

    try {
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback?connect=github", window.location.origin).toString();
      const { error } = await supabase.auth.linkIdentity({
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
      setState((prev) => ({
        ...prev,
        action: null,
        error: "Failed to connect GitHub.",
      }));
    }
  };

  const disconnectGitHub = async () => {
    setState((prev) => ({ ...prev, action: "disconnect", error: null }));

    try {
      const res = await fetch("/api/github/token", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to disconnect");
      }

      setState((prev) => ({ ...prev, connected: false, action: null, error: null }));
    } catch {
      setState((prev) => ({
        ...prev,
        action: null,
        error: "Failed to disconnect GitHub.",
      }));
    }
  };

  const statusText = state.checking
    ? "Checking..."
    : state.connected
      ? "Connected"
      : "Not connected";
  const connectDisabled =
    state.checking || state.action !== null || !state.connectAvailable;

  return (
    <article className="rounded-xl border border-white/10 bg-[#111111] p-5">
      <h2 className="text-lg font-semibold">GitHub Connection</h2>
      <p className="mt-2 text-sm text-white/60">
        Connect GitHub OAuth to allow private repository ingestion.
      </p>
      <p className="mt-3 text-sm text-white/80">
        Status: <span className={state.connected ? "text-emerald-300" : "text-white/70"}>{statusText}</span>
      </p>
      <div className="mt-4 flex gap-2">
        {!state.connected ? (
          <button
            type="button"
            onClick={connectGitHub}
            disabled={connectDisabled}
            className="rounded-lg bg-[#F04D26] px-4 py-2 text-sm font-medium text-white hover:bg-[#de4723] disabled:opacity-50"
          >
            {state.action === "connect"
              ? "Connecting..."
              : state.checking
                ? "Checking status..."
                : "Connect GitHub"}
          </button>
        ) : (
          <button
            type="button"
            onClick={disconnectGitHub}
            disabled={state.checking || state.action !== null}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/5 disabled:opacity-50"
          >
            {state.action === "disconnect" ? "Disconnecting..." : "Disconnect"}
          </button>
        )}
      </div>
      {!state.connected && !state.checking && state.unavailableReason ? (
        <p className="mt-3 text-sm text-amber-200">{state.unavailableReason}</p>
      ) : null}
      {state.error ? <p className="mt-3 text-sm text-red-300">{state.error}</p> : null}
    </article>
  );
}
