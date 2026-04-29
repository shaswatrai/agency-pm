import { NextResponse } from "next/server";

/**
 * Send a transactional email via Resend.
 * The Resend API key is supplied per request (from the runtime-config
 * stored in the user's localStorage). It's never persisted server-side.
 *
 * Body shape:
 *   { apiKey, from, to, subject, html, text? }
 */
export async function POST(request: Request) {
  let body: {
    apiKey?: string;
    from?: string;
    to?: string | string[];
    subject?: string;
    html?: string;
    text?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { apiKey, from, to, subject, html, text } = body;
  if (!apiKey || !from || !to || !subject || (!html && !text)) {
    return NextResponse.json(
      {
        error:
          "Missing required fields (apiKey, from, to, subject, html or text)",
      },
      { status: 400 },
    );
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            errBody?.message ?? `Resend returned ${res.status} ${res.statusText}`,
        },
        { status: res.status },
      );
    }
    const data = await res.json();
    return NextResponse.json({ id: data.id, ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Network error" },
      { status: 500 },
    );
  }
}
