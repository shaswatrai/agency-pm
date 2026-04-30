import { NextResponse } from "next/server";
import {
  type FigmaWebhookEnvelope,
  processFigmaEvent,
} from "@/lib/integrations/providers/figma/webhooks";
import { verifyFigmaPasscode } from "@/lib/integrations/webhooks/sign";

/**
 * Dedicated Figma webhook receiver. Figma webhooks v2 deliver a
 * `passcode` in the body, set when the webhook was registered. We
 * compare it (constant-time) against the secret stored against the
 * configured Figma connection.
 *
 * Real mode resolves the expected passcode from the connection's
 * vault_secret_id. Demo mode accepts any payload and just echoes the
 * processing summary so the UI can wire end-to-end before production
 * credentials exist.
 *
 * Body: a Figma webhook envelope (see lib/integrations/providers/figma/webhooks.ts)
 * Header: none — the passcode is in the body
 */
export async function POST(req: Request) {
  let envelope: FigmaWebhookEnvelope;
  try {
    envelope = (await req.json()) as FigmaWebhookEnvelope;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  // Optional explicit passcode override via header for tests; in production
  // we'd look up the expected passcode from Supabase by webhook_id.
  const expected = req.headers.get("x-figma-expected-passcode") ?? "";
  if (expected) {
    const verify = await verifyFigmaPasscode(expected, envelope.passcode ?? "");
    if (!verify.valid) {
      return NextResponse.json(
        { ok: false, message: verify.reason ?? "passcode mismatch" },
        { status: 401 },
      );
    }
  }

  const result = await processFigmaEvent(envelope, {
    endpointId: envelope.webhook_id ?? "unknown",
    organizationId: "", // Resolved server-side via webhook_id lookup in real mode
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
