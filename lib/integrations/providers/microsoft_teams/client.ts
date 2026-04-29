import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

/**
 * Microsoft Teams supports two notification surfaces:
 *   1. Incoming Webhook (legacy connector) — POST to a per-channel URL
 *      with an Adaptive Card or message payload. Auth = the URL itself.
 *   2. Graph API (Bot/Workflow apps) — full OAuth flow, can read/write
 *      messages via /teams/{id}/channels/{id}/messages.
 *
 * For chunk 4.4 we ship the simpler incoming-webhook posting; full
 * Graph API support comes in a later sub-chunk if needed.
 */

export interface TeamsCardSection {
  activityTitle?: string;
  activitySubtitle?: string;
  activityImage?: string;
  facts?: { name: string; value: string }[];
  text?: string;
}

export interface TeamsMessage {
  "@type"?: "MessageCard";
  "@context"?: "https://schema.org/extensions";
  themeColor?: string;
  summary: string;
  title?: string;
  text?: string;
  sections?: TeamsCardSection[];
  potentialAction?: {
    "@type": "OpenUri";
    name: string;
    targets: { os: "default"; uri: string }[];
  }[];
}

export async function postToWebhook(
  webhookUrl: string,
  message: TeamsMessage,
): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      themeColor: "0078D4",
      ...message,
    }),
  });
  return { ok: res.ok, status: res.status };
}

export const teamsClient: ProviderClient = {
  kind: "microsoft_teams",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No webhook URL" };
    if (secret.startsWith("demo:") || !secret.startsWith("http")) {
      return demoTest("microsoft_teams", credential);
    }
    try {
      const res = await postToWebhook(secret, {
        summary: "Atelier connection test",
        title: "Atelier connected",
        text: "If you see this, your Teams webhook is good to go.",
      });
      return {
        ok: res.ok,
        message: res.ok ? "Test card delivered" : `Webhook returned ${res.status}`,
        account: { id: secret.split("/").slice(-1)[0]?.slice(0, 12) ?? "tenant", label: "Teams channel" },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
