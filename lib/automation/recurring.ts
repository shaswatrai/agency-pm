"use client";

/**
 * Recurring task engine.
 *
 * Runs once on app boot (or on demand from the Settings panel) and walks
 * every active recurring rule. For each rule we compute the list of due
 * dates between max(rule.startDate, rule.lastRunAt + 1 unit) and today;
 * for each due date we call addTask with the rule's task template.
 *
 * Day math is intentionally simple — we don't try to match cron syntax.
 *   • daily   → every <intervalCount> days
 *   • weekly  → every <intervalCount> weeks on `dayOfWeek` (0=Sun)
 *   • monthly → every <intervalCount> months on `dayOfMonth` (1..28)
 *
 * Materialisation routes through the regular addTask path so activity
 * log + assignment emails fire normally.
 */
import { addDays, addMonths, format, parseISO, startOfDay } from "date-fns";
import { useStore } from "@/lib/db/store";
import type { RecurringTaskRule } from "@/types/domain";

const REFERENCE_DATE = new Date("2026-04-29");

function today(): Date {
  return startOfDay(REFERENCE_DATE);
}

function nextOccurrenceAfter(
  rule: RecurringTaskRule,
  after: Date,
): Date | null {
  const interval = Math.max(1, rule.intervalCount);
  if (rule.freq === "daily") {
    return addDays(after, interval);
  }
  if (rule.freq === "weekly") {
    const target = rule.dayOfWeek ?? 1; // default Monday
    let d = addDays(after, 1);
    while (d.getDay() !== target) d = addDays(d, 1);
    // if interval > 1, jump forward by additional weeks
    if (interval > 1) d = addDays(d, (interval - 1) * 7);
    return d;
  }
  if (rule.freq === "monthly") {
    const target = Math.min(28, Math.max(1, rule.dayOfMonth ?? 1));
    let candidate = new Date(
      after.getFullYear(),
      after.getMonth(),
      target,
    );
    if (candidate <= after) {
      candidate = addMonths(candidate, interval);
    } else if (interval > 1) {
      candidate = addMonths(candidate, interval - 1);
    }
    return candidate;
  }
  return null;
}

function dueDatesFor(rule: RecurringTaskRule, now: Date): Date[] {
  const start = parseISO(rule.startDate);
  const end = rule.endDate ? parseISO(rule.endDate) : null;
  const cap = end && end < now ? end : now;
  const cursorBase = rule.lastRunAt
    ? new Date(rule.lastRunAt)
    : addDays(start, -1);

  const out: Date[] = [];
  let cursor = cursorBase;
  let next = nextOccurrenceAfter(rule, cursor);
  // If the rule has no lastRunAt and the start date itself is "today" or
  // earlier, fire on start_date too.
  if (!rule.lastRunAt && start <= cap && start >= cursor) {
    out.push(start);
    cursor = start;
    next = nextOccurrenceAfter(rule, cursor);
  }
  while (next && next <= cap && out.length < 50 /* safety cap */) {
    out.push(next);
    cursor = next;
    next = nextOccurrenceAfter(rule, cursor);
  }
  return out;
}

export interface MaterialiseResult {
  ruleId: string;
  ruleName: string;
  generated: number;
}

/**
 * Materialise every active recurring rule. Returns a per-rule report.
 * Safe to call repeatedly — uses lastRunAt to avoid duplicates.
 */
export function materialiseRecurringTasks(): MaterialiseResult[] {
  const state = useStore.getState();
  const results: MaterialiseResult[] = [];
  const now = today();
  for (const rule of state.recurringRules) {
    if (!rule.isActive) continue;
    const due = dueDatesFor(rule, now);
    if (due.length === 0) continue;
    let generated = 0;
    for (const date of due) {
      const dueOffset = rule.taskTemplate.dueOffsetDays ?? 0;
      const dueDate = format(addDays(date, dueOffset), "yyyy-MM-dd");
      state.addTask({
        title: rule.taskTemplate.title.replace(
          "{date}",
          format(date, "MMM d"),
        ),
        description: rule.taskTemplate.description,
        status: "todo",
        priority: rule.taskTemplate.priority,
        taskType: rule.taskTemplate.taskType,
        estimatedHours: rule.taskTemplate.estimatedHours,
        storyPoints: rule.taskTemplate.storyPoints,
        assigneeIds: rule.taskTemplate.assigneeIds,
        reviewerId: rule.taskTemplate.reviewerId,
        clientVisible: rule.taskTemplate.clientVisible,
        tags: [...rule.taskTemplate.tags, "recurring"],
        dueDate,
        actualHours: 0,
        commentCount: 0,
        attachmentCount: 0,
        subtaskCount: 0,
        subtasksDone: 0,
        projectId: rule.projectId,
        phaseId: rule.phaseId,
      });
      generated++;
    }
    state.markRecurringRuleRun(rule.id, new Date().toISOString());
    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      generated,
    });
  }
  return results;
}
