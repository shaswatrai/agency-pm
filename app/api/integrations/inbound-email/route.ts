import { NextResponse } from "next/server";

/**
 * Inbound email → task receiver (PRD §5.9). Accepts the standard
 * Postmark Inbound Parse JSON shape:
 *   {
 *     From: "alice@client.com",
 *     ToFull: [{ Email: "tasks+iris-web-001-a8f3@inbox.atelier.studio" }],
 *     Subject: "Update needed on cart",
 *     TextBody: "...",
 *     HtmlBody: "...",
 *     Attachments: [{ Name, Content, ContentType, ContentLength }]
 *   }
 *
 * SendGrid Inbound Parse is similar but multipart/form-data; users can
 * front it with a thin transformer that re-POSTs to this endpoint.
 *
 * Demo mode: this route doesn't have access to the browser-side
 * integrations + tasks store, so it echoes the parsed envelope and a
 * synthetic task that *would* be created. Real (Supabase-backed) mode
 * will perform the actual insert via a service-role transaction.
 */

interface PostmarkInbound {
  From?: string;
  FromName?: string;
  ToFull?: { Email: string }[];
  Subject?: string;
  TextBody?: string;
  HtmlBody?: string;
  MessageID?: string;
  Date?: string;
  Attachments?: {
    Name: string;
    ContentType: string;
    ContentLength: number;
  }[];
}

export async function POST(req: Request) {
  let body: PostmarkInbound;
  try {
    body = (await req.json()) as PostmarkInbound;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const toAddress = body.ToFull?.[0]?.Email ?? "";
  // Inbox local-part shape: tasks+<projectcode>-<random>
  const local = toAddress.split("@")[0] ?? "";
  const match = local.match(/^tasks\+([a-z0-9-]+)-([a-z0-9]+)$/i);
  if (!match) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "to-address didn't match the tasks+<projectcode>-<random> shape",
        receivedTo: toAddress,
      },
      { status: 400 },
    );
  }

  const projectCode = match[1];
  const inboxToken = match[2];
  const subject = body.Subject?.trim() ?? "(no subject)";
  const textBody = body.TextBody ?? body.HtmlBody ?? "";

  return NextResponse.json({
    ok: true,
    mode: "demo",
    inboxToken,
    projectCode,
    wouldCreateTask: {
      title: subject,
      description: textBody.slice(0, 4000),
      from: body.From,
      attachmentCount: body.Attachments?.length ?? 0,
      receivedAt: body.Date ?? new Date().toISOString(),
    },
    note:
      "Demo response. Real mode persists the task via service-role Supabase " +
      "after looking up the EmailToTaskMapping by projectCode + inboxToken.",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    description:
      "Inbound email receiver. POST Postmark-shape JSON to create tasks.",
  });
}
