import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

const SLACK_API = "https://slack.com/api";

export interface SlackPostMessageInput {
  channel: string;
  text: string;
  blocks?: unknown[];
  thread_ts?: string;
}

async function slackFetch<T>(token: string, method: string, payload: unknown): Promise<T> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as { ok: boolean; error?: string } & Record<string, unknown>;
  if (!json.ok) throw new Error(`Slack ${method}: ${json.error ?? res.statusText}`);
  return json as T;
}

export const postMessage = (token: string, input: SlackPostMessageInput) =>
  slackFetch<{ ok: true; channel: string; ts: string; message: unknown }>(
    token,
    "chat.postMessage",
    input,
  );

export const authTest = (token: string) =>
  slackFetch<{ ok: true; team: string; user: string; team_id: string; user_id: string }>(
    token,
    "auth.test",
    {},
  );

export const slackClient: ProviderClient = {
  kind: "slack",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("slack", credential);
    try {
      const me = await authTest(secret);
      return {
        ok: true,
        message: `Connected to ${me.team}`,
        account: { id: me.team_id, label: `${me.team} · ${me.user}` },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
