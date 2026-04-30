import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

const GSC_API = "https://searchconsole.googleapis.com/webmasters/v3";

async function gscFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GSC_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GSC ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const listSites = (token: string) =>
  gscFetch<{ siteEntry: { siteUrl: string; permissionLevel: string }[] }>(
    token,
    "/sites",
  );

export interface GscQueryRequest {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: ("query" | "page" | "country" | "device" | "date")[];
  rowLimit?: number;
}

export const querySearchAnalytics = (token: string, req: GscQueryRequest) =>
  gscFetch<{
    rows?: {
      keys: string[];
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }[];
  }>(token, `/sites/${encodeURIComponent(req.siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    body: JSON.stringify({
      startDate: req.startDate,
      endDate: req.endDate,
      dimensions: req.dimensions ?? ["query"],
      rowLimit: req.rowLimit ?? 25,
    }),
  });

export const gscClient: ProviderClient = {
  kind: "google_search_console",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("google_search_console", credential);
    try {
      const sites = await listSites(secret);
      const first = sites.siteEntry?.[0];
      return {
        ok: true,
        message: `Connected · ${sites.siteEntry?.length ?? 0} sites`,
        account: { id: first?.siteUrl ?? "gsc", label: first?.siteUrl ?? "Search Console" },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
