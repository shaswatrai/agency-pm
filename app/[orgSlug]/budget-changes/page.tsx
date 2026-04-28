"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  X,
  Clock,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useStore, useCurrentUser } from "@/lib/db/store";
import { cn, formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import type { BudgetChangeStatus } from "@/types/domain";

const STATUS_META: Record<
  BudgetChangeStatus,
  { label: string; cls: string }
> = {
  pending: {
    label: "Pending",
    cls: "bg-status-progress/15 text-status-progress",
  },
  approved: {
    label: "Approved",
    cls: "bg-status-done/15 text-status-done",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-status-blocked/15 text-status-blocked",
  },
};

export default function BudgetChangesPage() {
  const requests = useStore((s) => s.budgetChanges);
  const projects = useStore((s) => s.projects);
  const clients = useStore((s) => s.clients);
  const users = useStore((s) => s.users);
  const orgSlug = useStore((s) => s.organization.slug);
  const review = useStore((s) => s.reviewBudgetChange);
  const currentUser = useCurrentUser();

  const [filter, setFilter] = useState<BudgetChangeStatus | "all">("pending");

  const isAdmin =
    currentUser.role === "admin" ||
    currentUser.role === "super_admin";

  const filtered = requests.filter(
    (r) => filter === "all" || r.status === filter,
  );

  const counts = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    acc.all = (acc.all ?? 0) + 1;
    return acc;
  }, {});

  const handleApprove = (id: string) => {
    review(id, "approved", currentUser.id, "Approved");
    toast.success("Budget change approved · project budget updated");
  };

  const handleReject = (id: string) => {
    const note = prompt("Reason for rejection?") || undefined;
    review(id, "rejected", currentUser.id, note);
    toast.success("Budget change rejected");
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
          <Wallet className="size-6 text-primary" />
          Budget changes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scope-expansion requests across all projects ·{" "}
          {counts.pending ?? 0} pending review
        </p>
      </motion.div>

      <div className="mb-5 flex flex-wrap gap-1 rounded-md border bg-card p-0.5 w-fit">
        {[
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
          { value: "all", label: "All" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as BudgetChangeStatus | "all")}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              filter === tab.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {counts[tab.value] ? (
              <span className="ml-1.5 opacity-60">{counts[tab.value]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing to review"
          description={
            filter === "pending"
              ? "No budget changes are waiting on you."
              : "No requests match this filter."
          }
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((r) => {
              const project = projects.find((p) => p.id === r.projectId);
              const client = project
                ? clients.find((c) => c.id === project.clientId)
                : null;
              const requester = users.find((u) => u.id === r.requestedBy);
              const reviewer = r.reviewedBy
                ? users.find((u) => u.id === r.reviewedBy)
                : null;
              const meta = STATUS_META[r.status];
              const positive = r.delta > 0;
              const currency = client?.currency ?? "USD";

              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 30, transition: { duration: 0.2 } }}
                >
                  <Card className="p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-md",
                          positive
                            ? "bg-status-done/15 text-status-done"
                            : "bg-status-blocked/15 text-status-blocked",
                        )}
                      >
                        {positive ? (
                          <TrendingUp className="size-5" />
                        ) : (
                          <TrendingDown className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <Link
                            href={`/${orgSlug}/projects/${r.projectId}/overview`}
                            className="text-base font-semibold hover:underline"
                          >
                            {project?.name ?? "Project"}
                          </Link>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {project?.code}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {client?.name}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-[11px] font-medium",
                              meta.cls,
                            )}
                          >
                            <span className="size-1.5 rounded-full bg-current" />
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed">
                          {r.reason}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          <span>
                            Requested by{" "}
                            <span className="font-medium text-foreground">
                              {requester?.fullName ?? "—"}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" />
                            {format(parseISO(r.createdAt), "MMM d, h:mm a")}
                          </span>
                          {reviewer && r.reviewedAt ? (
                            <span>
                              Reviewed by{" "}
                              <span className="font-medium text-foreground">
                                {reviewer.fullName}
                              </span>{" "}
                              ·{" "}
                              {format(
                                parseISO(r.reviewedAt),
                                "MMM d, h:mm a",
                              )}
                            </span>
                          ) : null}
                        </div>
                        {r.reviewNote && r.status !== "pending" ? (
                          <p className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs italic text-muted-foreground">
                            "{r.reviewNote}"
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "font-mono text-lg font-semibold",
                            positive
                              ? "text-status-done"
                              : "text-status-blocked",
                          )}
                        >
                          {positive ? "+" : ""}
                          {formatCurrency(r.delta, currency)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {project?.totalBudget
                            ? `${formatCurrency(project.totalBudget, currency)} current`
                            : ""}
                        </p>
                      </div>
                    </div>

                    {r.status === "pending" && isAdmin ? (
                      <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(r.id)}
                        >
                          <X className="size-3.5" /> Reject
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(r.id)}>
                          <CheckCircle2 className="size-3.5" /> Approve &
                          apply
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
