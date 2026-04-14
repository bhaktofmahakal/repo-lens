import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  enqueueGithubPushSync,
  getInstallationIdFromPayload,
  getRepoUrlFromPushPayload,
  isGithubAutoSyncConfigured,
  summarizePushPayload,
} from "@/lib/github-autosync";

export const maxDuration = 60;

function verifyGithubSignature(
  body: string,
  signatureHeader: string | null,
  webhookSecret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const receivedDigest = signatureHeader.slice("sha256=".length).trim();
  if (!receivedDigest) return false;

  const expectedDigest = createHmac("sha256", webhookSecret).update(body).digest("hex");

  const expected = Buffer.from(expectedDigest, "hex");
  const received = Buffer.from(receivedDigest, "hex");

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

export async function POST(req: NextRequest) {
  if (!isGithubAutoSyncConfigured()) {
    return NextResponse.json(
      {
        error: "GitHub auto-sync is disabled or not configured.",
        code: "AUTOSYNC_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET as string;
  const signature = req.headers.get("x-hub-signature-256");
  const eventType = req.headers.get("x-github-event") || "unknown";
  const deliveryId = req.headers.get("x-github-delivery") || crypto.randomUUID();
  const body = await req.text();

  if (!verifyGithubSignature(body, signature, webhookSecret)) {
    return NextResponse.json(
      {
        error: "Invalid GitHub webhook signature.",
        code: "INVALID_SIGNATURE",
      },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body) as unknown;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON payload.",
        code: "INVALID_JSON",
      },
      { status: 400 },
    );
  }

  if (eventType === "ping") {
    return NextResponse.json({ received: true, event: "ping" });
  }

  if (eventType !== "push") {
    return NextResponse.json({ received: true, ignored: true, event: eventType });
  }

  const repoUrl = getRepoUrlFromPushPayload(payload);
  if (!repoUrl) {
    return NextResponse.json(
      {
        error: "Missing repository URL in webhook payload.",
        code: "INVALID_PUSH_PAYLOAD",
      },
      { status: 400 },
    );
  }

  const pushSummary = summarizePushPayload(payload);
  const installationId = getInstallationIdFromPayload(payload);

  try {
    const jobsQueued = await enqueueGithubPushSync({
      deliveryId,
      eventType,
      repoUrl,
      installationId,
      pushSummary,
    });

    return NextResponse.json({
      received: true,
      event: eventType,
      deliveryId,
      repoUrl,
      installationId,
      jobsQueued,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Failed to enqueue sync jobs.",
        code: "SYNC_ENQUEUE_FAILED",
      },
      { status: 500 },
    );
  }
}
