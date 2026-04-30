import { NextResponse } from "next/server";
import { resolveThumbnail } from "@/lib/integrations/providers/figma/sync";
import type { IntegrationLink } from "@/types/domain";

/**
 * Resolve a Figma thumbnail URL for a link. The browser sends:
 *   { link, secret }
 * where `secret` is the demo-mode token (or "demo:..." for the demo
 * placeholder). In real (Supabase) mode the route will instead read
 * the credential's vault_secret_id and decrypt server-side; the
 * browser does not pass plaintext.
 *
 * Body: { link: IntegrationLink, secret?: string }
 * Response: { ok, url, fetchedAt, fromCache, message? }
 */
export async function POST(req: Request) {
  let body: { link?: IntegrationLink; secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const { link, secret } = body;
  if (!link) {
    return NextResponse.json(
      { ok: false, message: "link is required" },
      { status: 400 },
    );
  }

  const result = await resolveThumbnail(link, secret ?? null);
  return NextResponse.json(result);
}
