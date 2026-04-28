"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { addDays, format } from "date-fns";
import { ArrowLeft, Plus, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore, useCurrentUser } from "@/lib/db/store";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { ProjectType, QuoteLineItem } from "@/types/domain";

const REFERENCE_DATE = new Date("2026-04-29");

const TYPES: { value: ProjectType; label: string }[] = [
  { value: "web_dev", label: "Web development" },
  { value: "app_dev", label: "App development" },
  { value: "digital_marketing", label: "Digital marketing" },
  { value: "branding", label: "Branding" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

const DEFAULT_CATEGORIES: Record<ProjectType, string[]> = {
  web_dev: ["Discovery", "Design", "Development", "Launch & QA"],
  app_dev: ["Discovery", "Design", "Engineering", "QA & Beta"],
  digital_marketing: ["Audit", "Strategy", "Execution", "Reporting"],
  branding: ["Discovery", "Identity", "System", "Delivery"],
  maintenance: ["Triage", "Implementation"],
  other: ["Phase 1", "Phase 2"],
};

export default function NewQuotePage() {
  const router = useRouter();
  const params = useParams<{ orgSlug: string }>();
  const clients = useStore((s) => s.clients);
  const quotes = useStore((s) => s.quotes);
  const addQuote = useStore((s) => s.addQuote);
  const currentUser = useCurrentUser();

  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("web_dev");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [validUntil, setValidUntil] = useState(
    format(addDays(REFERENCE_DATE, 30), "yyyy-MM-dd"),
  );
  const [taxRate, setTaxRate] = useState(0.05);
  const [notes, setNotes] = useState("");

  const client = clients.find((c) => c.id === clientId);
  const currency = client?.currency ?? "USD";

  const [lines, setLines] = useState<QuoteLineItem[]>(() =>
    DEFAULT_CATEGORIES.web_dev.map((cat, i) => ({
      id: `nl_${i}`,
      category: cat,
      description: "",
      quantity: 1,
      unit: "milestone" as const,
      rate: 0,
      costRate: 0,
      amount: 0,
    })),
  );

  const handleTypeChange = (t: ProjectType) => {
    setType(t);
    setLines(
      DEFAULT_CATEGORIES[t].map((cat, i) => ({
        id: `nl_${Date.now()}_${i}`,
        category: cat,
        description: "",
        quantity: 1,
        unit: "milestone" as const,
        rate: 0,
        costRate: 0,
        amount: 0,
      })),
    );
  };

  const updateLine = (id: string, patch: Partial<QuoteLineItem>) => {
    setLines((items) =>
      items.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        next.amount = next.quantity * next.rate;
        return next;
      }),
    );
  };

  const addLine = (category?: string) => {
    setLines((items) => [
      ...items,
      {
        id: `nl_${Date.now()}`,
        category: category ?? items[items.length - 1]?.category ?? "Phase",
        description: "",
        quantity: 1,
        unit: "milestone",
        rate: 0,
        costRate: 0,
        amount: 0,
      },
    ]);
  };

  const removeLine = (id: string) => {
    setLines((items) =>
      items.length > 1 ? items.filter((l) => l.id !== id) : items,
    );
  };

  const summary = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    const internalCost = lines.reduce(
      (s, l) => s + l.quantity * l.costRate,
      0,
    );
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    const margin = subtotal - internalCost;
    const marginPct = subtotal > 0 ? (margin / subtotal) * 100 : 0;
    return { subtotal, internalCost, tax, total, margin, marginPct };
  }, [lines, taxRate]);

  const categoriesInOrder = Array.from(new Set(lines.map((l) => l.category)));

  const handleSave = (status: "draft" | "sent") => {
    if (!name.trim()) return toast.error("Name your quote");
    if (!clientId) return toast.error("Pick a client");
    if (lines.some((l) => !l.description.trim()))
      return toast.error("Every line item needs a description");

    const versionId = `qv_new_${Date.now()}`;
    const version = {
      id: versionId,
      versionNumber: 1,
      status:
        status === "draft" ? ("draft" as const) : ("sent" as const),
      lineItems: lines,
      notes: notes || undefined,
      subtotal: summary.subtotal,
      internalCost: summary.internalCost,
      taxRate,
      taxAmount: summary.tax,
      total: summary.total,
      createdAt: new Date().toISOString(),
      sentAt: status === "sent" ? new Date().toISOString() : undefined,
    };
    const num = `Q-2026-${String(31 + quotes.length).padStart(4, "0")}`;
    const created = addQuote({
      number: num,
      clientId,
      name: name.trim(),
      type,
      description: undefined,
      status,
      currency,
      validUntil,
      currentVersionId: versionId,
      versions: [version],
      createdBy: currentUser.id,
    });
    toast.success(
      status === "sent" ? `Sent ${created.number}` : `Saved ${created.number} as draft`,
    );
    router.push(`/${params.orgSlug}/quotes/${created.id}`);
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-6xl mx-auto">
      <Link
        href={`/${params.orgSlug}/quotes`}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> All quotes
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            New quote
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build line items by category. Margin updates live as you adjust
            cost rates.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave("draft")}>
            Save as draft
          </Button>
          <Button onClick={() => handleSave("sent")}>Save & send</Button>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Basics */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="qn">Quote name</Label>
              <Input
                id="qn"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lumière flagship website rebuild"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="qc">Client</Label>
              <select
                id="qc"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.currency})
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="qt">Type</Label>
              <select
                id="qt"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as ProjectType)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Switching type pre-fills default phase categories.
              </p>
            </div>
            <div>
              <Label htmlFor="qv">Valid until</Label>
              <Input
                id="qv"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </section>

          {/* Line items grouped by category */}
          <section>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Line items
            </Label>
            <div className="mt-2 space-y-4">
              {categoriesInOrder.map((cat) => {
                const items = lines.filter((l) => l.category === cat);
                return (
                  <div key={cat} className="rounded-lg border bg-card">
                    <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                      <input
                        value={cat}
                        onChange={(e) => {
                          const newCat = e.target.value;
                          setLines((arr) =>
                            arr.map((l) =>
                              l.category === cat
                                ? { ...l, category: newCat }
                                : l,
                            ),
                          );
                        }}
                        className="bg-transparent text-xs font-semibold uppercase tracking-wider text-muted-foreground focus:outline-none"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addLine(cat)}
                      >
                        <Plus className="size-3" /> Add line
                      </Button>
                    </div>
                    <div>
                      {items.map((line) => {
                        const lineMargin =
                          (line.rate - line.costRate) * line.quantity;
                        const lineMarginPct =
                          line.rate > 0
                            ? ((line.rate - line.costRate) / line.rate) * 100
                            : 0;
                        return (
                          <div
                            key={line.id}
                            className="grid grid-cols-[1fr_60px_80px_90px_90px_110px_36px] items-center gap-2 border-b px-3 py-2 last:border-b-0"
                          >
                            <Input
                              placeholder="Description"
                              value={line.description}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  description: e.target.value,
                                })
                              }
                              className="text-sm"
                            />
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={line.quantity || ""}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  quantity: Number(e.target.value),
                                })
                              }
                              className="text-right font-mono"
                            />
                            <select
                              value={line.unit}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  unit: e.target.value as QuoteLineItem["unit"],
                                })
                              }
                              className="rounded-md border bg-background px-2 text-xs h-9"
                            >
                              <option value="milestone">milestone</option>
                              <option value="hours">hours</option>
                              <option value="fixed">fixed</option>
                              <option value="month">month</option>
                            </select>
                            <Input
                              type="number"
                              placeholder="Bill rate"
                              value={line.rate || ""}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  rate: Number(e.target.value),
                                })
                              }
                              className="text-right font-mono"
                              title="Bill rate (what client pays)"
                            />
                            <Input
                              type="number"
                              placeholder="Cost"
                              value={line.costRate || ""}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  costRate: Number(e.target.value),
                                })
                              }
                              className="text-right font-mono text-muted-foreground"
                              title="Internal cost rate"
                            />
                            <div className="text-right">
                              <p className="font-mono text-sm font-medium">
                                {formatCurrency(line.amount, currency)}
                              </p>
                              <p
                                className={cn(
                                  "text-[10px] font-mono",
                                  lineMarginPct >= 35
                                    ? "text-status-done"
                                    : lineMarginPct >= 20
                                      ? "text-muted-foreground"
                                      : "text-status-blocked",
                                )}
                              >
                                {lineMarginPct.toFixed(0)}% (
                                {formatCurrency(lineMargin, currency)})
                              </p>
                            </div>
                            <button
                              onClick={() => removeLine(line.id)}
                              className="grid place-items-center text-muted-foreground hover:text-status-blocked"
                              aria-label="Remove line"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_60px_80px_90px_90px_110px_36px] gap-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span>Unit</span>
              <span className="text-right">Bill</span>
              <span className="text-right">Cost</span>
              <span className="text-right">Total · Margin</span>
              <span></span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                addLine(`Phase ${categoriesInOrder.length + 1}`)
              }
              className="mt-3"
            >
              <Plus className="size-4" /> Add new category
            </Button>
          </section>

          <section>
            <Label htmlFor="qnotes">Notes (visible to client)</Label>
            <textarea
              id="qnotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, exclusions, assumptions…"
              rows={3}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </section>
        </div>

        {/* Live margin sidebar */}
        <aside className="lg:sticky lg:top-4 self-start">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border bg-card p-5"
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Live preview
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {client?.name ?? "—"}
            </p>

            <div className="mt-4 space-y-1 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">
                  {formatCurrency(summary.subtotal, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="qtax" className="text-xs text-muted-foreground">
                  Tax %
                </Label>
                <input
                  id="qtax"
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="h-7 w-20 rounded border bg-background px-2 text-right font-mono text-sm"
                />
              </div>
              {summary.tax > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({(taxRate * 100).toFixed(0)}%)
                  </span>
                  <span className="font-mono">
                    {formatCurrency(summary.tax, currency)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between border-t pt-2 text-base">
                <span className="font-semibold">Total</span>
                <motion.span
                  key={summary.total}
                  initial={{ scale: 1.05, color: "hsl(var(--primary))" }}
                  animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                  transition={{ duration: 0.4 }}
                  className="font-mono font-bold"
                >
                  {formatCurrency(summary.total, currency)}
                </motion.span>
              </div>
            </div>

            <div
              className={cn(
                "mt-4 rounded-md border p-3 text-xs",
                summary.marginPct >= 35
                  ? "border-status-done/30 bg-status-done/5 text-status-done"
                  : summary.marginPct >= 20
                    ? "border-border bg-muted/30 text-foreground"
                    : "border-status-blocked/30 bg-status-blocked/5 text-status-blocked",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider">
                  <TrendingUp className="size-3" /> Gross margin
                </p>
                <p className="font-mono text-base font-semibold">
                  {summary.marginPct.toFixed(1)}%
                </p>
              </div>
              <div className="mt-2 space-y-0.5 text-[11px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Internal cost</span>
                  <span className="font-mono">
                    {formatCurrency(summary.internalCost, currency)}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Margin</span>
                  <span className="font-mono">
                    {formatCurrency(summary.margin, currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <Button onClick={() => handleSave("sent")}>Save & send</Button>
              <Button variant="outline" onClick={() => handleSave("draft")}>
                Save as draft
              </Button>
            </div>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}
