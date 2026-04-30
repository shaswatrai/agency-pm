import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

/**
 * Google Ads REST API v17. Auth = OAuth2 access token + a developer
 * token (account_metadata.developer_token). Most agencies operate
 * with a manager (MCC) login_customer_id; both are stored in the
 * connection's account_metadata.
 */

const ADS_API = "https://googleads.googleapis.com/v17";

export interface AdsCampaignRow {
  campaign: { id: string; name: string; status: string };
  metrics: {
    impressions: string;
    clicks: string;
    conversions: number;
    cost_micros: string;
  };
}

async function adsFetch<T>(
  token: string,
  developerToken: string,
  loginCustomerId: string | undefined,
  customerId: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${ADS_API}/customers/${customerId}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "developer-token": developerToken,
      ...(loginCustomerId ? { "login-customer-id": loginCustomerId } : {}),
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Ads ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const listAccessibleCustomers = (token: string, developerToken: string) =>
  fetch(`${ADS_API}/customers:listAccessibleCustomers`, {
    headers: {
      authorization: `Bearer ${token}`,
      "developer-token": developerToken,
    },
  }).then(async (r) => {
    if (!r.ok) throw new Error(`Ads ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return (await r.json()) as { resourceNames: string[] };
  });

export const searchCampaigns = (
  token: string,
  developerToken: string,
  customerId: string,
  loginCustomerId?: string,
) =>
  adsFetch<{ results: AdsCampaignRow[] }>(token, developerToken, loginCustomerId, customerId, "/googleAds:search", {
    method: "POST",
    body: JSON.stringify({
      query:
        "SELECT campaign.id, campaign.name, campaign.status, " +
        "metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros " +
        "FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC LIMIT 25",
    }),
  });

export const adsClient: ProviderClient = {
  kind: "google_ads",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("google_ads", credential);
    const developerToken = String(credential.payloadMeta.developer_token ?? "");
    if (!developerToken) {
      return { ok: false, message: "developer_token required in payload metadata" };
    }
    try {
      const list = await listAccessibleCustomers(secret, developerToken);
      return {
        ok: true,
        message: `${list.resourceNames.length} accessible customer(s)`,
        account: { id: list.resourceNames[0] ?? "ads", label: "Google Ads" },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
