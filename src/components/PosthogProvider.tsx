"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

let initialized = false;

export function PosthogProvider({ children }: { children: React.ReactNode }) {
  const apiKey =
    process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!apiKey || initialized) return;

    posthog.init(apiKey, {
      api_host: host,
      capture_pageview: false,
      persistence: "localStorage+cookie",
    });

    initialized = true;
  }, [apiKey, host]);

  if (!apiKey) {
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
