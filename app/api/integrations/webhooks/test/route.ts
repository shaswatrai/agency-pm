import { NextResponse } from "next/server";
import { signPayload } from "@/lib/integrations/webhooks/sign";

/**
 * Server-side proxy for "Test fire" — receives target URL + secret +
 * sample payload, signs and POSTs. Lets the UI test a webhook without
 * exposing the HMAC secret to other origins (CORS) or running fetch
 * with a no-cors mode that hides the response.
 *
 * Body:
 *   { targetUrl, secret, eventType?, payload?, customHeaders?, timeoutMs? }
 */
export async function POST(req: Request) {
  let body: {
    targetUrl?: string;
    secret?: string;
    eventType?: string;
    payload?: Record<string, unknown>;
    customHeaders?: Record<string, string>;
    timeoutMs?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const {
    targetUrl,
    secret,
    eventType = "atelier.ping",
    payload = { message: "Atelier integrations test ping" },
    customHeaders = {},
    timeoutMs = 10000,
  } = body;

  if (!targetUrl || !secret) {
    return NextResponse.json(
      { ok: false, message: "targetUrl and secret are required" },
      { status: 400 },
    );
  }

  const envelope = {
    id: crypto.randomUUID(),
    type: eventType,
    occurred_at: new Date().toISOString(),
    data: payload,
  };
  const rawBody = JSON.stringify(envelope);
  const signature = await signPayload(secret, rawBody);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "AtelierWebhooks/1.0",
        "x-atelier-event": eventType,
        "x-atelier-signature": signature,
        ...customHeaders,
      },
      body: rawBody,
      signal: controller.signal,
    });
    const responseBody = (await res.text().catch(() => "")).slice(0, 4000);
    return NextResponse.json({
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      responseBody,
      signature,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Network error",
        durationMs: Date.now() - startedAt,
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
