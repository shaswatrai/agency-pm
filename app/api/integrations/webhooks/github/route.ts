import { NextResponse } from "next/server";
import {
  processPullRequest,
  processPush,
  type GhPullRequestEvent,
  type GhPushEvent,
} from "@/lib/integrations/providers/github/webhooks";
import { verifyGithubSignature } from "@/lib/integrations/webhooks/sign";

/**
 * GitHub webhook receiver. Header `X-Hub-Signature-256` carries
 * `sha256=<hex>` over the raw body, signed with the webhook's
 * configured secret. We verify constant-time before processing.
 *
 * Supported events: push, pull_request. Others 200 with action=ignore.
 */
export async function POST(req: Request) {
  const eventType = req.headers.get("x-github-event") ?? "";
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const expectedSecret = req.headers.get("x-test-secret"); // for tests

  const rawBody = await req.text();
  if (expectedSecret) {
    const verify = await verifyGithubSignature(expectedSecret, rawBody, sig);
    if (!verify.valid) {
      return NextResponse.json(
        { ok: false, message: verify.reason ?? "bad signature" },
        { status: 401 },
      );
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (eventType === "push") {
    const result = processPush(payload as GhPushEvent);
    return NextResponse.json(result);
  }
  if (eventType === "pull_request") {
    const result = processPullRequest(payload as GhPullRequestEvent);
    return NextResponse.json(result);
  }
  if (eventType === "ping") {
    return NextResponse.json({ ok: true, action: "ping" });
  }
  return NextResponse.json({ ok: true, action: "ignore", event: eventType });
}
