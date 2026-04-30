import { NextResponse } from "next/server";
import { postComment } from "@/lib/integrations/providers/figma/client";

/**
 * Push a comment to a Figma file. Used by the client approval overlay
 * to forward "Approved" / "Revisions requested" messages back to Figma
 * so designers see them in context.
 *
 * Body: { fileKey, secret, message, nodeId? }
 *
 * Demo mode (secret starts "demo:"): no-op, returns synthetic OK.
 */
export async function POST(req: Request) {
  let body: {
    fileKey?: string;
    secret?: string;
    message?: string;
    nodeId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const { fileKey, secret, message, nodeId } = body;
  if (!fileKey || !message || !secret) {
    return NextResponse.json(
      { ok: false, message: "fileKey, message, secret required" },
      { status: 400 },
    );
  }

  if (secret.startsWith("demo:")) {
    return NextResponse.json({
      ok: true,
      mode: "demo",
      commentId: `demo-c-${Date.now()}`,
      message: "Demo mode — comment not actually posted to Figma",
    });
  }

  try {
    const comment = await postComment(secret, fileKey, message, {
      node_id: nodeId,
    });
    return NextResponse.json({ ok: true, commentId: comment.id, comment });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Figma POST failed",
      },
      { status: 502 },
    );
  }
}
