"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSignature,
  Mail,
  Send,
  Sparkles,
  X,
  Layers,
  Wand2,
} from "lucide-react";
import { useStore } from "@/lib/db/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { initials, cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
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

export default function QuoteDetailPage() {
  const params = useParams<{ quoteId: string; orgSlug: string }>();
  const router = useRouter();
  const quotes = useStore((s) => s.quotes);
  const clients = useStore((s) => s.clients);
  const orgName = useStore((s) => s.organization.name);
  const updateQuoteStatus = useStore((s) => s.updateQuoteStatus);
  const setCurrentQuoteVersion = useStore((s) => s.setCurrentQuoteVersion);
  const convertQuoteToProject = useStore((s) => s.convertQuoteToProject);

  const quote = quotes.find((q) => q.id === params.quoteId);
  const client = quote ? clients.find((c) => c.id === quote.clientId) : null;
  const version = quote
    ? quote.versions.find((v) => v.id === quote.currentVersionId) ??
      quote.versions[quote.versions.length - 1]
    : null;

  if (!quote || !client || !version) {
    return (
      <div className="px-4 py-12 md:px-8 text-center">
        <p className="text-sm text-muted-foreground">Quote not found.</p>
        <Link
          href={`/${params.orgSlug}/quotes`}
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Back to quotes
        </Link>
      </div>
    );
  }

  const meta = STATUS_META[quote.status];
  const margin = version.subtotal - version.internalCost;
  const marginPct = version.subtotal > 0 ? (margin / version.subtotal) * 100 : 0;

  // Group line items by category for the body
  const categories = Array.from(
    new Set(version.lineItems.map((l) => l.category)),
  );

  const handleSend = () => {
    updateQuoteStatus(quote.id, "sent");
    toast.success(`Quote sent to ${client.name}`);
  };
  const handleAccept = () => {
    updateQuoteStatus(quote.id, "accepted");
    toast.success("Marked accepted by client");
  };
  const handleReject = () => {
    updateQuoteStatus(quote.id, "rejected");
    toast.success("Marked rejected");
  };
  const handleConvert = () => {
    const project = convertQuoteToProject(quote.id);
    if (project) {
      toast.success(`Converted to ${project.code}`, {
        description: `${categories.length} phases · ${version.lineItems.length} tasks`,
      });
      router.push(`/${params.orgSlug}/projects/${project.id}/overview`);
    }
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/${params.orgSlug}/quotes`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> All quotes
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {quote.status === "draft" ? (
            <Button onClick={handleSend} size="sm">
              <Send className="size-4" /> Send to client
            </Button>
          ) : null}
          {quote.status === "sent" ? (
            <>
              <Button onClick={handleAccept} size="sm">
                <CheckCircle2 className="size-4" /> Mark accepted
              </Button>
              <Button onClick={handleReject} size="sm" variant="outline">
                <X className="size-4" /> Mark rejected
              </Button>
            </>
          ) : null}
          {quote.status === "accepted" && !quote.convertedToProjectId ? (
            <Button onClick={handleConvert} size="sm">
              <Wand2 className="size-4" /> Convert to project
            </Button>
          ) : null}
          {quote.convertedToProjectId ? (
            <Button asChild size="sm" variant="outline">
              <Link
                href={`/${params.orgSlug}/projects/${quote.convertedToProjectId}/overview`}
              >
                Open project <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]"
      >
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent" />
            <div className="relative flex flex-col gap-6 p-8 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground shadow-md">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    From
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tracking-tight">
                    {orgName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Quote · valid until{" "}
                    {format(parseISO(quote.validUntil), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Quote
                </p>
                <p className="mt-0.5 font-mono text-2xl font-semibold tracking-tight">
                  {quote.number}
                </p>
                <span
                  className={cn(
                    "mt-2 inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-xs font-medium",
                    meta.cls,
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", meta.dot)} />
                  {meta.label}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 border-t px-8 py-6 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Bill to
              </p>
              <div className="mt-2 flex items-start gap-3">
                <div
                  className="grid size-9 shrink-0 place-items-center rounded-md text-xs font-semibold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(220, 80%, 60%), hsl(260, 70%, 50%))",
                  }}
                >
                  {initials(client.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{client.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {client.primaryContactName ?? "—"}
                  </p>
                  {client.primaryContactEmail ? (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="size-3" />
                      {client.primaryContactEmail}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Engagement
              </p>
              <p className="mt-2 text-sm font-semibold">{quote.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {quote.type.replace("_", " ")}
              </p>
              {quote.description ? (
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                  {quote.description}
                </p>
              ) : null}
            </div>
          </div>

          {/* Line items grouped by category */}
          <div className="border-t">
            {categories.map((cat) => {
              const items = version.lineItems.filter((l) => l.category === cat);
              const subtotal = items.reduce((s, l) => s + l.amount, 0);
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-8 py-2 text-[11px] uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                      <Layers className="size-3" /> {cat}
                    </span>
                    <span className="font-mono text-foreground">
                      {formatCurrency(subtotal, quote.currency)}
                    </span>
                  </div>
                  {items.map((line) => (
                    <div
                      key={line.id}
                      className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b px-8 py-3 text-sm last:border-b-0"
                    >
                      <span>{line.description}</span>
                      <span className="text-right font-mono text-xs text-muted-foreground">
                        {line.quantity} {line.unit}
                      </span>
                      <span className="text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(line.rate, quote.currency)}
                      </span>
                      <span className="text-right font-mono text-sm font-medium">
                        {formatCurrency(line.amount, quote.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t bg-muted/20 px-8 py-6">
            <div className="ml-auto max-w-sm space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">
                  {formatCurrency(version.subtotal, quote.currency)}
                </span>
              </div>
              {version.taxRate > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({(version.taxRate * 100).toFixed(0)}%)
                  </span>
                  <span className="font-mono">
                    {formatCurrency(version.taxAmount, quote.currency)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between border-t pt-2 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-mono font-bold">
                  {formatCurrency(version.total, quote.currency)}
                </span>
              </div>
            </div>
          </div>

          {version.notes ? (
            <div className="border-t px-8 py-5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Notes
              </p>
              <p className="mt-1 text-sm leading-relaxed">{version.notes}</p>
            </div>
          ) : null}
        </div>

        {/* Right rail */}
        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          {/* Margin */}
          <Card className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Internal margin
            </p>
            <p
              className={cn(
                "mt-2 font-mono text-3xl font-semibold",
                marginPct >= 35
                  ? "text-status-done"
                  : marginPct >= 20
                    ? "text-foreground"
                    : "text-status-blocked",
              )}
            >
              {marginPct.toFixed(1)}%
            </p>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bill rate</span>
                <span className="font-mono">
                  {formatCurrency(version.subtotal, quote.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost rate</span>
                <span className="font-mono">
                  −{formatCurrency(version.internalCost, quote.currency)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1.5 font-medium">
                <span>Gross margin</span>
                <span className="font-mono">
                  {formatCurrency(margin, quote.currency)}
                </span>
              </div>
            </div>
          </Card>

          {/* Version timeline */}
          <Card className="p-5">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Version history
            </p>
            <ol className="relative space-y-3 pl-6 before:absolute before:left-[10px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-border">
              {quote.versions.map((v) => {
                const isCurrent = v.id === quote.currentVersionId;
                return (
                  <li key={v.id} className="relative">
                    <span
                      className={cn(
                        "absolute -left-6 grid size-5 place-items-center rounded-full ring-4 ring-background text-[10px] font-mono",
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : v.status === "superseded"
                            ? "bg-muted text-muted-foreground"
                            : "bg-status-progress/15 text-status-progress",
                      )}
                    >
                      v{v.versionNumber}
                    </span>
                    <button
                      onClick={() => setCurrentQuoteVersion(quote.id, v.id)}
                      className={cn(
                        "block w-full text-left rounded-md px-2 py-1.5 transition-colors",
                        isCurrent ? "bg-primary/5" : "hover:bg-accent",
                      )}
                    >
                      <p className="text-sm font-medium">
                        Version {v.versionNumber}
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {v.status}
                        </span>
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground">
                        {formatCurrency(v.total, quote.currency)} ·{" "}
                        {format(parseISO(v.createdAt), "MMM d")}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ol>
          </Card>

          {/* Quick stats */}
          <Card className="p-5">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              At a glance
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Stat
                label="Phases"
                value={String(categories.length)}
              />
              <Stat
                label="Line items"
                value={String(version.lineItems.length)}
              />
              <Stat
                label="Total"
                value={formatCurrency(version.total, quote.currency)}
              />
              <Stat
                label="Margin"
                value={`${marginPct.toFixed(0)}%`}
                tint={
                  marginPct >= 35
                    ? "text-status-done"
                    : marginPct >= 20
                      ? ""
                      : "text-status-blocked"
                }
              />
            </div>
          </Card>
        </aside>
      </motion.div>
    </div>
  );
}

function Stat({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-0.5 font-mono text-base font-semibold", tint)}>
        {value}
      </p>
    </div>
  );
}
