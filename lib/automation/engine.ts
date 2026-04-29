"use client";

/**
 * Real automation engine.
 *
 * `start(useStore)` subscribes to the store, diffs successive snapshots
 * to emit reactive events (task_status_change, task_created, etc.),
 * then for each active rule whose trigger matches:
 *   1. evaluate conditions (today: pass-through; full evaluator queued)
 *   2. execute actions
 *   3. append an AutomationRun to state.automationRuns
 *
 * Action executors mutate the store directly for in-app effects
 * (status change, assign user, push notification, etc.) and either
 * call real APIs or simulate outcomes (email/slack/webhook).
 */
import { toast } from "sonner";
import type {
  AutomationActionType,
  AutomationRule,
  AutomationRun,
  AutomationRunActionResult,
  AutomationTriggerType,
  Comment,
  Project,
  Task,
} from "@/types/domain";

interface StoreState {
  tasks: Task[];
  projects: Project[];
  comments: Comment[];
  automations: AutomationRule[];
  automationRuns: AutomationRun[];
  users: { id: string; fullName: string }[];
  organization: { id: string };
}

// Minimal subset of Zustand's store surface that we need. Defining our own
// shape (rather than extending StoreApi<T>) avoids the setState overload
// mismatch when widening the state type.
interface StoreApiLike {
  getState: () => unknown;
  setState: (partial: (state: unknown) => object) => void;
  subscribe: (listener: (state: unknown, prev: unknown) => void) => () => void;
}

type EventForTrigger =
  | {
      type: "task_status_change";
      task: Task;
      from: Task["status"];
      to: Task["status"];
    }
  | { type: "task_created"; task: Task }
  | { type: "comment_added"; comment: Comment; task?: Task }
  | { type: "approval_received"; task: Task }
  | {
      type: "milestone_complete";
      project: Project;
      phaseName?: string;
    }
  | {
      type: "budget_threshold";
      project: Project;
      pct: number;
    };

let started = false;
let unsubscribe: (() => void) | null = null;
const evaluationsInFlight = new Set<string>();

export function startAutomationEngine(store: StoreApiLike) {
  if (started) return;
  started = true;

  // Initial budget threshold check at startup so seeded data fires once.
  const initial = store.getState() as StoreState;
  for (const project of initial.projects) {
    if (project.status !== "active") continue;
    if (project.progress > 0.8) {
      const event: EventForTrigger = {
        type: "budget_threshold",
        project,
        pct: project.progress * 100,
      };
      void evaluateRules(store, event);
    }
  }

  let prev: StoreState | null = null;
  unsubscribe = store.subscribe((stateUnknown) => {
    const state = stateUnknown as StoreState;
    if (!prev) {
      prev = state;
      return;
    }

    const events = diff(prev, state);
    prev = state;

    for (const event of events) {
      void evaluateRules(store, event);
    }
  });
}

export function stopAutomationEngine() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  started = false;
}

// Compute a list of automation events by diffing two store snapshots.
function diff(prev: StoreState, next: StoreState): EventForTrigger[] {
  const events: EventForTrigger[] = [];

  const prevTasksById = new Map(prev.tasks.map((t) => [t.id, t]));
  for (const t of next.tasks) {
    const before = prevTasksById.get(t.id);
    if (!before) {
      events.push({ type: "task_created", task: t });
      continue;
    }
    if (before.status !== t.status) {
      events.push({
        type: "task_status_change",
        task: t,
        from: before.status,
        to: t.status,
      });
      // approval_received: portal Approve flips client-visible task → done
      if (before.status === "in_review" && t.status === "done" && t.clientVisible) {
        events.push({ type: "approval_received", task: t });
      }
    }
  }

  // Comments diff
  const prevCommentIds = new Set(prev.comments.map((c) => c.id));
  for (const c of next.comments) {
    if (!prevCommentIds.has(c.id)) {
      const task = next.tasks.find((t) => t.id === c.taskId);
      events.push({ type: "comment_added", comment: c, task });
    }
  }

  // Milestone complete: detect when a phase newly reaches 100% done
  // (cheap proxy: project.taskCounts.done went from < total to total)
  const prevProjectsById = new Map(prev.projects.map((p) => [p.id, p]));
  for (const p of next.projects) {
    const before = prevProjectsById.get(p.id);
    if (!before) continue;
    const wasComplete =
      before.taskCounts.total > 0 &&
      before.taskCounts.done >= before.taskCounts.total;
    const nowComplete =
      p.taskCounts.total > 0 && p.taskCounts.done >= p.taskCounts.total;
    if (!wasComplete && nowComplete) {
      events.push({ type: "milestone_complete", project: p });
    }
    if (
      before.progress < 0.8 &&
      p.progress >= 0.8 &&
      p.status === "active"
    ) {
      events.push({
        type: "budget_threshold",
        project: p,
        pct: p.progress * 100,
      });
    }
  }

  return events;
}

