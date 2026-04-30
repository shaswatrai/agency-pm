import { NextResponse } from "next/server";
import { postToWebhook, type TeamsMessage } from "@/lib/integrations/providers/microsoft_teams/client";

/**
 * Post a card to a Microsoft Teams incoming webhook.
 *
 * Body: { webhookUrl, message }   (message is the full TeamsMessage shape)
 *   or  { webhookUrl, summary, title?, text? } for a quick adaptive card.
 */
export async function POST(req: Request) {
  let body: {
    webhookUrl?: string;
    message?: TeamsMessage;
    summary?: string;
    title?: string;
    text?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const url = body.webhookUrl;
  if (!url) {
    return NextResponse.json(
      { ok: false, message: "webhookUrl required" },
      { status: 400 },
    );
  }

  if (url.startsWith("demo:")) {
    return NextResponse.json({ ok: true, mode: "demo", status: 200 });
  }

  const message: TeamsMessage =
    body.message ?? {
      summary: body.summary ?? "Atelier notification",
      title: body.title,
      text: body.text,
    };

  try {
    const res = await postToWebhook(url, message);
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Failed" },
      { status: 502 },
    );
  }
}
