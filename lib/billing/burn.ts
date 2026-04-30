import type { Project, Task, TimeEntry } from "@/types/domain";

/**
 * Budget burn-rate analysis (PRD §5.6.3).
 *
 * Inputs the project + its tasks + its time entries + a "now" anchor
 * (so the analysis is deterministic in tests and the dashboard can
 * project against an arbitrary date). Returns:
 *   - spent-to-date (cost = hours × rate)
 *   - elapsed % of timeline
 *   - daily burn rate
 *   - projected total at completion at current burn rate
 *   - overspend delta (positive = over budget, negative = under)
 *   - severity: green / amber / red — the level used to drive a
 *     visible alert on the project Overview page
 *
 * Severity heuristic:
 *   green : projected total ≤ budget AND burn-vs-elapsed delta < 10pp
 *   amber : projected total ≤ budget AND burn-vs-elapsed delta in [10pp, 20pp)
 *   red   : projected total > budget OR burn-vs-elapsed delta ≥ 20pp
 */

const DEFAULT_BLENDED_RATE = 120;

export type BurnSeverity = "green" | "amber" | "red";

export interface BudgetBurnAnalysis {
  budget: number;
  spent: number;
  burnPct: number;
  /** % of project timeline elapsed (0..100) */
  elapsedPct: number;
  /** burnPct minus elapsedPct — positive means we're outpacing the schedule */
  paceDelta: number;
  daysElapsed: number;
  daysRemaining: number;
  totalDays: number;
  /** Daily burn rate in budget currency */
  dailySpend: number;
  projectedTotal: number;
  overspend: number;
  severity: BurnSeverity;
  /** Human-readable bullet list of what triggered the severity bump. */
  reasons: string[];
}

export interface BurnInputs {
  project: Pick<
    Project,
    "id" | "totalBudget" | "startDate" | "endDate"
  >;
  tasks: Task[];
  timeEntries: TimeEntry[];
  /**
   * Resolver returning the cost rate (per hour) for a given user.
   * Defaults to a blended rate when not supplied.
   */
  rateFor?: (userId: string, taskId: string) => number;
  now?: Date;
}

export function analyzeBudgetBurn(input: BurnInputs): BudgetBurnAnalysis {
  const now = input.now ?? new Date();
  const budget = input.project.totalBudget ?? 0;
  const taskIds = new Set(input.tasks.map((t) => t.id));
  const entries = input.timeEntries.filter((e) => taskIds.has(e.taskId));

  const spent = entries.reduce((s, e) => {
    const rate = input.rateFor
      ? input.rateFor(e.userId, e.taskId)
      : DEFAULT_BLENDED_RATE;
    return s + (e.durationMinutes / 60) * rate;
  }, 0);

  const start = input.project.startDate ? new Date(input.project.startDate) : now;
  const end = input.project.endDate ? new Date(input.project.endDate) : now;
  const totalDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86_400_000),
  );
  const daysElapsed = Math.max(
    0,
    Math.min(totalDays, Math.round((now.getTime() - start.getTime()) / 86_400_000)),
  );
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const elapsedPct = (daysElapsed / totalDays) * 100;
  const burnPct = budget > 0 ? (spent / budget) * 100 : 0;
  const paceDelta = burnPct - elapsedPct;

  const dailySpend = daysElapsed > 0 ? spent / daysElapsed : 0;
  const projectedTotal = spent + dailySpend * daysRemaining;
  const overspend = projectedTotal - budget;

  const reasons: string[] = [];
  let severity: BurnSeverity = "green";

  if (overspend > 0 && budget > 0) {
    severity = "red";
    reasons.push(
      `Projected to overspend by ${Math.abs(Math.round((overspend / budget) * 100))}% (${formatMoney(overspend)})`,
    );
  }
  if (paceDelta >= 20) {
    severity = "red";
    reasons.push(
      `Burn ${burnPct.toFixed(0)}% but only ${elapsedPct.toFixed(0)}% of timeline elapsed (${paceDelta.toFixed(0)}pp ahead)`,
    );
  } else if (paceDelta >= 10 && severity !== "red") {
    severity = "amber";
    reasons.push(
      `Burn outpacing schedule by ${paceDelta.toFixed(0)} pp`,
    );
  }
  if (daysRemaining === 0 && burnPct < 95 && burnPct > 0) {
    reasons.push("Project end date passed but budget not fully recognized");
  }
  if (severity === "green" && burnPct >= 95 && burnPct <= 105) {
    reasons.push("Tracking exactly to budget");
  }

  return {
    budget,
    spent,
    burnPct,
    elapsedPct,
    paceDelta,
    daysElapsed,
    daysRemaining,
    totalDays,
    dailySpend,
    projectedTotal,
    overspend,
    severity,
    reasons,
  };
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/**
 * Roll burn analyses up across many projects — used by the dashboard
 * "Budget alerts" widget and reports to surface the worst offenders.
 */
export function topOverspendProjects<T extends { id: string; analysis: BudgetBurnAnalysis }>(
  rows: T[],
  limit = 5,
): T[] {
  return rows
    .filter((r) => r.analysis.severity !== "green")
    .sort((a, b) => b.analysis.overspend - a.analysis.overspend)
    .slice(0, limit);
}
