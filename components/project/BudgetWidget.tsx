"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/db/store";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface BudgetWidgetProps {
  projectId: string;
}

export function BudgetWidget({ projectId }: BudgetWidgetProps) {
  const allProjects = useStore((s) => s.projects);
  const allTasks = useStore((s) => s.tasks);
  const allTimeEntries = useStore((s) => s.timeEntries);
  const allClients = useStore((s) => s.clients);

  const project = allProjects.find((p) => p.id === projectId);
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
    return {
      budget,
      totalCost,
      actualHours,
      estimatedHours,
      burnPct,
      remaining: budget - totalCost,
      currency: client?.currency ?? "USD",
    };
  }, [project, projectId, allTasks, allTimeEntries, client]);

  if (!project || !stats) return null;

  const burnColor =
    stats.burnPct < 70
      ? "from-status-done to-status-done/60"
      : stats.burnPct < 90
        ? "from-status-revisions to-status-revisions/60"
        : "from-status-blocked to-status-blocked/60";

  return (
    <div className="grid gap-3 md:grid-cols-4">
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
    </div>
  );
}
