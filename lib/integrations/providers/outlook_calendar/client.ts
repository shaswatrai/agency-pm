import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

const GRAPH_API = "https://graph.microsoft.com/v1.0";

export interface OutlookEventInput {
  subject: string;
  body?: { contentType: "Text" | "HTML"; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: { emailAddress: { address: string; name?: string }; type?: "required" | "optional" }[];
  location?: { displayName?: string };
}

async function graphFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GRAPH_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Graph ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const me = (token: string) =>
  graphFetch<{ id: string; displayName: string; userPrincipalName: string }>(
    token,
    "/me",
  );

export const createEvent = (token: string, event: OutlookEventInput) =>
  graphFetch<{ id: string; webLink: string }>(token, "/me/events", {
    method: "POST",
    body: JSON.stringify(event),
  });

export const updateEvent = (
  token: string,
  eventId: string,
  patch: Partial<OutlookEventInput>,
) =>
  graphFetch<{ id: string }>(token, `/me/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const deleteEvent = (token: string, eventId: string) =>
  fetch(`${GRAPH_API}/me/events/${eventId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  }).then((r) => ({ ok: r.ok || r.status === 404, status: r.status }));

export const outlookCalClient: ProviderClient = {
  kind: "outlook_calendar",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("outlook_calendar", credential);
    try {
      const u = await me(secret);
      return {
        ok: true,
        message: `Connected as ${u.displayName}`,
        account: { id: u.id, label: u.userPrincipalName },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
