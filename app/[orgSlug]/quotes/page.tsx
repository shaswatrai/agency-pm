"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  ArrowRight,
  FileSignature,
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/db/store";
import { cn, formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import type { QuoteStatus } from "@/types/domain";

const STATUS_META: Record<
  QuoteStatus,
  { label: string; cls: string; dot: string }
> = {
  draft: {
    label: "Draft",
    cls: "bg-status-todo/15 text-status-todo",
    dot: "bg-status-todo",
  },
  sent: {
    label: "Sent",
    cls: "bg-status-progress/15 text-status-progress",
    dot: "bg-status-progress",
  },
  accepted: {
    label: "Accepted",
    cls: "bg-status-done/15 text-status-done",
    dot: "bg-status-done",
  },
  converted: {
    label: "Converted",
    cls: "bg-primary/15 text-primary",
    dot: "bg-primary",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-status-blocked/15 text-status-blocked",
    dot: "bg-status-blocked",
  },
  expired: {
    label: "Expired",
    cls: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export default function QuotesPage() {
  const quotes = useStore((s) => s.quotes);
  const clients = useStore((s) => s.clients);
  const orgSlug = useStore((s) => s.organization.slug);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">(
    "all",
  );

  const filtered = quotes.filter((q) => {
    const matchesQuery =
      query === "" ||
      q.number.toLowerCase().includes(query.toLowerCase()) ||
      q.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || q.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const summary = useMemo(() => {
    const outstanding = quotes
      .filter((q) => q.status === "sent")
      .reduce((s, q) => {
        const v = q.versions.find((vv) => vv.id === q.currentVersionId);
        return s + (v?.total ?? 0);
      }, 0);
    const accepted = quotes
      .filter((q) => q.status === "accepted" || q.status === "converted")
      .reduce((s, q) => {
        const v = q.versions.find((vv) => vv.id === q.currentVersionId);
        return s + (v?.total ?? 0);
      }, 0);
    const drafts = quotes.filter((q) => q.status === "draft").length;
    const sentCount = quotes.filter((q) => q.status === "sent").length;
    const totalMargin = quotes.reduce((s, q) => {
      const v = q.versions.find((vv) => vv.id === q.currentVersionId);
      if (!v) return s;
      return s + (v.subtotal - v.internalCost);
    }, 0);
    const totalRevenue = quotes.reduce((s, q) => {
      const v = q.versions.find((vv) => vv.id === q.currentVersionId);
      return s + (v?.subtotal ?? 0);
    }, 0);
    const avgMarginPct =
      totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    return { outstanding, accepted, drafts, sentCount, avgMarginPct };
  }, [quotes]);

  const statusCounts = quotes.reduce<Record<string, number>>((acc, q) => {
    acc[q.status] = (acc[q.status] ?? 0) + 1;
    acc.all = (acc.all ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Quotes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {quotes.length} estimates · {summary.drafts} drafts ·{" "}
            {summary.sentCount} awaiting client decision
          </p>
        </div>
        <Button asChild>
          <Link href={`/${orgSlug}/quotes/new`}>
            <Plus className="size-4" /> New quote
          </Link>
        </Button>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Out for review"
          value={formatCurrency(summary.outstanding)}
          hint={`${summary.sentCount} awaiting client decision`}
          accent="from-status-progress/10"
        />
        <SummaryCard
          label="Won (accepted)"
          value={formatCurrency(summary.accepted)}
          hint="Accepted + converted to project"
          accent="from-status-done/10"
        />
        <SummaryCard
          label="Avg gross margin"
          value={`${summary.avgMarginPct.toFixed(1)}%`}
          hint="Bill rate − cost rate, weighted"
          accent="from-primary/10"
          icon={TrendingUp}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by number or name…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-md border bg-card p-0.5">
          {[
            { value: "all", label: "All" },
            { value: "draft", label: "Draft" },
            { value: "sent", label: "Sent" },
            { value: "accepted", label: "Accepted" },
            { value: "converted", label: "Converted" },
            { value: "rejected", label: "Rejected" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value as QuoteStatus | "all")}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === tab.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {statusCounts[tab.value] ? (
                <span className="ml-1.5 opacity-60">
                  {statusCounts[tab.value]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border bg-card">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/40">
            <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2">Quote</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Version</th>
              <th className="px-4 py-2">Sent / Created</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Margin</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((q) => {
              const client = clients.find((c) => c.id === q.clientId);
              const v = q.versions.find(
                (vv) => vv.id === q.currentVersionId,
              );
              const meta = STATUS_META[q.status];
              const margin = v ? v.subtotal - v.internalCost : 0;
              const marginPct = v && v.subtotal > 0 ? (margin / v.subtotal) * 100 : 0;
              return (
                <tr key={q.id} className="group transition-colors hover:bg-accent">
                  <td className="px-4 py-3">
                    <Link
                      href={`/${orgSlug}/quotes/${q.id}`}
                      className="block"
                    >
                      <p className="flex items-center gap-2 text-sm font-semibold group-hover:text-primary">
                        <FileSignature className="size-3.5 text-muted-foreground" />
                        {q.number}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                        {q.name}
                      </p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{client?.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-xs font-medium",
                        meta.cls,
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", meta.dot)} />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {q.versions.length > 1 ? (
                      <span className="font-mono">v{v?.versionNumber}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {v?.sentAt
                      ? format(parseISO(v.sentAt), "MMM d, yyyy")
                      : format(parseISO(q.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-mono text-sm font-semibold">
                      {v ? formatCurrency(v.total, q.currency) : "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p
                      className={cn(
                        "font-mono text-xs",
                        marginPct >= 35
                          ? "text-status-done"
                          : marginPct >= 20
                            ? "text-foreground"
                            : "text-status-blocked",
                      )}
                    >
                      {marginPct.toFixed(1)}%
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${orgSlug}/quotes/${q.id}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            title="No quotes match"
            description={
              query
                ? `Nothing matches "${query}".`
                : "Try a different status filter or draft a new quote."
            }
            variant="inline"
          />
        ) : null}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-lg border bg-card p-5"
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent",
          accent,
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold">{value}</p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
      </div>
    </motion.div>
  );
}
