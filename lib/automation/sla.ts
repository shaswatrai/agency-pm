"use client";

/**
 * SLA evaluator.
 *
 * Pure function from (task, project, policies) → SLA snapshot. No side
 * effects; computed at read time so the UI is always honest. Business
 * hours are Mon–Fri 9–17 in the user's locale (no real timezone math
 * yet — Pass 7 will).
 *
 * Lifecycle states we read from the task:
 *   • createdAt → start of both clocks
 *   • status moves out of "todo" → first response met (read approximately
 *     from updatedAt; if status !== todo, response clock has stopped)
 *   • status === "done" → resolution met (read from updatedAt)
 */
import { addHours, differenceInHours } from "date-fns";
import type {
  SlaIncidentSnapshot,
  SlaPolicy,
  SlaState,
  Task,
} from "@/types/domain";

const REFERENCE_NOW = new Date("2026-04-29T12:00:00.000Z");

function now(): Date {
  return REFERENCE_NOW;
}

/**
 * Resolve a policy for a given task. Order:
 *   1. policy with this task's project's client → highest specificity
 *   2. org-wide default (clientId == null)
 */
export function resolvePolicy(
  policies: SlaPolicy[],
  clientId: string | undefined,
): SlaPolicy | null {
  const active = policies.filter((p) => p.isActive);
  if (clientId) {
    const clientPolicy = active.find((p) => p.clientId === clientId);
    if (clientPolicy) return clientPolicy;
  }
  return active.find((p) => !p.clientId) ?? null;
}

/**
 * Add `hours` of business hours to a date. Crude approximation:
 *   • Mon–Fri 9:00–17:00 are billable; everything else is skipped.
 *   • We walk forward in 1-hour ticks.
 *
 * Good enough for the dashboard's "hours remaining" math; precise
 * scheduling is Pass 7's problem.
 */
export function addBusinessHours(start: Date, hours: number): Date {
  if (hours <= 0) return start;
  let cursor = new Date(start);
  let remaining = hours;
  while (remaining > 0) {
    cursor = new Date(cursor.getTime() + 60 * 60 * 1000); // +1h
    const day = cursor.getDay();
    const h = cursor.getHours();
    if (day >= 1 && day <= 5 && h >= 9 && h <= 17) remaining -= 1;
  }
  return cursor;
}

function deadlineFromStart(
  startISO: string,
  hours: number,
  kind: "business_hours" | "calendar",
): string {
  const start = new Date(startISO);
  const out =
    kind === "business_hours"
      ? addBusinessHours(start, hours)
      : addHours(start, hours);
  return out.toISOString();
}

function classify(
  deadlineISO: string,
  metAtISO: string | null,
): SlaState {
  if (metAtISO) {
    return new Date(metAtISO) <= new Date(deadlineISO) ? "met" : "breached";
  }
  const remaining = differenceInHours(new Date(deadlineISO), now());
  if (remaining < 0) return "breached";
  if (remaining <= 4) return "at_risk";
  return "ok";
}

/**
 * Compute SLA state for a single task. Returns null when:
 *   • the task isn't client-visible (SLAs are a client commitment)
 *   • there's no active policy for this client / org
 *   • the matching policy has no tier for this priority
 */
export function evaluateTaskSla(
  task: Task,
  clientId: string | undefined,
  policies: SlaPolicy[],
): SlaIncidentSnapshot | null {
  if (!task.clientVisible) return null;
  const policy = resolvePolicy(policies, clientId);
  if (!policy) return null;
  const tier = policy.tiers.find((t) => t.priority === task.priority);
  if (!tier) return null;

  const responseDeadline = deadlineFromStart(
    task.createdAt,
    tier.responseHours,
    policy.hoursKind,
  );
  const resolutionDeadline = deadlineFromStart(
    task.createdAt,
    tier.resolutionHours,
    policy.hoursKind,
  );

  // First-response is met as soon as the task moved out of "todo".
  // We approximate the timestamp via task.updatedAt — fine for the
  // dashboard read.
  const respondedAt =
    task.status !== "todo" ? task.updatedAt : null;
  const resolvedAt = task.status === "done" ? task.updatedAt : null;

  const responseState: SlaState = classify(responseDeadline, respondedAt);
  const resolutionState: SlaState = classify(
    resolutionDeadline,
    resolvedAt,
  );

  // Pick the next deadline that still matters
  let hoursToNext = Number.POSITIVE_INFINITY;
  if (resolutionState !== "met") {
    hoursToNext = differenceInHours(new Date(resolutionDeadline), now());
  }
  if (responseState !== "met" && responseState !== "breached") {
    const r = differenceInHours(new Date(responseDeadline), now());
    if (r < hoursToNext) hoursToNext = r;
  }

  return {
    taskId: task.id,
    policyId: policy.id,
    tier,
    responseDeadline,
    resolutionDeadline,
    responseState,
    resolutionState,
    hoursToNextDeadline: hoursToNext,
  };
}

/** Returns the worst state of (response, resolution). */
export function overallSlaState(snap: SlaIncidentSnapshot): SlaState {
  const order: SlaState[] = ["breached", "at_risk", "ok", "met"];
  const a = order.indexOf(snap.responseState);
  const b = order.indexOf(snap.resolutionState);
  return order[Math.min(a, b)];
}

/**
 * Default tier presets — used by the Settings panel when creating a new
 * policy from scratch.
 */
export const DEFAULT_TIERS = [
  { priority: "urgent" as const, responseHours: 1, resolutionHours: 4 },
  { priority: "high" as const, responseHours: 4, resolutionHours: 24 },
  { priority: "medium" as const, responseHours: 8, resolutionHours: 72 },
  { priority: "low" as const, responseHours: 24, resolutionHours: 168 },
];
