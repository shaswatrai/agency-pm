import { NextResponse } from "next/server";
import { runReport } from "@/lib/integrations/providers/google_analytics/client";
import { querySearchAnalytics } from "@/lib/integrations/providers/google_search_console/client";
import { searchCampaigns } from "@/lib/integrations/providers/google_ads/client";
import { getInsights, listAdAccounts } from "@/lib/integrations/providers/meta_ads/client";

/**
 * Snapshot the last-30d marketing metrics for a project / client. The
 * frontend Marketing Performance dashboard calls this; demo mode
 * returns deterministic synthetic data so the page renders without
 * any provider connected.
 *
 * Body: {
 *   secrets?: { ga?, gsc?, ads?, meta? },
 *   propertyId?, gscSiteUrl?,
 *   adsCustomerId?, adsDeveloperToken?, adsLoginCustomerId?,
 *   metaAdAccountId?
 * }
 *
 * All fields optional — anything we have a token for, we hit; the
 * rest are filled with demo data. The response is uniform so the
 * UI doesn't need to know which sources actually fired.
 */
export async function POST(req: Request) {
  let body: {
    secrets?: { ga?: string; gsc?: string; ads?: string; meta?: string };
    propertyId?: string;
    gscSiteUrl?: string;
    adsCustomerId?: string;
    adsDeveloperToken?: string;
    adsLoginCustomerId?: string;
    metaAdAccountId?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* body stays empty -> all demo */
  }

  const out = {
    ga: await fetchGa(body),
    gsc: await fetchGsc(body),
    ads: await fetchGoogleAds(body),
    meta: await fetchMeta(body),
    capturedAt: new Date().toISOString(),
  };
  return NextResponse.json(out);
}

async function fetchGa(b: { secrets?: { ga?: string }; propertyId?: string }) {
  if (!b.secrets?.ga || b.secrets.ga.startsWith("demo:") || !b.propertyId) {
    return demoGa();
  }
  try {
    const r = await runReport(b.secrets.ga, {
      propertyId: b.propertyId,
      dimensions: ["pagePath"],
      metrics: ["sessions", "engagedSessions", "averageSessionDuration", "conversions"],
      startDate: "30daysAgo",
      endDate: "today",
      limit: 10,
    });
    return {
      mode: "live",
      rows: (r.rows ?? []).map((row) => ({
        path: row.dimensionValues[0]?.value,
        sessions: Number(row.metricValues[0]?.value ?? 0),
        engaged: Number(row.metricValues[1]?.value ?? 0),
        avgDuration: Number(row.metricValues[2]?.value ?? 0),
        conversions: Number(row.metricValues[3]?.value ?? 0),
      })),
    };
  } catch (err) {
    return { mode: "error", error: err instanceof Error ? err.message : "GA failed", rows: demoGa().rows };
  }
}

async function fetchGsc(b: { secrets?: { gsc?: string }; gscSiteUrl?: string }) {
  if (!b.secrets?.gsc || b.secrets.gsc.startsWith("demo:") || !b.gscSiteUrl) {
    return demoGsc();
  }
  try {
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const r = await querySearchAnalytics(b.secrets.gsc, {
      siteUrl: b.gscSiteUrl,
      startDate: start,
      endDate: today,
      dimensions: ["query"],
      rowLimit: 10,
    });
    return {
      mode: "live",
      rows: (r.rows ?? []).map((row) => ({
        query: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })),
    };
  } catch (err) {
    return { mode: "error", error: err instanceof Error ? err.message : "GSC failed", rows: demoGsc().rows };
  }
}

