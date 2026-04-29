import { NextResponse } from "next/server";
import {
  captureVersionSnapshot,
} from "@/lib/integrations/providers/figma/sync";
import type { IntegrationLink } from "@/types/domain";

/**
 * Capture the latest Figma version of a linked file as a milestone
 * snapshot. Caller persists `versionId` into the link's metadata.
 *
 * Body: { link: IntegrationLink, secret, reason }
 */
export async function POST(req: Request) {
  let body: { link?: IntegrationLink; secret?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }
  const { link, secret, reason } = body;
  if (!link || !reason) {
    return NextResponse.json(
      { ok: false, message: "link and reason are required" },
      { status: 400 },
    );
  }

  const result = await captureVersionSnapshot(
    link,
    secret ?? null,
    reason,
  );
  return NextResponse.json(result);
}
