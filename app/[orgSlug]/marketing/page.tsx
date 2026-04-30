"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Target,
  Search,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/db/store";
import { useIntegrationsStore } from "@/lib/integrations/store";

interface Snapshot {
  ga: { mode: string; rows: { path: string; sessions: number; engaged: number; avgDuration: number; conversions: number }[]; error?: string };
  gsc: { mode: string; rows: { query: string; clicks: number; impressions: number; ctr: number; position: number }[]; error?: string };
  ads: { mode: string; rows: { id: string; name: string; impressions: number; clicks: number; conversions: number; spendUsd: number }[]; error?: string };
  meta: { mode: string; rows: { id: string; name: string; impressions: number; clicks: number; spend: number }[]; error?: string };
  capturedAt: string;
}

export default function MarketingDashboardPage() {
  const orgId = useStore((s) => s.organization.id);
  const credentials = useIntegrationsStore((s) => s.credentials);
  const readSecret = useIntegrationsStore((s) => s.readSecret);

  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const ga = credentials.find((c) => c.organizationId === orgId && c.provider === "google_analytics");
    const gsc = credentials.find((c) => c.organizationId === orgId && c.provider === "google_search_console");
    const ads = credentials.find((c) => c.organizationId === orgId && c.provider === "google_ads");
    const meta = credentials.find((c) => c.organizationId === orgId && c.provider === "meta_ads");
    const res = await fetch("/api/integrations/marketing/snapshot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secrets: {
          ga: ga ? readSecret(ga.vaultSecretId) : undefined,
          gsc: gsc ? readSecret(gsc.vaultSecretId) : undefined,
          ads: ads ? readSecret(ads.vaultSecretId) : undefined,
          meta: meta ? readSecret(meta.vaultSecretId) : undefined,
        },
        propertyId: ga?.payloadMeta.propertyId as string | undefined,
        gscSiteUrl: gsc?.payloadMeta.siteUrl as string | undefined,
        adsCustomerId: ads?.payloadMeta.customerId as string | undefined,
        adsDeveloperToken: ads?.payloadMeta.developer_token as string | undefined,
        adsLoginCustomerId: ads?.payloadMeta.loginCustomerId as string | undefined,
        metaAdAccountId: meta?.payloadMeta.adAccountId as string | undefined,
      }),
    });
    const json = (await res.json()) as Snapshot;
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Marketing performance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last 30 days · Google Analytics · Search Console · Google Ads · Meta Ads
            {data?.capturedAt ? ` · captured ${new Date(data.capturedAt).toLocaleTimeString()}` : ""}
          </p>
        </div>
        <Button onClick={() => void load()} disabled={loading} variant="outline">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </motion.div>

      {!data ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Website traffic (GA4)"
            icon={TrendingUp}
            mode={data.ga.mode}
            error={data.ga.error}
          >
            <Table
              cols={["Path", "Sessions", "Engaged", "Avg dur", "Conv"]}
              rows={data.ga.rows.map((r) => [
                r.path,
                r.sessions.toLocaleString(),
                r.engaged.toLocaleString(),
                `${Math.round(r.avgDuration)}s`,
                r.conversions.toString(),
              ])}
            />
          </Panel>
          <Panel
            title="Top search queries (GSC)"
            icon={Search}
            mode={data.gsc.mode}
            error={data.gsc.error}
          >
            <Table
              cols={["Query", "Clicks", "Impr", "CTR", "Pos"]}
              rows={data.gsc.rows.map((r) => [
                r.query,
                r.clicks.toString(),
                r.impressions.toLocaleString(),
                `${(r.ctr * 100).toFixed(1)}%`,
                r.position.toFixed(1),
              ])}
            />
          </Panel>
          <Panel
            title="Google Ads campaigns"
            icon={Target}
            mode={data.ads.mode}
            error={data.ads.error}
          >
            <Table
              cols={["Campaign", "Impr", "Clicks", "Conv", "Spend"]}
              rows={data.ads.rows.map((r) => [
                r.name,
                r.impressions.toLocaleString(),
                r.clicks.toLocaleString(),
                r.conversions.toString(),
                `$${r.spendUsd.toLocaleString()}`,
              ])}
            />
          </Panel>
          <Panel
            title="Meta Ads campaigns"
            icon={BarChart3}
            mode={data.meta.mode}
            error={data.meta.error}
          >
            <Table
              cols={["Campaign", "Impr", "Clicks", "Spend"]}
              rows={data.meta.rows.map((r) => [
                r.name,
                r.impressions.toLocaleString(),
                r.clicks.toLocaleString(),
                `$${r.spend.toLocaleString()}`,
              ])}
            />
          </Panel>
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  mode,
  error,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  mode: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4" />
          {title}
        </h2>
        <span
          className={`rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
            mode === "live"
              ? "bg-status-done/15 text-status-done"
              : mode === "error"
                ? "bg-status-blocked/15 text-status-blocked"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {mode}
        </span>
      </div>
      {error && (
        <div className="border-b bg-destructive/5 px-4 py-1.5 text-[11px] text-destructive">
          {error}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

function Table({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {cols.map((c, i) => (
              <th key={c} className={`pb-2 pr-3 ${i > 0 ? "text-right" : ""}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-b-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`py-2 pr-3 ${j === 0 ? "max-w-[280px] truncate font-medium" : "text-right font-mono"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
