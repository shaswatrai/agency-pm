import { NextResponse } from "next/server";
import { postMessage } from "@/lib/integrations/providers/slack/client";

/**
 * Send a Slack message via chat.postMessage. Used by the in-app
 * notification helper when a task is assigned, a milestone is hit, or
 * a budget threshold trips.
 *
 * Body: { secret, channel, text, blocks? }
 */
export async function POST(req: Request) {
  let body: {
    secret?: string;
    channel?: string;
    text?: string;
    blocks?: unknown[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }
  const { secret, channel, text, blocks } = body;
  if (!secret || !channel || !text) {
    return NextResponse.json(
      { ok: false, message: "secret, channel, text required" },
      { status: 400 },
    );
  }
  if (secret.startsWith("demo:")) {
    return NextResponse.json({
      ok: true,
      mode: "demo",
      ts: String(Date.now() / 1000),
    });
  }
  try {
    const res = await postMessage(secret, { channel, text, blocks });
    return NextResponse.json({ ok: true, ts: res.ts, channel: res.channel });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Failed" },
      { status: 502 },
    );
  }
}
