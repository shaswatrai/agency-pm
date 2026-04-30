import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

/**
 * Salesforce REST. Each org has its own instance URL (stored in
 * payloadMeta.instanceUrl, e.g. https://yourco.my.salesforce.com).
 * The token is an OAuth access token; refresh handling lives in the
 * generic OAuth refresh job (chunk 1 framework).
 */

export interface SfOpportunity {
  Id: string;
  Name: string;
  Amount: number | null;
  StageName: string;
  CloseDate: string | null;
  AccountId: string | null;
}

async function sfFetch<T>(
  token: string,
  instanceUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = instanceUrl.replace(/\/$/, "") + path;
  const res = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Salesforce ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const userInfo = (token: string, instanceUrl: string) =>
  sfFetch<{ user_id: string; organization_id: string; username: string; email: string }>(
    token,
    instanceUrl,
    "/services/oauth2/userinfo",
  );

export const listOpportunities = (token: string, instanceUrl: string) =>
  sfFetch<{ records: SfOpportunity[] }>(
    token,
    instanceUrl,
    "/services/data/v60.0/query?q=" +
      encodeURIComponent(
        "SELECT Id, Name, Amount, StageName, CloseDate, AccountId FROM Opportunity ORDER BY CloseDate DESC LIMIT 25",
      ),
  );

export const salesforceClient: ProviderClient = {
  kind: "salesforce",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("salesforce", credential);
    const instanceUrl = String(credential.payloadMeta.instanceUrl ?? "");
    if (!instanceUrl) {
      return { ok: false, message: "instanceUrl required in payload metadata" };
    }
    try {
      const u = await userInfo(secret, instanceUrl);
      return {
        ok: true,
        message: `Connected as ${u.username}`,
        account: { id: u.user_id, label: u.email },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
