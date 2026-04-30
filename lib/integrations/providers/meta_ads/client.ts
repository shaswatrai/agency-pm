import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

const META_API = "https://graph.facebook.com/v20.0";

export interface MetaInsightRow {
  campaign_id?: string;
  campaign_name?: string;
  impressions: string;
  clicks: string;
  spend: string;
  reach?: string;
  date_start: string;
  date_stop: string;
}

async function metaFetch<T>(token: string, path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${META_API}${path}`);
  url.searchParams.set("access_token", token);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Meta ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const me = (token: string) =>
  metaFetch<{ id: string; name: string }>(token, "/me", { fields: "id,name" });

export const listAdAccounts = (token: string) =>
  metaFetch<{ data: { id: string; name: string; account_status: number }[] }>(
    token,
    "/me/adaccounts",
    { fields: "id,name,account_status" },
  );

export const getInsights = (token: string, adAccountId: string) =>
  metaFetch<{ data: MetaInsightRow[] }>(
    token,
    `/${adAccountId}/insights`,
    {
      fields: "campaign_id,campaign_name,impressions,clicks,spend,reach",
      level: "campaign",
      date_preset: "last_30d",
      limit: "25",
    },
  );

export const metaClient: ProviderClient = {
  kind: "meta_ads",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("meta_ads", credential);
    try {
      const u = await me(secret);
      return {
        ok: true,
        message: `Connected as ${u.name}`,
        account: { id: u.id, label: u.name },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
