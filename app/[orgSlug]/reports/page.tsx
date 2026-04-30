"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Receipt,
  Zap,
  Download,
  Pencil,
  Trash2,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/lib/db/store";
import { useBaseConverter, formatCurrencyAmount } from "@/lib/db/fx";
import { resolveCostRateById } from "@/lib/billing/rate";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { LineChart } from "@/components/charts/LineChart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ReportBuilder,
  ReportRenderer,
} from "@/components/reports/ReportBuilder";
import { runReport } from "@/lib/reports/runner";
import type { CustomReport } from "@/types/domain";

export default function ReportsPage() {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const timeEntries = useStore((s) => s.timeEntries);
  const invoices = useStore((s) => s.invoices);
  const users = useStore((s) => s.users);
  const clients = useStore((s) => s.clients);
  const customReports = useStore((s) => s.customReports);
  const removeCustomReport = useStore((s) => s.removeCustomReport);
  const { baseCurrency, convert } = useBaseConverter();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<CustomReport | null>(null);

  const reportInputs = useMemo(
    () => ({ tasks, timeEntries, projects, invoices, clients }),
    [tasks, timeEntries, projects, invoices, clients],
  );

  // Profitability per active project — cost via the resolver hierarchy
  // (project override → user default → fallback). Revenue converted to
  // base currency.
  const profitability = useMemo(() => {
    return projects
      .filter((p) => p.status === "active")
      .map((p) => {
        const projTasks = tasks.filter((t) => t.projectId === p.id);
        const taskIds = new Set(projTasks.map((t) => t.id));
        const entries = timeEntries.filter((e) => taskIds.has(e.taskId));
        const cost = entries.reduce((s, e) => {
          const resolved = resolveCostRateById({
            userId: e.userId,
            projectId: p.id,
            users,
            projects,
          });
          return s + (e.durationMinutes / 60) * resolved.rate;
        }, 0);
        const client = clients.find((c) => c.id === p.clientId);
        const projectCurrency = client?.currency ?? "USD";
        const revenueLocal = (p.totalBudget ?? 0) * p.progress;
        const revenue = convert(revenueLocal, projectCurrency);
        const margin = revenue - cost;
        return { project: p, revenue, cost, margin, projectCurrency };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [projects, tasks, timeEntries, clients, convert, users]);

  // AR aging in base currency
  const arAging = useMemo(() => {
    const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    const now = new Date("2026-04-29");
    for (const inv of invoices) {
      if (inv.status !== "sent" && inv.status !== "overdue") continue;
      const due = new Date(inv.dueDate);
      const days = Math.floor(
        (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
      );
      const remaining = convert(inv.total - inv.amountPaid, inv.currency);
      if (days <= 0) buckets.current += remaining;
      else if (days <= 30) buckets["1-30"] += remaining;
      else if (days <= 60) buckets["31-60"] += remaining;
      else if (days <= 90) buckets["61-90"] += remaining;
      else buckets["90+"] += remaining;
    }
    return buckets;
  }, [invoices, convert]);

  // Velocity (synthetic — would normally come from sprint data)
  const velocityData = [22, 28, 26, 32, 24, 30, 28];
  const velocityLabels = ["S8", "S9", "S10", "S11", "S12", "S13", "S14"];

  // Revenue trend (synthetic 6-month)
  const revenueData = [142000, 168000, 155000, 189000, 204000, 226000];
  const targetData = [150000, 160000, 170000, 180000, 200000, 220000];
  const monthLabels = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

  // Task status distribution (org-wide)
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    const colorMap: Record<string, string> = {
      todo: "hsl(var(--status-todo))",
      in_progress: "hsl(var(--status-progress))",
      in_review: "hsl(var(--status-review))",
      revisions: "hsl(var(--status-revisions))",
      done: "hsl(var(--status-done))",
      blocked: "hsl(var(--status-blocked))",
    };
    const labelMap: Record<string, string> = {
      todo: "To do",
      in_progress: "In progress",
      in_review: "In review",
      revisions: "Revisions",
      done: "Done",
      blocked: "Blocked",
    };
    return Object.entries(counts).map(([k, v]) => ({
      label: labelMap[k] ?? k,
      value: v,
      color: colorMap[k] ?? "hsl(var(--muted-foreground))",
    }));
  }, [tasks]);

  // Utilization avg
  const orgUtilizationPct = useMemo(() => {
    const totalEstHours = tasks
      .filter((t) => t.status !== "done")
      .reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
    const totalCapacity = users.length * 40;
    return Math.min(100, Math.round((totalEstHours / totalCapacity / 4) * 100));
  }, [tasks, users]);

  const totalArOutstanding = Object.values(arAging).reduce((s, n) => s + n, 0);
  const totalRevenueRecognized = profitability.reduce(
    (s, p) => s + p.revenue,
    0,
  );
  const totalCost = profitability.reduce((s, p) => s + p.cost, 0);
  const orgMargin =
    totalRevenueRecognized > 0
      ? ((totalRevenueRecognized - totalCost) / totalRevenueRecognized) * 100
      : 0;

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Profitability, utilization, AR aging, and velocity at a glance
            <span className="ml-1 text-muted-foreground/80">
              · all amounts in {baseCurrency}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
              toast.info("Use the browser's Save as PDF in the print dialog");
            }}
          >
            <Download className="size-4" /> Export PDF
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingReport(null);
              setBuilderOpen(true);
            }}
          >
            <Sparkles className="size-4" />
            Custom report
          </Button>
        </div>
      </motion.div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: DollarSign,
            label: "Revenue recognized",
            value: formatCurrencyAmount(totalRevenueRecognized, baseCurrency),
            delta: "+18.4%",
            positive: true,
            accent: "from-status-done/15",
          },
          {
            icon: TrendingUp,
            label: "Org margin",
            value: `${orgMargin.toFixed(1)}%`,
            delta: "+2.1pp",
            positive: true,
            accent: "from-primary/15",
          },
          {
            icon: Activity,
            label: "Utilization",
            value: `${orgUtilizationPct}%`,
            delta: "−3.2pp",
            positive: false,
            accent: "from-status-revisions/15",
          },
          {
            icon: Receipt,
            label: "AR outstanding",
            value: formatCurrencyAmount(totalArOutstanding, baseCurrency),
            delta:
              arAging["90+"] > 0
                ? formatCurrencyAmount(arAging["90+"], baseCurrency) + " 90+"
                : "Clean",
            positive: arAging["90+"] === 0,
            accent: "from-status-blocked/15",
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="relative overflow-hidden rounded-lg border bg-card p-5"
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent",
                kpi.accent,
              )}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </p>
                <kpi.icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 font-mono text-3xl font-semibold">
                {kpi.value}
              </p>
              <p
                className={cn(
                  "mt-1 inline-flex items-center gap-0.5 text-xs font-medium",
                  kpi.positive ? "text-status-done" : "text-status-blocked",
                )}
              >
                {kpi.positive ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {kpi.delta}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Revenue trend */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h3 className="text-sm font-semibold">Revenue vs target</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last 6 months · monthly recognized
              </p>
            </div>
            <div className="flex gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span className="inline-block h-0.5 w-3 bg-primary" />
                Actual
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span
                  className="inline-block w-3 border-t border-dashed"
                  style={{ borderColor: "hsl(var(--muted-foreground))" }}
                />
                Target
              </span>
            </div>
          </div>
          <div className="aspect-[3/1] w-full">
            <LineChart
              labels={monthLabels}
              series={[
                {
                  name: "Actual",
                  data: revenueData,
                  color: "hsl(var(--primary))",
                },
                {
                  name: "Target",
                  data: targetData,
                  color: "hsl(var(--muted-foreground))",
                  dashed: true,
                },
              ]}
              formatValue={(n) =>
                n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`
              }
            />
          </div>
        </Card>

        {/* Task status donut */}
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">Task pipeline</h3>
          <DonutChart
            segments={statusBreakdown}
            centerLabel="Total"
            centerValue={String(tasks.length)}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Profitability */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h3 className="text-sm font-semibold">
                Profitability by project
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Revenue recognized vs. team cost · top 6 active projects
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {profitability.map((p, i) => {
              const marginPct =
                p.revenue > 0 ? (p.margin / p.revenue) * 100 : 0;
              const client = clients.find((c) => c.id === p.project.clientId);
              return (
                <motion.div
                  key={p.project.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-md border p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {p.project.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {client?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold">
                        {formatCurrencyAmount(p.margin, baseCurrency)}
                      </p>
                      <p
                        className={cn(
                          "text-[11px] font-medium",
                          marginPct > 25
                            ? "text-status-done"
                            : marginPct > 10
                              ? "text-status-revisions"
                              : "text-status-blocked",
                        )}
                      >
                        {marginPct.toFixed(1)}% margin
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="flex h-full">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(p.cost / p.revenue) * 100}%`,
                        }}
                        transition={{ delay: 0.2 + i * 0.04, duration: 0.6 }}
                        className="bg-status-blocked/40"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(p.margin / p.revenue) * 100}%`,
                        }}
                        transition={{ delay: 0.4 + i * 0.04, duration: 0.6 }}
                        className="bg-status-done"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* AR aging */}
        <Card className="p-5">
          <h3 className="mb-1 text-sm font-semibold">AR aging</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Outstanding by bucket
          </p>
          <BarChart
            data={[
              {
                label: "Current",
                value: arAging.current,
              },
              { label: "1–30", value: arAging["1-30"] },
              { label: "31–60", value: arAging["31-60"] },
              { label: "61–90", value: arAging["61-90"] },
              { label: "90+", value: arAging["90+"] },
            ]}
            formatValue={(n) =>
              n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`
            }
            highlightLast={arAging["90+"] > 0}
            primaryColor="hsl(var(--status-blocked))"
          />
          <div className="mt-4 flex justify-between border-t pt-3 text-xs">
            <span className="text-muted-foreground">Total outstanding</span>
            <span className="font-mono font-semibold">
              {formatCurrencyAmount(totalArOutstanding, baseCurrency)}
            </span>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Sprint velocity */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Sprint velocity</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Story points completed · last 7 sprints
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-pill bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <Zap className="size-3" /> 28 avg
            </span>
          </div>
          <BarChart
            data={velocityLabels.map((label, i) => ({
              label,
              value: velocityData[i],
            }))}
            formatValue={(n) => `${n} pts`}
            highlightLast
          />
        </Card>

        {/* Top contributors */}
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">
            Hours logged by team member
          </h3>
          <div className="space-y-2">
            {users
              .map((u) => {
                const minutes = timeEntries
                  .filter((e) => e.userId === u.id)
                  .reduce((s, e) => s + e.durationMinutes, 0);
                return { user: u, hours: minutes / 60 };
              })
              .sort((a, b) => b.hours - a.hours)
              .slice(0, 5)
              .map(({ user, hours }, i) => {
                const max =
                  Math.max(
                    ...users.map((u) =>
                      timeEntries
                        .filter((e) => e.userId === u.id)
                        .reduce((s, e) => s + e.durationMinutes / 60, 0),
                    ),
                  ) || 1;
                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="grid grid-cols-[120px_1fr_60px] items-center gap-3"
                  >
                    <span className="truncate text-xs font-medium">
                      {user.fullName}
                    </span>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(hours / max) * 100}%`,
                        }}
                        transition={{ delay: 0.2 + i * 0.04, duration: 0.6 }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                      />
                    </div>
                    <span className="text-right font-mono text-xs">
                      {hours.toFixed(1)}h
                    </span>
                  </motion.div>
                );
              })}
          </div>
        </Card>
      </div>

      {/* Custom reports */}
      {customReports.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" />
            Custom reports
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AnimatePresence initial={false}>
              {customReports.map((report) => {
                const result = runReport(report.config, reportInputs);
                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card className="p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{report.name}</p>
                          {report.description ? (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {report.description}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {report.config.source} ·{" "}
                              {report.config.measure.kind}
                              {report.config.groupBy
                                ? ` by ${report.config.groupBy}`
                                : ""}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingReport(report);
                              setBuilderOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              if (
                                confirm(`Delete report "${report.name}"?`)
                              ) {
                                removeCustomReport(report.id);
                                toast.success("Report deleted");
                              }
                            }}
                          >
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      <ReportRenderer
                        config={report.config}
                        result={result}
                        users={users}
                        inputs={reportInputs}
                      />
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      ) : null}

      <ReportBuilder
        open={builderOpen}
        onOpenChange={(o) => {
          setBuilderOpen(o);
          if (!o) setEditingReport(null);
        }}
        editingReport={editingReport}
      />
    </div>
  );
}