async function fetchGoogleAds(b: {
  secrets?: { ads?: string };
  adsCustomerId?: string;
  adsDeveloperToken?: string;
  adsLoginCustomerId?: string;
}) {
  if (
    !b.secrets?.ads ||
    b.secrets.ads.startsWith("demo:") ||
    !b.adsCustomerId ||
    !b.adsDeveloperToken
  ) {
    return demoAds();
  }
  try {
    const r = await searchCampaigns(
      b.secrets.ads,
      b.adsDeveloperToken,
      b.adsCustomerId,
      b.adsLoginCustomerId,
    );
    return {
      mode: "live",
      rows: r.results.map((row) => ({
        id: row.campaign.id,
        name: row.campaign.name,
        impressions: Number(row.metrics.impressions),
        clicks: Number(row.metrics.clicks),
        conversions: row.metrics.conversions,
        spendUsd: Number(row.metrics.cost_micros) / 1_000_000,
      })),
    };
  } catch (err) {
    return { mode: "error", error: err instanceof Error ? err.message : "Ads failed", rows: demoAds().rows };
  }
}

async function fetchMeta(b: {
  secrets?: { meta?: string };
  metaAdAccountId?: string;
}) {
  if (!b.secrets?.meta || b.secrets.meta.startsWith("demo:")) {
    return demoMeta();
  }
  try {
    const accountId = b.metaAdAccountId ?? (await listAdAccounts(b.secrets.meta)).data[0]?.id;
    if (!accountId) return demoMeta();
    const r = await getInsights(b.secrets.meta, accountId);
    return {
      mode: "live",
      rows: r.data.map((row) => ({
        id: row.campaign_id,
        name: row.campaign_name,
        impressions: Number(row.impressions),
        clicks: Number(row.clicks),
        spend: Number(row.spend),
      })),
    };
  } catch (err) {
    return { mode: "error", error: err instanceof Error ? err.message : "Meta failed", rows: demoMeta().rows };
  }
}

// --- Deterministic demo data so the dashboard always renders -----------

function demoGa() {
  return {
    mode: "demo" as const,
    rows: [
      { path: "/", sessions: 4218, engaged: 3010, avgDuration: 142, conversions: 86 },
      { path: "/pricing", sessions: 1920, engaged: 1444, avgDuration: 198, conversions: 51 },
      { path: "/blog/agency-pm-launch", sessions: 1487, engaged: 1132, avgDuration: 234, conversions: 12 },
      { path: "/contact", sessions: 712, engaged: 612, avgDuration: 88, conversions: 38 },
      { path: "/case-studies", sessions: 588, engaged: 421, avgDuration: 167, conversions: 9 },
    ],
  };
}

function demoGsc() {
  return {
    mode: "demo" as const,
    rows: [
      { query: "agency project management", clicks: 412, impressions: 9120, ctr: 0.045, position: 4.2 },
      { query: "atelier project tool", clicks: 188, impressions: 1742, ctr: 0.108, position: 1.8 },
      { query: "design agency invoice software", clicks: 96, impressions: 4310, ctr: 0.022, position: 8.5 },
      { query: "figma project management", clicks: 71, impressions: 2854, ctr: 0.025, position: 12.1 },
    ],
  };
}

function demoAds() {
  return {
    mode: "demo" as const,
    rows: [
      { id: "1", name: "Brand · Atelier", impressions: 84210, clicks: 4108, conversions: 217, spendUsd: 3120 },
      { id: "2", name: "Search · agency-pm", impressions: 41240, clicks: 1891, conversions: 88, spendUsd: 1880 },
      { id: "3", name: "Display · retargeting", impressions: 198320, clicks: 712, conversions: 11, spendUsd: 940 },
    ],
  };
}

function demoMeta() {
  return {
    mode: "demo" as const,
    rows: [
      { id: "10", name: "TOF · Awareness Apr", impressions: 142_000, clicks: 4_120, spend: 1820 },
      { id: "20", name: "MOF · Free trial", impressions: 86_000, clicks: 3_412, spend: 1340 },
      { id: "30", name: "BOF · Demo booking", impressions: 21_000, clicks: 1_182, spend: 612 },
    ],
  };
}