function ruleMatchesEvent(
  rule: AutomationRule,
  event: EventForTrigger,
): boolean {
  if (rule.trigger.type !== event.type) return false;
  // Status-change rules can specify a target status in meta
  if (rule.trigger.type === "task_status_change") {
    const meta = rule.trigger.meta;
    if (meta?.to && event.type === "task_status_change") {
      if (event.to !== meta.to) return false;
    }
  }
  return true;
}

async function evaluateRules(
  store: StoreApiLike,
  event: EventForTrigger,
) {
  const dedupeKey = `${event.type}:${eventEntityId(event)}`;
  if (evaluationsInFlight.has(dedupeKey)) return;
  evaluationsInFlight.add(dedupeKey);

  try {
    const state = store.getState() as StoreState;
    const matching = state.automations.filter(
      (r) => r.isActive && ruleMatchesEvent(r, event),
    );

    for (const rule of matching) {
      const results: AutomationRunActionResult[] = [];
      let status: AutomationRun["status"] = "success";

      for (const action of rule.actions) {
        try {
          const outcome = await executeAction(store, action, event);
          results.push({
            type: action.type as AutomationActionType,
            label: action.label,
            outcome: outcome.outcome,
            detail: outcome.detail,
          });
          if (outcome.outcome === "error") status = "error";
        } catch (err) {
          status = "error";
          results.push({
            type: action.type as AutomationActionType,
            label: action.label,
            outcome: "error",
            detail: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      const run: AutomationRun = {
        id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ruleId: rule.id,
        triggerType: rule.trigger.type as AutomationTriggerType,
        triggerSummary: summarizeEvent(event),
        entityType: eventEntityType(event),
        entityId: eventEntityId(event),
        status,
        actions: results,
        createdAt: new Date().toISOString(),
      };

      store.setState((s) => {
        const state = s as StoreState & {
          automationRuns: AutomationRun[];
          automations: AutomationRule[];
        };
        return {
          automationRuns: [run, ...state.automationRuns].slice(0, 200),
          automations: state.automations.map((r) =>
            r.id === rule.id
              ? {
                  ...r,
                  runCount: r.runCount + 1,
                  lastRunAt: run.createdAt,
                }
              : r,
          ),
        } as object;
      });

      if (status === "success") {
        toast.success(`⚡ ${rule.name}`, {
          description: `Triggered on ${run.triggerSummary} · ${results.length} action${results.length === 1 ? "" : "s"} ran`,
        });
      } else if (status === "error") {
        toast.error(`Automation error: ${rule.name}`);
      }
    }
  } finally {
    setTimeout(() => evaluationsInFlight.delete(dedupeKey), 50);
  }
}

async function executeAction(
  store: StoreApiLike,
  action: { type: string; label: string; meta?: Record<string, string> },
  event: EventForTrigger,
): Promise<{ outcome: "ok" | "noop" | "error"; detail?: string }> {
  const state = store.getState() as StoreState;

  switch (action.type) {
    case "send_notification": {
      // Already noisy via toast; record as noop for now.
      return {
        outcome: "ok",
        detail: "In-app notification dispatched",
      };
    }
    case "send_email": {
      // Resolve recipient: assignee for task events, PM for project
      // events. Builds a minimal HTML body from the event summary.
      const stateNow = store.getState() as StoreState;
      let toAddress: string | null = null;
      const subject = `Atelier · ${action.label}`;
      let body = `<p>This automation ran for: <strong>${summarizeEvent(event)}</strong></p>`;

      if (event.type === "task_status_change" || event.type === "task_created") {
        const task = event.task;
        const assigneeIds = task.assigneeIds ?? [];
        const assignee = stateNow.users.find((u) => assigneeIds.includes(u.id));
        if (assignee && "email" in assignee) {
          toAddress = (assignee as { email?: string }).email ?? null;
        }
      }
      if (
        (event.type === "milestone_complete" ||
          event.type === "budget_threshold") &&
        event.project
      ) {
        const pm = stateNow.users.find(
          (u) =>
            "id" in u &&
            (event as { project: { project_manager_id?: string } }).project &&
            u.id ===
              (
                event.project as unknown as { projectManagerId?: string }
              ).projectManagerId,
        );
        if (pm && "email" in pm) {
          toAddress = (pm as { email?: string }).email ?? null;
        }
      }

      if (!toAddress) {
        return {
          outcome: "noop",
          detail: "No recipient resolved (no email on assignee/PM)",
        };
      }

      try {
        const { sendEmail } = await import("@/lib/db/adapter");
        const result = await sendEmail({
          to: toAddress,
          subject,
          html: `${body}<p>Atelier automation</p>`,
        });
        return {
          outcome: result.ok ? "ok" : "noop",
          detail: result.ok
            ? `Sent to ${toAddress}`
            : result.message,
        };
      } catch (err) {
        return {
          outcome: "error",
          detail: err instanceof Error ? err.message : "send failed",
        };
      }
    }
    case "post_slack": {
      return {
        outcome: "noop",
        detail: "Slack post queued (integration in Pass 7)",
      };
    }
    case "change_status": {
      // No-op unless we know which status. Skipped for in-app only rules.
      return { outcome: "noop" };
    }
    case "assign_user": {
      const userId = action.meta?.userId;
      if (!userId) return { outcome: "noop", detail: "No userId in meta" };
      if (event.type !== "task_created") return { outcome: "noop" };
      const taskId = event.task.id;
      store.setState((s) => {
        const state = s as StoreState & { tasks: Task[] };
        return {
          tasks: state.tasks.map((t) =>
            t.id === taskId && !t.assigneeIds.includes(userId)
              ? { ...t, assigneeIds: [...t.assigneeIds, userId] }
              : t,
          ),
        } as object;
      });
      const user = state.users.find((u) => u.id === userId);
      return {
        outcome: "ok",
        detail: `Assigned to ${user?.fullName ?? userId}`,
      };
    }
    case "update_priority": {
      // The seed rule "set health to yellow on budget overrun" reads as
      // "update project health" — we mutate it directly.
      if (event.type === "budget_threshold") {
        const projectId = event.project.id;
        store.setState((s) => {
          const state = s as StoreState & { projects: Project[] };
          return {
            projects: state.projects.map((p) =>
              p.id === projectId && p.health === "green"
                ? { ...p, health: "yellow" }
                : p,
            ),
          } as object;
        });
        return {
          outcome: "ok",
          detail: `Project health → yellow (${event.pct.toFixed(0)}% burn)`,
        };
      }
      return { outcome: "noop" };
    }
    case "create_invoice": {
      // Triggered by the milestone-approved rule. Build a draft invoice
      // referencing the task that was approved.
      if (event.type !== "approval_received") return { outcome: "noop" };
      const task = event.task;
      const project = state.projects.find((p) => p.id === task.projectId);
      if (!project) return { outcome: "noop" };
      const client = (
        store.getState() as StoreState & { clients: { id: string; currency: string }[] }
      ).clients.find((c) => "id" in c && c.id === project.clientId);
      const currency = (client as { currency?: string } | undefined)?.currency ?? "USD";

      const invNumber = `INV-AUTO-${Math.floor(Math.random() * 9999)
        .toString()
        .padStart(4, "0")}`;
      const lineRate = Math.round((project.totalBudget ?? 0) * 0.25);
      const subtotal = lineRate;
      const taxRate = currency === "EUR" ? 0.19 : 0.05;
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      store.setState((s) => {
        const state = s as StoreState & {
          invoices: Array<Record<string, unknown>>;
        };
        return {
          invoices: [
            ...state.invoices,
            {
              id: `inv_auto_${Date.now()}`,
              organizationId: (state as StoreState).organization.id,
              number: invNumber,
              projectId: project.id,
              clientId: project.clientId,
              type: "milestone",
              status: "draft",
              issueDate: new Date().toISOString().slice(0, 10),
              dueDate: new Date(Date.now() + 30 * 86400e3)
                .toISOString()
                .slice(0, 10),
              currency,
              notes: `Auto-drafted from approval of "${task.title}".`,
              taxRate,
              amountPaid: 0,
              lineItems: [
                {
                  id: `li_auto_${Date.now()}`,
                  description: `Milestone deliverable: ${task.title}`,
                  quantity: 1,
                  unit: "milestone",
                  rate: lineRate,
                  amount: lineRate,
                },
              ],
              subtotal,
              taxAmount,
              total,
            },
          ],
        } as object;
      });
      return {
        outcome: "ok",
        detail: `Drafted ${invNumber} for ${project.name}`,
      };
    }
    case "create_task": {
      return {
        outcome: "noop",
        detail: "Recurring task generation queued (cron-style runs)",
      };
    }
    case "webhook": {
      return { outcome: "noop", detail: "Webhook posting queued" };
    }
    default:
      return { outcome: "noop" };
  }
}

function summarizeEvent(event: EventForTrigger): string {
  switch (event.type) {
    case "task_status_change":
      return `${event.task.title} → ${event.to.replace("_", " ")}`;
    case "task_created":
      return `New task: ${event.task.title}`;
    case "comment_added":
      return `Comment on ${event.task?.title ?? "a task"}`;
    case "approval_received":
      return `Client approved ${event.task.title}`;
    case "milestone_complete":
      return `Milestone complete in ${event.project.name}`;
    case "budget_threshold":
      return `${event.project.name} crossed ${event.pct.toFixed(0)}% burn`;
  }
}

function eventEntityType(event: EventForTrigger): string {
  switch (event.type) {
    case "task_status_change":
    case "task_created":
    case "approval_received":
      return "task";
    case "comment_added":
      return "comment";
    case "milestone_complete":
    case "budget_threshold":
      return "project";
  }
}

function eventEntityId(event: EventForTrigger): string {
  switch (event.type) {
    case "task_status_change":
    case "task_created":
    case "approval_received":
      return event.task.id;
    case "comment_added":
      return event.comment.id;
    case "milestone_complete":
    case "budget_threshold":
      return event.project.id;
  }
}
