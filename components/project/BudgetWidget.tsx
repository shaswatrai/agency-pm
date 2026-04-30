"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { useStore } from "@/lib/db/store";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RequestBudgetChangeDialog } from "@/components/dialogs/RequestBudgetChangeDialog";
import { BudgetBurnPanel } from "@/components/project/BudgetBurnPanel";

interface BudgetWidgetProps {
  projectId: string;
}

export function BudgetWidget({ projectId }: BudgetWidgetProps) {
  const allProjects = useStore((s) => s.projects);
  const allTasks = useStore((s) => s.tasks);
  const allTimeEntries = useStore((s) => s.timeEntries);
  const allClients = useStore((s) => s.clients);
  const budgetChanges = useStore((s) => s.budgetChanges);
  const allInvoices = useStore((s) => s.invoices);
  const [bcrOpen, setBcrOpen] = useState(false);

  const project = allProjects.find((p) => p.id === projectId);
  const pendingChanges = budgetChanges.filter(
    (r) => r.projectId === projectId && r.status === "pending",
  );
  const client = project
    ? allClients.find((c) => c.id === project.clientId)
    : undefined;

  const stats = useMemo(() => {
    if (!project) return null;
    const tasks = allTasks.filter((t) => t.projectId === projectId);
    const taskIds = new Set(tasks.map((t) => t.id));
    const entries = allTimeEntries.filter((e) => taskIds.has(e.taskId));
    const totalMinutes = entries.reduce(
      (s, e) => s + e.durationMinutes,
      0,
    );
    const totalCost = entries.reduce((s, e) => {
      // Default $120/h until cost rates are wired into the user model
      const rate = 120;
      return s + (e.durationMinutes / 60) * rate;
    }, 0);
    const estimatedHours = tasks.reduce(
      (s, t) => s + (t.estimatedHours ?? 0),
      0,
    );
    const actualHours = totalMinutes / 60;
    const budget = project.totalBudget ?? 0;
    const burnPct = budget === 0 ? 0 : (totalCost / budget) * 100;
    // Revenue recognition:
    //  - milestone billing: recognized = sum of paid invoices for this project
    //  - other models: recognized = budget × progress
    const projectInvoices = allInvoices.filter(
      (i) => i.projectId === projectId,
    );
    const paidRevenue = projectInvoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.total, 0);
    const milestoneRecognized = paidRevenue;
    const progressRecognized = budget * project.progress;
    const recognized =
      project.billingModel === "milestone"
        ? milestoneRecognized
        : progressRecognized;
    const deferred = Math.max(0, budget - recognized);
    return {
      budget,
      totalCost,
      actualHours,
      estimatedHours,
      burnPct,
      remaining: budget - totalCost,
      recognized,
      deferred,
      currency: client?.currency ?? "USD",
    };
  }, [project, projectId, allTasks, allTimeEntries, client, allInvoices]);

  if (!project || !stats) return null;

  const burnColor =
    stats.burnPct < 70
      ? "from-status-done to-status-done/60"
      : stats.burnPct < 90
        ? "from-status-revisions to-status-revisions/60"
        : "from-status-blocked to-status-blocked/60";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Budget · burn rate
        </div>
        <div className="flex items-center gap-2">
          {pendingChanges.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-status-progress/15 px-2 py-0.5 text-[10px] font-medium text-status-progress">
              <span className="size-1.5 rounded-full bg-status-progress animate-pulse" />
              {pendingChanges.length} change pending
            </span>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBcrOpen(true)}
          >
            <Plus className="size-3.5" /> Request change
          </Button>
        </div>
      </div>

      <RequestBudgetChangeDialog
        projectId={projectId}
        open={bcrOpen}
        onOpenChange={setBcrOpen}
      />

      <div className="grid gap-3 md:grid-cols-5">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border bg-card p-4"
      >
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Budget
        </p>
        <p className="mt-1 font-mono text-xl font-semibold">
          {formatCurrency(stats.budget, stats.currency)}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {project.billingModel.replace("_", " ")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="rounded-lg border bg-card p-4"
      >
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Spent
        </p>
        <p
          className={cn(
            "mt-1 font-mono text-xl font-semibold",
            stats.burnPct >= 90 && "text-status-blocked",
          )}
        >
          {formatCurrency(stats.totalCost, stats.currency)}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {stats.actualHours.toFixed(1)}h logged
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-lg border bg-card p-4"
      >
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Remaining
        </p>
        <p
          className={cn(
            "mt-1 font-mono text-xl font-semibold",
            stats.remaining < 0 && "text-status-blocked",
          )}
        >
          {formatCurrency(Math.abs(stats.remaining), stats.currency)}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {(stats.estimatedHours - stats.actualHours).toFixed(1)}h to estimate
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="rounded-lg border bg-card p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Burn rate
          </p>
          {stats.burnPct >= 90 ? (
            <AlertTriangle className="size-3.5 text-status-blocked" />
          ) : stats.burnPct >= 70 ? (
            <TrendingUp className="size-3.5 text-status-revisions" />
          ) : (
            <TrendingDown className="size-3.5 text-status-done" />
          )}
        </div>
        <p className="mt-1 font-mono text-xl font-semibold">
          {Math.round(stats.burnPct)}%
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, stats.burnPct)}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "h-full rounded-full bg-gradient-to-r",
              burnColor,
            )}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="rounded-lg border bg-card p-4"
      >
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Recognized
        </p>
        <p className="mt-1 font-mono text-xl font-semibold">
          {formatCurrency(stats.recognized, stats.currency)}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {project.billingModel === "milestone" ? "From paid invoices" : "Progress × budget"}
        </p>
        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${stats.budget > 0 ? (stats.recognized / stats.budget) * 100 : 0}%`,
            }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-status-done"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${stats.budget > 0 ? (stats.deferred / stats.budget) * 100 : 0}%`,
            }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-muted-foreground/30"
          />
        </div>
      </motion.div>
      </div>

      <BudgetBurnPanel projectId={projectId} />
    </div>
  );
}
