import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

const GA_API = "https://analyticsdata.googleapis.com/v1beta";
const ADMIN_API = "https://analyticsadmin.googleapis.com/v1beta";

/**
 * GA4 Data API. Requires a property ID (e.g. "properties/12345678")
 * stored on the connection's account_metadata.
 */

export interface GaRow {
  dimensions: string[];
  metrics: string[];
}

export interface GaReport {
  rowCount: number;
  rows: GaRow[];
  dimensionHeaders: { name: string }[];
  metricHeaders: { name: string; type: string }[];
}

async function gaFetch<T>(token: string, base: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GA ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const listAccountSummaries = (token: string) =>
  gaFetch<{ accountSummaries: { account: string; displayName: string; propertySummaries?: { property: string; displayName: string }[] }[] }>(
    token,
    ADMIN_API,
    "/accountSummaries",
  );

export interface RunReportRequest {
  propertyId: string;
  dimensions: string[];
  metrics: string[];
  startDate: string; // "7daysAgo" | "YYYY-MM-DD"
  endDate: string;
  limit?: number;
}

export const runReport = (token: string, req: RunReportRequest) => {
  const body = {
    dimensions: req.dimensions.map((name) => ({ name })),
    metrics: req.metrics.map((name) => ({ name })),
    dateRanges: [{ startDate: req.startDate, endDate: req.endDate }],
    limit: String(req.limit ?? 50),
  };
  return gaFetch<{
    rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[];
    rowCount?: number;
    dimensionHeaders: { name: string }[];
    metricHeaders: { name: string; type: string }[];
  }>(token, GA_API, `/${req.propertyId}:runReport`, {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export const gaClient: ProviderClient = {
  kind: "google_analytics",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("google_analytics", credential);
    try {
      const summaries = await listAccountSummaries(secret);
      const first = summaries.accountSummaries?.[0];
      return {
        ok: true,
        message: `Connected · ${first?.displayName ?? "account"}`,
        account: { id: first?.account ?? "ga4", label: first?.displayName ?? "GA4" },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
