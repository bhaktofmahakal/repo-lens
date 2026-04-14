import { PostHog } from "posthog-node";

export type PosthogEvent =
  | {
      event: "repo_ingested";
      properties: {
        repo_size_mb: number;
        ingest_method: "zip" | "github";
        file_count: number;
        duration_ms: number;
      };
    }
  | {
      event: "query_submitted";
      properties: {
        session_id: string;
        query_length: number;
        chunk_count: number;
      };
    }
  | {
      event: "answer_rated";
      properties: {
        session_id: string;
        rating: "up" | "down";
        latency_ms: number;
      };
    }
  | {
      event: "plan_upgraded";
      properties: {
        from_plan: string;
        to_plan: string;
      };
    }
  | {
      event: "session_shared";
      properties: {
        is_public: boolean;
      };
    };

let posthogClient: PostHog | null = null;

function getPosthogClient(): PostHog | null {
  const apiKey =
    process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  if (!apiKey) {
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(apiKey, {
      host,
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}

export async function capturePosthogEvent(distinctId: string, payload: PosthogEvent): Promise<void> {
  try {
    const client = getPosthogClient();
    if (!client) return;

    client.capture({
      distinctId,
      event: payload.event,
      properties: payload.properties,
    });
  } catch {
    // Analytics should never block the request flow.
  }
}
