import type { Task } from "@/types/domain";

/**
 * Sprint metrics computed from real task data (PRD §5.13).
 *
 * Without a dedicated Sprint entity yet, we approximate: a "sprint" is
 * the rolling N-day window ending at `now`, and "velocity" is points
 * completed in each of the last K windows.
 *
 * Story-point fallback: if a task lacks storyPoints, derive from its
 * estimatedHours via the standard "1 SP ≈ 2h" agency convention.
 */

export interface BurndownPoint {
  day: number; // 0..N
  remaining: number;
  ideal: number;
  /** Actual datapoint may be null for future days. */
  actual: number | null;
}

export interface SprintMetrics {
  /** Total points committed in the current sprint window. */
  totalPoints: number;
  /** Points completed inside the window. */
  donePoints: number;
  /** Day index of `now` within the sprint (0 = sprint start). */
  todayIndex: number;
  /** Daily burndown — ideal + actual to-date. */
  burndown: BurndownPoint[];
  /** Velocity (points/sprint) for the last K sprints, oldest → newest. */
  velocity: { sprintIndex: number; points: number }[];
  /** Names like "S11" generated for the velocity bar chart. */
  velocityLabels: string[];
}

export const STORY_POINT_FALLBACK = (t: Task): number =>
  t.storyPoints ?? Math.max(1, Math.ceil((t.estimatedHours ?? 4) / 2));

export interface ComputeSprintInputs {
  tasks: Task[];
  /** Length of the rolling window in days. */
  sprintDays?: number;
  /** How many past sprints to include in velocity history. */
  velocityHistory?: number;
  /** Anchor — defaults to today. */
  now?: Date;
}

export function computeSprintMetrics({
  tasks,
  sprintDays = 14,
  velocityHistory = 7,
  now = new Date(),
}: ComputeSprintInputs): SprintMetrics {
  const todayIdx = sprintDays;
  const sprintStart = new Date(now.getTime() - sprintDays * 86_400_000);

  const totalPoints = tasks.reduce((s, t) => s + STORY_POINT_FALLBACK(t), 0);

  const completionsByDay = new Map<number, number>();
  for (const t of tasks) {
    if (t.status !== "done") continue;
    const completedAt = new Date(t.updatedAt ?? t.createdAt);
    if (completedAt < sprintStart || completedAt > now) continue;
    const dayIndex = Math.max(
      0,
      Math.min(
        sprintDays,
        Math.floor((completedAt.getTime() - sprintStart.getTime()) / 86_400_000),
      ),
    );
    completionsByDay.set(
      dayIndex,
      (completionsByDay.get(dayIndex) ?? 0) + STORY_POINT_FALLBACK(t),
    );
  }

  let cumulativeDone = 0;
  const burndown: BurndownPoint[] = [];
  for (let d = 0; d <= sprintDays; d++) {
    const ideal = totalPoints - (totalPoints / sprintDays) * d;
    if (d <= todayIdx) {
      cumulativeDone += completionsByDay.get(d) ?? 0;
      burndown.push({
        day: d,
        ideal,
        remaining: Math.max(0, totalPoints - cumulativeDone),
        actual: Math.max(0, totalPoints - cumulativeDone),
      });
    } else {
      burndown.push({ day: d, ideal, remaining: 0, actual: null });
    }
  }
  const donePoints = cumulativeDone;

  // Velocity: each past sprint of the same window length, count points
  // completed inside it.
  const velocity: SprintMetrics["velocity"] = [];
  const velocityLabels: string[] = [];
  for (let s = velocityHistory - 1; s >= 0; s--) {
    const start = new Date(now.getTime() - (s + 1) * sprintDays * 86_400_000);
    const end = new Date(now.getTime() - s * sprintDays * 86_400_000);
    const points = tasks
      .filter((t) => t.status === "done")
      .filter((t) => {
        const at = new Date(t.updatedAt ?? t.createdAt);
        return at >= start && at < end;
      })
      .reduce((sum, t) => sum + STORY_POINT_FALLBACK(t), 0);
    velocity.push({ sprintIndex: velocityHistory - s, points });
    velocityLabels.push(`S${velocityHistory - s}`);
  }

  return {
    totalPoints,
    donePoints,
    todayIndex: todayIdx,
    burndown,
    velocity,
    velocityLabels,
  };
}
