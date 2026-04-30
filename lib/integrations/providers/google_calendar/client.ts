import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

const GCAL_API = "https://www.googleapis.com/calendar/v3";

export interface CalEventInput {
  calendarId?: string; // default "primary"
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  attendees?: { email: string; displayName?: string }[];
  location?: string;
}

export interface CalEvent extends CalEventInput {
  id: string;
  htmlLink: string;
  status: "confirmed" | "tentative" | "cancelled";
  created: string;
  updated: string;
}

async function gcalFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GCAL_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`gcal ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const calendarList = (token: string) =>
  gcalFetch<{ items: { id: string; summary: string; primary?: boolean }[] }>(
    token,
    "/users/me/calendarList",
  );

export const insertEvent = (token: string, event: CalEventInput) =>
  gcalFetch<CalEvent>(
    token,
    `/calendars/${encodeURIComponent(event.calendarId ?? "primary")}/events`,
    { method: "POST", body: JSON.stringify(event) },
  );

export const updateEvent = (
  token: string,
  eventId: string,
  patch: Partial<CalEventInput>,
  calendarId = "primary",
) =>
  gcalFetch<CalEvent>(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );

export const deleteEvent = (token: string, eventId: string, calendarId = "primary") =>
  fetch(`${GCAL_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  }).then((r) => ({ ok: r.ok || r.status === 404, status: r.status }));

export const gcalClient: ProviderClient = {
  kind: "google_calendar",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("google_calendar", credential);
    try {
      const list = await calendarList(secret);
      const primary = list.items?.find((c) => c.primary) ?? list.items?.[0];
      return {
        ok: true,
        message: `${list.items.length} calendars accessible`,
        account: { id: primary?.id ?? "primary", label: primary?.summary ?? "Calendar" },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
