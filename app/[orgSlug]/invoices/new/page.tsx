"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import { ArrowLeft, Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/db/store";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { InvoiceLineItem, InvoiceType } from "@/types/domain";

const TYPE_OPTIONS: {
  value: InvoiceType;
  label: string;
  description: string;
}[] = [
  {
    value: "milestone",
    label: "Milestone",
    description: "One or more milestone deliverables at fixed amounts",
  },
  {
    value: "time_materials",
    label: "Time & Materials",
    description: "Hourly entries grouped by role with rate cards",
  },
  {
    value: "retainer",
    label: "Retainer",
    description: "Recurring monthly fee + overage hours",
  },
  {
    value: "fixed_installment",
    label: "Fixed installment",
    description: "Percentage of total project value",
  },
  {
    value: "expense",
    label: "Expense reimbursement",
    description: "Itemized expenses with receipts",
  },
];

const REFERENCE_DATE = new Date("2026-04-29");

export default function NewInvoicePage() {
  const router = useRouter();
  const params = useParams<{ orgSlug: string }>();
  const projects = useStore((s) => s.projects);
  const clients = useStore((s) => s.clients);
  const tasks = useStore((s) => s.tasks);
  const timeEntries = useStore((s) => s.timeEntries);
  const addInvoice = useStore((s) => s.addInvoice);
  const invoices = useStore((s) => s.invoices);

  const [type, setType] = useState<InvoiceType>("milestone");
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");
  const [issueDate, setIssueDate] = useState(
    format(REFERENCE_DATE, "yyyy-MM-dd"),
  );
  const [dueDate, setDueDate] = useState(
    format(addDays(REFERENCE_DATE, 30), "yyyy-MM-dd"),
  );
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      id: "li_new_1",
      description: "",
      quantity: 1,
      unit: "fixed",
      rate: 0,
      amount: 0,
    },
  ]);

  const project = projects.find((p) => p.id === projectId);
  const client = project ? clients.find((c) => c.id === project.clientId) : null;

  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const updateLine = (id: string, patch: Partial<InvoiceLineItem>) => {
    setLineItems((items) =>
      items.map((li) => {
        if (li.id !== id) return li;
        const next = { ...li, ...patch };
        next.amount = next.quantity * next.rate;
        return next;
      }),
    );
  };

  const addLine = () => {
    setLineItems((items) => [
      ...items,
      {
        id: `li_new_${items.length + 1}`,
        description: "",
        quantity: 1,
        unit: type === "time_materials" ? "hours" : "fixed",
        rate: 0,
        amount: 0,
      },
    ]);
  };

  const removeLine = (id: string) => {
    setLineItems((items) =>
      items.length > 1 ? items.filter((li) => li.id !== id) : items,
    );
  };

  // "Pre-fill from project" — auto-populate based on type
  const prefillFromProject = () => {
    if (!project) return;
    if (type === "time_materials") {
      const projectTaskIds = new Set(
        tasks.filter((t) => t.projectId === project.id).map((t) => t.id),
      );
      const entries = timeEntries.filter((e) =>
        projectTaskIds.has(e.taskId) && e.billable,
      );
      // Group by user
      const byUser: Record<string, number> = {};
      for (const e of entries) {
        byUser[e.userId] = (byUser[e.userId] ?? 0) + e.durationMinutes;
      }
      const lines: InvoiceLineItem[] = Object.entries(byUser).map(
        ([userId, mins], idx) => ({
          id: `li_new_${idx + 1}`,
          description: `Time & materials — ${userId.replace("u_", "").replace(/^./, (c) => c.toUpperCase())}`,
          quantity: Math.round((mins / 60) * 10) / 10,
          unit: "hours" as const,
          rate: 165,
          amount: Math.round(((mins / 60) * 165) * 100) / 100,
        }),
      );
      setLineItems(
        lines.length > 0
          ? lines
          : [
              {
                id: "li_new_1",
                description: "Time & materials — period",
                quantity: 0,
                unit: "hours",
                rate: 165,
                amount: 0,
              },
            ],
      );
    } else if (type === "milestone") {
      const half = Math.round((project.totalBudget ?? 0) * 0.4);
      setLineItems([
        {
          id: "li_new_1",
          description: `${project.name} — milestone deliverable`,
          quantity: 1,
          unit: "milestone",
          rate: half,
          amount: half,
        },
      ]);
    } else if (type === "retainer") {
      setLineItems([
        {
          id: "li_new_1",
          description: `${project.name} — monthly retainer`,
          quantity: 1,
          unit: "month",
          rate: project.totalBudget ?? 6000,
          amount: project.totalBudget ?? 6000,
        },
      ]);
    } else if (type === "fixed_installment") {
      const installment = Math.round((project.totalBudget ?? 0) * 0.5);
      setLineItems([
        {
          id: "li_new_1",
          description: `${project.name} — 50% installment`,
          quantity: 1,
          unit: "fixed",
          rate: installment,
          amount: installment,
        },
      ]);
    }
    toast.success("Pre-filled from project", {
      description: "Review and adjust line items as needed.",
    });
  };

  const handleSave = (status: "draft" | "sent") => {
    if (!project || !client) {
      toast.error("Pick a project first");
      return;
    }
    if (lineItems.some((li) => !li.description.trim())) {
      toast.error("Every line item needs a description");
      return;
    }
    const inv = addInvoice({
      projectId: project.id,
      clientId: client.id,
      number: `INV-2026-${String(31 + invoices.length).padStart(4, "0")}`,
      type,
      status,
      issueDate,
      dueDate,
      sentAt: status === "sent" ? new Date().toISOString() : undefined,
      currency: client.currency,
      notes,
      taxRate,
      amountPaid: 0,
      lineItems,
    });
    toast.success(
      status === "sent" ? `Invoice sent to ${client.name}` : "Invoice saved as draft",
    );
    router.push(`/${params.orgSlug}/invoices/${inv.id}`);
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-6xl mx-auto">
      <Link
        href={`/${params.orgSlug}/invoices`}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> All invoices
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            New invoice
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build an invoice from a project. Pre-fill from time entries or
            milestone scope.
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
          {/* Type selector */}
          <section>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Invoice type
            </Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={cn(
                    "rounded-md border p-3 text-left transition-all",
                    type === opt.value
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                      : "hover:bg-accent",
                  )}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {opt.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Project + dates */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="project"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                Project
              </Label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {projects.map((p) => {
                  const c = clients.find((x) => x.id === p.clientId);
                  return (
                    <option key={p.id} value={p.id}>
                      {c?.name} · {p.name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="issue"
                  className="text-[11px] uppercase tracking-wider text-muted-foreground"
                >
                  Issue date
                </Label>
                <Input
                  id="issue"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label
                  htmlFor="due"
                  className="text-[11px] uppercase tracking-wider text-muted-foreground"
                >
                  Due date
                </Label>
                <Input
                  id="due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </section>

          {/* Pre-fill button */}
          <section>
            <button
              onClick={prefillFromProject}
              className="inline-flex items-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Wand2 className="size-3.5" />
              Pre-fill line items from project
            </button>
          </section>

          {/* Line items */}
          <section>
            <div className="flex items-center justify-between">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Line items
              </Label>
              <Button variant="ghost" size="sm" onClick={addLine}>
                <Plus className="size-3" /> Add line
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {lineItems.map((li) => (
                <motion.div
                  key={li.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-[1fr_80px_70px_120px_100px_36px] gap-2 rounded-md border bg-card p-2"
                >
                  <Input
                    placeholder="Description"
                    value={li.description}
                    onChange={(e) =>
                      updateLine(li.id, { description: e.target.value })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={li.quantity || ""}
                    onChange={(e) =>
                      updateLine(li.id, { quantity: Number(e.target.value) })
                    }
                    className="text-right font-mono"
                  />
                  <select
                    value={li.unit}
                    onChange={(e) =>
                      updateLine(li.id, { unit: e.target.value as InvoiceLineItem["unit"] })
                    }
                    className="rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="hours">hours</option>
                    <option value="fixed">fixed</option>
                    <option value="milestone">milestone</option>
                    <option value="month">month</option>
                  </select>
                  <Input
                    type="number"
                    placeholder="Rate"
                    value={li.rate || ""}
                    onChange={(e) =>
                      updateLine(li.id, { rate: Number(e.target.value) })
                    }
                    className="text-right font-mono"
                  />
                  <div className="flex items-center justify-end pr-2 text-sm font-mono font-medium">
                    {formatCurrency(li.amount, client?.currency)}
                  </div>
                  <button
                    onClick={() => removeLine(li.id)}
                    className="grid place-items-center text-muted-foreground hover:text-status-blocked"
                    aria-label="Remove line"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Notes */}
          <section>
            <Label
              htmlFor="notes"
              className="text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              Notes (visible to client)
            </Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment instructions, milestone reference, etc."
              rows={3}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </section>
        </div>

        {/* Live summary */}
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
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {project?.code ?? "—"}
            </p>

            <div className="mt-4 space-y-1 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">
                  {formatCurrency(subtotal, client?.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="tax"
                  className="text-xs text-muted-foreground"
                >
                  Tax %
                </Label>
                <input
                  id="tax"
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="h-7 w-20 rounded border bg-background px-2 text-right font-mono text-sm"
                />
              </div>
              {taxAmount > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({(taxRate * 100).toFixed(0)}%)
                  </span>
                  <span className="font-mono">
                    {formatCurrency(taxAmount, client?.currency)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between border-t pt-2 text-base">
                <span className="font-semibold">Total</span>
                <motion.span
                  key={total}
                  initial={{ scale: 1.05, color: "hsl(var(--primary))" }}
                  animate={{
                    scale: 1,
                    color: "hsl(var(--foreground))",
                  }}
                  transition={{ duration: 0.4 }}
                  className="font-mono font-bold"
                >
                  {formatCurrency(total, client?.currency)}
                </motion.span>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <Button onClick={() => handleSave("sent")}>
                Save & send
              </Button>
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
