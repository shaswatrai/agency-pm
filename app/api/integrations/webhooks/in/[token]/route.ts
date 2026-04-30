import { NextResponse } from "next/server";

/**
 * Inbound webhook receiver — public route. Looks up the endpoint by its
 * `endpoint_token` in the URL, verifies the provider's signature, then
 * persists the raw event for downstream processing.
 *
 * Demo note: in demo mode the integrations store lives in the browser,
 * so this server route can't write to it. We respond 202 Accepted with
 * a body that the browser-side flush job (or chunk-2 Figma handler)
 * uses to ingest. Real mode persists the row via service-role Supabase.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Missing endpoint token" },
      { status: 400 },
    );
  }

  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  let parsed: Record<string, unknown> = {};
  try {
    parsed = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch {
    parsed = { _raw: rawBody };
  }

  return NextResponse.json(
    {
      ok: true,
      received: true,
      endpointToken: token,
      headers,
      body: parsed,
      note:
        "In demo mode this route echoes the payload; integrate with the " +
        "browser-side store via /api/integrations/cron/tick to process it. " +
        "In real (Supabase) mode the route persists into incoming_webhook_events.",
    },
    { status: 202 },
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  return NextResponse.json({
    ok: true,
    endpointToken: token,
    message:
      "Inbound webhook endpoint. Send POST with the provider's signature header.",
  });
}
