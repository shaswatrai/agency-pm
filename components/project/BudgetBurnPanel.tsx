"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useStore } from "@/lib/db/store";
import { analyzeBudgetBurn, type BurnSeverity } from "@/lib/billing/burn";
import { resolveBillingRateById } from "@/lib/billing/rate";
import { formatCurrency } from "@/lib/utils";

interface Props {
  projectId: string;
}

const SEVERITY_STYLES: Record<
  BurnSeverity,
  { label: string; chip: string; border: string; bg: string; icon: typeof AlertTriangle }
> = {
  green: {
    label: "On track",
    chip: "bg-status-done/15 text-status-done",
    border: "border-status-done/20",
    bg: "bg-status-done/5",
    icon: CheckCircle2,
  },
  amber: {
    label: "Watch",
    chip: "bg-status-revisions/15 text-status-revisions",
    border: "border-status-revisions/30",
    bg: "bg-status-revisions/5",
    icon: TrendingUp,
  },
  red: {
    label: "Action needed",
    chip: "bg-status-blocked/15 text-status-blocked",
    border: "border-status-blocked/30",
    bg: "bg-status-blocked/5",
    icon: AlertTriangle,
  },
};

/**
 * Burn-rate analysis panel — surfaces projected total at completion,
 * pace delta vs. elapsed timeline, and reasons for any amber/red
 * severity. Sits below the existing BudgetWidget grid on project
 * Overview.
 */
export function BudgetBurnPanel({ projectId }: Props) {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const timeEntries = useStore((s) => s.timeEntries);
  const clients = useStore((s) => s.clients);
  const users = useStore((s) => s.users);

  const project = projects.find((p) => p.id === projectId);
  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === projectId),
    [tasks, projectId],
  );
  const client = project ? clients.find((c) => c.id === project.clientId) : null;
  const currency = client?.currency ?? "USD";

  const analysis = useMemo(() => {
    if (!project) return null;
    return analyzeBudgetBurn({
      project,
      tasks: projectTasks,
      timeEntries,
      rateFor: (userId) =>
        resolveBillingRateById({ userId, projectId, users, projects, clients }).rate,
    });
  }, [project, projectTasks, timeEntries, projectId, users, projects, clients]);

  if (!project || !analysis || project.totalBudget === undefined) return null;

  const meta = SEVERITY_STYLES[analysis.severity];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-lg border ${meta.border} ${meta.bg}`}
    >
      <div className="flex items-start gap-3 border-b border-current/10 px-4 py-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-md bg-background">
          <Icon className={`size-4 ${meta.chip.split(" ")[1]}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Burn rate analysis</h3>
            <span
              className={`rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.chip}`}
            >
              {meta.label}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Day {analysis.daysElapsed} of {analysis.totalDays} ·{" "}
            {analysis.daysRemaining}d remaining ·{" "}
            {formatCurrency(analysis.dailySpend, currency)}/day
          </p>
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-3">
        <Stat
          label="Projected total"
          value={formatCurrency(analysis.projectedTotal, currency)}
          accent={
            analysis.overspend > 0 ? "text-status-blocked" : "text-foreground"
          }
          sub={`at current burn rate`}
        />
        <Stat
          label={analysis.overspend >= 0 ? "Over budget by" : "Under budget by"}
          value={formatCurrency(Math.abs(analysis.overspend), currency)}
          accent={
            analysis.overspend > 0
              ? "text-status-blocked"
              : "text-status-done"
          }
          sub={
            analysis.budget > 0
              ? `${Math.abs(Math.round((analysis.overspend / analysis.budget) * 100))}% of budget`
              : ""
          }
        />
        <Stat
          label="Pace vs. timeline"
          value={`${analysis.paceDelta >= 0 ? "+" : ""}${analysis.paceDelta.toFixed(0)} pp`}
          accent={
            analysis.paceDelta >= 20
              ? "text-status-blocked"
              : analysis.paceDelta >= 10
                ? "text-status-revisions"
                : "text-status-done"
          }
          sub={`${analysis.burnPct.toFixed(0)}% spent vs ${analysis.elapsedPct.toFixed(0)}% elapsed`}
        />
      </div>

      {analysis.reasons.length > 0 && (
        <div className="border-t border-current/10 px-4 py-2.5">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Why this rating
          </p>
          <ul className="space-y-0.5 text-[11px]">
            {analysis.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-current opacity-50" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-1.5 border-t border-current/10 px-4 py-2 text-[10px] text-muted-foreground">
        <Calendar className="size-3" />
        Analysis updates live as time entries are logged.
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 font-mono text-lg font-semibold ${accent ?? ""}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
