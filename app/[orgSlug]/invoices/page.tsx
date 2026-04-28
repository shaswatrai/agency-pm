"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  ArrowRight,
  Download,
  Plus,
  Search,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { InvoiceStatus } from "@/types/domain";

const STATUS_META: Record<
  InvoiceStatus,
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
  paid: {
    label: "Paid",
    cls: "bg-status-done/15 text-status-done",
    dot: "bg-status-done",
  },
  overdue: {
    label: "Overdue",
    cls: "bg-status-blocked/15 text-status-blocked",
    dot: "bg-status-blocked",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

const REFERENCE_DATE = new Date("2026-04-29");

export default function InvoicesPage() {
  const invoices = useStore((s) => s.invoices);
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const orgSlug = useStore((s) => s.organization.slug);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">(
    "all",
  );

  const filtered = invoices.filter((inv) => {
    const matchesQuery =
      query === "" ||
      inv.number.toLowerCase().includes(query.toLowerCase()) ||
      clients
        .find((c) => c.id === inv.clientId)
        ?.name.toLowerCase()
        .includes(query.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || inv.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const summary = useMemo(() => {
    const outstanding = invoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((s, i) => s + (i.total - i.amountPaid), 0);
    const overdueAmount = invoices
      .filter((i) => i.status === "overdue")
      .reduce((s, i) => s + (i.total - i.amountPaid), 0);
    const paidThisMonth = invoices
      .filter(
        (i) =>
          i.status === "paid" &&
          i.paidAt &&
          parseISO(i.paidAt).getMonth() === REFERENCE_DATE.getMonth(),
      )
      .reduce((s, i) => s + i.total, 0);
    const draftCount = invoices.filter((i) => i.status === "draft").length;
    return { outstanding, overdueAmount, paidThisMonth, draftCount };
  }, [invoices]);

  const statusCounts = invoices.reduce<Record<string, number>>(
    (acc, inv) => {
      acc[inv.status] = (acc[inv.status] ?? 0) + 1;
      acc.all = (acc.all ?? 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoices.length} invoices · {summary.draftCount} drafts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="size-4" /> Export
          </Button>
          <Button size="sm" asChild>
            <Link href={`/${orgSlug}/invoices/new`}>
              <Plus className="size-4" /> New invoice
            </Link>
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-lg border bg-card p-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <div className="relative">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Outstanding
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold">
              {formatCurrency(summary.outstanding)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              across sent + overdue
            </p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="relative overflow-hidden rounded-lg border bg-card p-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-status-blocked/10 to-transparent" />
          <div className="relative flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Overdue
              </p>
              <p className="mt-2 font-mono text-3xl font-semibold text-status-blocked">
                {formatCurrency(summary.overdueAmount)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Needs collection follow-up
              </p>
            </div>
            {summary.overdueAmount > 0 ? (
              <AlertCircle className="size-5 text-status-blocked" />
            ) : null}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="relative overflow-hidden rounded-lg border bg-card p-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-status-done/10 to-transparent" />
          <div className="relative">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Paid this month
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold text-status-done">
              {formatCurrency(summary.paidThisMonth)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {format(REFERENCE_DATE, "MMMM yyyy")}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by number or client…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-md border bg-card p-0.5">
          {[
            { value: "all", label: "All" },
            { value: "draft", label: "Draft" },
            { value: "sent", label: "Sent" },
            { value: "paid", label: "Paid" },
            { value: "overdue", label: "Overdue" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value as InvoiceStatus | "all")}
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
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Client / Project</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Issued</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((inv) => {
              const client = clients.find((c) => c.id === inv.clientId);
              const project = projects.find((p) => p.id === inv.projectId);
              const meta = STATUS_META[inv.status];
              const dueDate = parseISO(inv.dueDate);
              const daysOverdue = differenceInDays(REFERENCE_DATE, dueDate);
              return (
                <tr
                  key={inv.id}
                  className="group transition-colors hover:bg-accent"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/${orgSlug}/invoices/${inv.id}`}
                      className="block"
                    >
                      <p className="flex items-center gap-2 text-sm font-semibold group-hover:text-primary">
                        <Receipt className="size-3.5 text-muted-foreground" />
                        {inv.number}
                      </p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium">{client?.name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {project?.name}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground capitalize">
                      {inv.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-xs font-medium",
                        meta.cls,
                      )}
                    >
                      <span
                        className={cn("size-1.5 rounded-full", meta.dot)}
                      />
                      {meta.label}
                    </span>
                    {inv.status === "overdue" && daysOverdue > 0 ? (
                      <p className="mt-0.5 text-[10px] text-status-blocked">
                        {daysOverdue}d overdue
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {format(parseISO(inv.issueDate), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {format(parseISO(inv.dueDate), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-mono text-sm font-semibold">
                      {formatCurrency(inv.total, inv.currency)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${orgSlug}/invoices/${inv.id}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-16 text-center text-sm text-muted-foreground"
                >
                  No invoices match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
