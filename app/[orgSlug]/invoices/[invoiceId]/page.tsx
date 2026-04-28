"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useStore } from "@/lib/db/store";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, initials } from "@/lib/utils";
import { toast } from "sonner";
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

export default function InvoiceDetailPage() {
  const params = useParams<{ invoiceId: string; orgSlug: string }>();
  const invoices = useStore((s) => s.invoices);
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const orgName = useStore((s) => s.organization.name);
  const updateInvoiceStatus = useStore((s) => s.updateInvoiceStatus);

  const inv = invoices.find((i) => i.id === params.invoiceId);
  const client = inv ? clients.find((c) => c.id === inv.clientId) : undefined;
  const project = inv
    ? projects.find((p) => p.id === inv.projectId)
    : undefined;

  if (!inv || !client) {
    return (
      <div className="px-4 py-12 md:px-8 text-center">
        <p className="text-sm text-muted-foreground">Invoice not found.</p>
        <Link
          href={`/${params.orgSlug}/invoices`}
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Back to invoices
        </Link>
      </div>
    );
  }

  const meta = STATUS_META[inv.status];
  const daysOverdue = differenceInDays(REFERENCE_DATE, parseISO(inv.dueDate));

  const handleSend = () => {
    updateInvoiceStatus(inv.id, "sent");
    toast.success(`Sent to ${client.primaryContactEmail ?? client.name}`);
  };
  const handleMarkPaid = () => {
    updateInvoiceStatus(inv.id, "paid");
    toast.success("Marked as paid");
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href={`/${params.orgSlug}/invoices`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> All invoices
        </Link>
        <div className="flex items-center gap-2">
          {inv.status === "draft" ? (
            <Button onClick={handleSend} size="sm">
              <Send className="size-4" /> Send invoice
            </Button>
          ) : null}
          {(inv.status === "sent" || inv.status === "overdue") &&
          inv.amountPaid < inv.total ? (
            <Button onClick={handleMarkPaid} size="sm">
              <CheckCircle2 className="size-4" /> Mark as paid
            </Button>
          ) : null}
          <Button variant="outline" size="sm">
            <Download className="size-4" /> Download PDF
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm"
      >
        {/* Header band */}
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
                  Atelier Studio · Trade & Design
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Invoice
              </p>
              <p className="mt-0.5 font-mono text-2xl font-semibold tracking-tight">
                {inv.number}
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

        {/* Bill-to + dates */}
        <div className="grid grid-cols-1 gap-6 border-t px-8 py-6 sm:grid-cols-3">
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
                  <p className="text-xs text-muted-foreground">
                    {client.primaryContactEmail}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Project
            </p>
            <p className="mt-2 text-sm font-medium">{project?.name}</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {project?.code}
            </p>
            <p className="mt-1 text-xs text-muted-foreground capitalize">
              {inv.type.replace("_", " ")}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Dates
            </p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Issued</span>
                <span>{format(parseISO(inv.issueDate), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Due</span>
                <span
                  className={cn(
                    inv.status === "overdue" && "font-semibold text-status-blocked",
                  )}
                >
                  {format(parseISO(inv.dueDate), "MMM d, yyyy")}
                </span>
              </div>
              {inv.status === "overdue" && daysOverdue > 0 ? (
                <p className="text-[11px] text-status-blocked inline-flex items-center gap-1">
                  <AlertCircle className="size-3" /> {daysOverdue} days overdue
                </p>
              ) : null}
              {inv.paidAt ? (
                <div className="flex justify-between gap-3 text-status-done">
                  <span>Paid</span>
                  <span>{format(parseISO(inv.paidAt), "MMM d, yyyy")}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="border-t">
          <table className="min-w-full">
            <thead>
              <tr className="bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-8 py-3">Description</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-8 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inv.lineItems.map((li) => (
                <tr key={li.id}>
                  <td className="px-8 py-4 text-sm">{li.description}</td>
                  <td className="px-4 py-4 text-right text-sm font-mono">
                    {li.quantity}{" "}
                    <span className="text-xs text-muted-foreground">
                      {li.unit}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-mono text-muted-foreground">
                    {formatCurrency(li.rate, inv.currency)}
                  </td>
                  <td className="px-8 py-4 text-right text-sm font-mono font-medium">
                    {formatCurrency(li.amount, inv.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t bg-muted/20 px-8 py-6">
          <div className="ml-auto max-w-sm space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">
                {formatCurrency(inv.subtotal, inv.currency)}
              </span>
            </div>
            {inv.taxRate > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax ({(inv.taxRate * 100).toFixed(0)}%)
                </span>
                <span className="font-mono">
                  {formatCurrency(inv.taxAmount, inv.currency)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between border-t pt-2 text-base">
              <span className="font-semibold">Total</span>
              <span className="font-mono font-semibold">
                {formatCurrency(inv.total, inv.currency)}
              </span>
            </div>
            {inv.amountPaid > 0 && inv.amountPaid < inv.total ? (
              <div className="flex justify-between text-status-done">
                <span>Paid</span>
                <span className="font-mono">
                  −{formatCurrency(inv.amountPaid, inv.currency)}
                </span>
              </div>
            ) : null}
            {inv.amountPaid < inv.total ? (
              <div className="flex justify-between border-t pt-2 text-lg">
                <span className="font-semibold">Amount due</span>
                <span className="font-mono font-bold">
                  {formatCurrency(
                    inv.total - inv.amountPaid,
                    inv.currency,
                  )}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center pt-2 text-status-done">
                <CheckCircle2 className="size-4 mr-1.5" />
                <span className="font-semibold">Paid in full</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {inv.notes ? (
          <div className="border-t px-8 py-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Notes
            </p>
            <p className="mt-1 text-sm leading-relaxed">{inv.notes}</p>
          </div>
        ) : null}

        {/* Footer */}
        <div className="border-t bg-muted/30 px-8 py-4 text-xs text-muted-foreground">
          Payment terms: Net{" "}
          {differenceInDays(parseISO(inv.dueDate), parseISO(inv.issueDate))}{" "}
          days · Wire transfer, ACH, or credit card · Late fees may apply after
          due date.
        </div>
      </motion.div>
    </div>
  );
}
