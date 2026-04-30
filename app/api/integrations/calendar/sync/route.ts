import { NextResponse } from "next/server";
import { insertEvent } from "@/lib/integrations/providers/google_calendar/client";
import { createEvent } from "@/lib/integrations/providers/outlook_calendar/client";

/**
 * Push a project deadline / milestone / approval window to the user's
 * configured calendar. The frontend resolves the connection's secret
 * (demo placeholder or vault read in real mode) and POSTs here.
 *
 * Body: {
 *   provider: "google_calendar" | "outlook_calendar",
 *   secret: string,
 *   calendarId?: string,         (gcal only)
 *   summary, description?, location?,
 *   start: ISO string, end: ISO string,
 *   timeZone?: string,           (defaults to UTC)
 *   attendees?: { email, name? }[]
 * }
 */
export async function POST(req: Request) {
  let body: {
    provider?: "google_calendar" | "outlook_calendar";
    secret?: string;
    calendarId?: string;
    summary?: string;
    description?: string;
    location?: string;
    start?: string;
    end?: string;
    timeZone?: string;
    attendees?: { email: string; name?: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const { provider, secret, summary, start, end } = body;
  if (!provider || !secret || !summary || !start || !end) {
    return NextResponse.json(
      { ok: false, message: "provider, secret, summary, start, end required" },
      { status: 400 },
    );
  }

  if (secret.startsWith("demo:")) {
    return NextResponse.json({
      ok: true,
      mode: "demo",
      eventId: `demo-evt-${Date.now()}`,
      htmlLink: "#",
    });
  }

  try {
    if (provider === "google_calendar") {
      const event = await insertEvent(secret, {
        calendarId: body.calendarId,
        summary,
        description: body.description,
        location: body.location,
        start: { dateTime: start, timeZone: body.timeZone ?? "UTC" },
        end: { dateTime: end, timeZone: body.timeZone ?? "UTC" },
        attendees: body.attendees?.map((a) => ({ email: a.email, displayName: a.name })),
      });
      return NextResponse.json({ ok: true, eventId: event.id, htmlLink: event.htmlLink });
    }
    if (provider === "outlook_calendar") {
      const event = await createEvent(secret, {
        subject: summary,
        body: body.description ? { contentType: "Text", content: body.description } : undefined,
        start: { dateTime: start, timeZone: body.timeZone ?? "UTC" },
        end: { dateTime: end, timeZone: body.timeZone ?? "UTC" },
        attendees: body.attendees?.map((a) => ({
          emailAddress: { address: a.email, name: a.name },
          type: "required",
        })),
        location: body.location ? { displayName: body.location } : undefined,
      });
      return NextResponse.json({ ok: true, eventId: event.id, htmlLink: event.webLink });
    }
    return NextResponse.json(
      { ok: false, message: "unsupported provider" },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Failed" },
      { status: 502 },
    );
  }
}
