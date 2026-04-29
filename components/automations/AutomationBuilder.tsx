"use client";

/**
 * Visual automation rule builder.
 *
 * Linear three-step flow inside a dialog: Trigger → Conditions → Actions.
 * Each step renders a panel of cards; the "current" step gets a chevron
 * indicator and live-updates the preview at the bottom.
 *
 * The shape we emit matches AutomationRule: trigger is one AutomationStep,
 * conditions is an array (currently free-form key/value pairs persisted for
 * future engine work), actions is an array of AutomationStep with optional
 * meta. The engine evaluator already knows how to consume target-status on
 * task_status_change and userId on assign_user; the rest is no-op meta we
 * preserve for future passes.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Bell,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileSignature,
  Mail,
  MessageSquare,
  PlayCircle,
  Plus,
  Repeat,
  Slack,
  Sparkles,
  Trash2,
  TrendingUp,
  UserPlus,
  Webhook,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import type {
  AutomationActionType,
  AutomationRule,
  AutomationStep,
  AutomationTriggerType,
} from "@/types/domain";

// ── Catalog ──────────────────────────────────────────────────────────

interface TriggerOption {
  type: AutomationTriggerType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TRIGGERS: TriggerOption[] = [
  {
    type: "task_status_change",
    label: "Task status changes",
    description: "When any task moves to a specific status",
    icon: TrendingUp,
  },
  {
    type: "task_created",
    label: "Task is created",
    description: "When a new task lands in any project",
    icon: Plus,
  },
  {
    type: "task_overdue",
    label: "Task becomes overdue",
    description: "When a due date passes without status = done",
    icon: CalendarClock,
  },
  {
    type: "comment_added",
    label: "Comment is added",
    description: "When a teammate comments on any task",
    icon: MessageSquare,
  },
  {
    type: "approval_received",
    label: "Client approves a deliverable",
    description: "Client-visible task moves to done",
    icon: ClipboardCheck,
  },
  {
    type: "milestone_complete",
    label: "Milestone completes",
    description: "All tasks in a phase / project hit done",
    icon: Sparkles,
  },
  {
    type: "budget_threshold",
    label: "Budget threshold crossed",
    description: "Project burn passes a % of total budget",
    icon: CircleDollarSign,
  },
  {
    type: "time_logged_threshold",
    label: "Time logged threshold",
    description: "Hours logged on a task pass an estimate",
    icon: Activity,
  },
  {
    type: "schedule_recurring",
    label: "On a schedule",
    description: "Time-based — daily / weekly / monthly",
    icon: Repeat,
  },
];

interface ActionOption {
  type: AutomationActionType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Free-form meta fields the user can fill in. */
  metaFields?: Array<{
    key: string;
    label: string;
    placeholder?: string;
    kind: "text" | "user-picker" | "status";
  }>;
}

const ACTIONS: ActionOption[] = [
  {
    type: "send_notification",
    label: "Send in-app notification",
    description: "Toast + activity entry, no email or external service",
    icon: Bell,
  },
  {
    type: "send_email",
    label: "Send email",
    description: "Via Resend; routes to assignee / PM based on event",
    icon: Mail,
  },
  {
    type: "post_slack",
    label: "Post to Slack",
    description: "Channel notification (Pass 7 integration — queued today)",
    icon: Slack,
    metaFields: [
      { key: "channel", label: "Channel", placeholder: "#general", kind: "text" },
    ],
  },
  {
    type: "change_status",
    label: "Change task status",
    description: "Forces a task into a specific status",
    icon: TrendingUp,
    metaFields: [
      { key: "status", label: "Target status", kind: "status" },
    ],
  },
  {
    type: "assign_user",
    label: "Assign to teammate",
    description: "Auto-assign — works on task_created today",
    icon: UserPlus,
    metaFields: [
      { key: "userId", label: "Assignee", kind: "user-picker" },
    ],
  },
  {
    type: "create_task",
    label: "Create a task",
    description: "Spawn a follow-up task from the trigger event",
    icon: Plus,
    metaFields: [
      {
        key: "title",
        label: "Task title",
        placeholder: "Follow-up after milestone",
        kind: "text",
      },
    ],
  },
  {
    type: "create_invoice",
    label: "Create draft invoice",
    description: "Wired today for client-approved milestones",
    icon: FileSignature,
  },
  {
    type: "update_priority",
    label: "Update project health / priority",
    description: "e.g. flip health to yellow on budget overrun",
    icon: AlertCircle,
  },
  {
    type: "webhook",
    label: "Call a webhook",
    description: "POST event JSON to a URL (Pass 7 integration)",
    icon: Webhook,
    metaFields: [
      {
        key: "url",
        label: "Webhook URL",
        placeholder: "https://example.com/hook",
        kind: "text",
      },
    ],
  },
];

const STATUSES: { value: string; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "revisions", label: "Revisions" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const CATEGORIES: AutomationRule["category"][] = [
  "status",
  "assignment",
  "deadline",
  "budget",
  "approval",
  "recurring",
];

// ── Helpers ──────────────────────────────────────────────────────────

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Math.random().toString(36).slice(2, 10)}`;
}

function inferCategory(
  trigger: AutomationTriggerType | null,
): AutomationRule["category"] {
  if (!trigger) return "status";
  if (trigger === "task_status_change" || trigger === "task_created")
    return "status";
  if (trigger === "comment_added") return "assignment";
  if (trigger === "task_overdue" || trigger === "schedule_recurring")
    return "deadline";
  if (trigger === "budget_threshold" || trigger === "time_logged_threshold")
    return "budget";
  if (trigger === "approval_received" || trigger === "milestone_complete")
    return "approval";
  return "status";
}

function actionIcon(type: string) {
  return ACTIONS.find((a) => a.type === type)?.icon ?? Zap;
}

// ── Component ────────────────────────────────────────────────────────

export function AutomationBuilder({
  open,
  onOpenChange,
  editingRule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule?: AutomationRule | null;
}) {
  const users = useStore((s) => s.users);
  const addAutomation = useStore((s) => s.addAutomation);
  const updateAutomation = useStore((s) => s.updateAutomation);

  const initial = editingRule;

  // Form state
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<AutomationRule["category"]>(
    initial?.category ?? "status",
  );
  const [trigger, setTrigger] = useState<AutomationStep | null>(
    initial?.trigger ?? null,
  );
  const [actions, setActions] = useState<AutomationStep[]>(
    initial?.actions ?? [],
  );
  const [conditions, setConditions] = useState<AutomationStep[]>(
    initial?.conditions ?? [],
  );

  // Derive whether the rule is sufficient to save
  const canSave =
    name.trim().length > 0 && trigger !== null && actions.length > 0;

  const triggerOpt = useMemo(
    () => (trigger ? TRIGGERS.find((t) => t.type === trigger.type) ?? null : null),
    [trigger],
  );

  const reset = () => {
    setName("");
    setDescription("");
    setCategory("status");
    setTrigger(null);
    setActions([]);
    setConditions([]);
  };

  const close = () => {
    onOpenChange(false);
  };

  const save = () => {
    if (!canSave || !trigger) return;
    const ruleData = {
      name: name.trim(),
      description: description.trim() || undefined,
      isActive: initial?.isActive ?? true,
      category,
      trigger,
      conditions,
      actions,
    };
    if (initial) {
      updateAutomation(initial.id, ruleData);
    } else {
      addAutomation(ruleData);
    }
    if (!initial) reset();
    close();
  };

  // ── Trigger picker ─────────────────────────────────────────────────
  const pickTrigger = (opt: TriggerOption) => {
    const step: AutomationStep = {
      id: uid(),
      type: opt.type,
      label: opt.label,
      description: opt.description,
      meta: {},
    };
    setTrigger(step);
    setCategory(inferCategory(opt.type));
  };

  // ── Action ops ─────────────────────────────────────────────────────
  const addAction = (opt: ActionOption) => {
    const step: AutomationStep = {
      id: uid(),
      type: opt.type,
      label: opt.label,
      description: opt.description,
      meta: {},
    };
    setActions((arr) => [...arr, step]);
  };

  const updateActionMeta = (id: string, key: string, value: string) => {
    setActions((arr) =>
      arr.map((a) =>
        a.id === id
          ? {
              ...a,
              meta: { ...(a.meta ?? {}), [key]: value },
            }
          : a,
      ),
    );
  };

  const removeAction = (id: string) => {
    setActions((arr) => arr.filter((a) => a.id !== id));
  };

  // ── Condition ops ──────────────────────────────────────────────────
  const addCondition = () => {
    setConditions((arr) => [
      ...arr,
      {
        id: uid(),
        type: "task_status_change",
        label: "Custom condition",
        description: "Persisted for future engine work",
        meta: { key: "", value: "" },
      },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit automation" : "New automation"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Top: name + description + category */}
          <section className="space-y-3">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Rule name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Notify PM when budget hits 80%"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Description (optional)
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Plain-English summary of why this rule exists"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Category
              </Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-pill border px-2.5 py-1 text-[11px] transition-colors",
                      c === category
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-card text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Step 1: Trigger */}
          <BuilderStep
            number={1}
            title="When this happens (trigger)"
            done={!!trigger}
          >
            {trigger ? (
              <SelectedTrigger
                trigger={trigger}
                triggerOpt={triggerOpt}
                statuses={STATUSES}
                onChangeMeta={(key, value) =>
                  setTrigger((t) =>
                    t ? { ...t, meta: { ...(t.meta ?? {}), [key]: value } } : t,
                  )
                }
                onClear={() => setTrigger(null)}
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TRIGGERS.map((t) => (
                  <CardButton
                    key={t.type}
                    icon={t.icon}
                    label={t.label}
                    description={t.description}
                    onClick={() => pickTrigger(t)}
                  />
                ))}
              </div>
            )}
          </BuilderStep>

          {/* Step 2: Conditions (optional) */}
          <BuilderStep
            number={2}
            title="Optional filters (conditions)"
            done={true}
            optional
          >
            <p className="text-xs text-muted-foreground">
              Conditions are persisted with the rule and will be evaluated by
              the engine in future passes. For now, the engine respects the
              trigger's target status (e.g. <em>only when status = done</em>)
              and ignores extra conditions.
            </p>
            <div className="mt-2 space-y-2">
              {conditions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-md border bg-muted/30 p-2"
                >
                  <Input
                    value={c.meta?.key ?? ""}
                    onChange={(e) =>
                      setConditions((arr) =>
                        arr.map((cc) =>
                          cc.id === c.id
                            ? {
                                ...cc,
                                meta: {
                                  ...(cc.meta ?? {}),
                                  key: e.target.value,
                                },
                              }
                            : cc,
                        ),
                      )
                    }
                    placeholder="field (e.g. priority)"
                    className="h-8 flex-1 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">=</span>
                  <Input
                    value={c.meta?.value ?? ""}
                    onChange={(e) =>
                      setConditions((arr) =>
                        arr.map((cc) =>
                          cc.id === c.id
                            ? {
                                ...cc,
                                meta: {
                                  ...(cc.meta ?? {}),
                                  value: e.target.value,
                                },
                              }
                            : cc,
                        ),
                      )
                    }
                    placeholder="value (e.g. urgent)"
                    className="h-8 flex-1 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      setConditions((arr) => arr.filter((cc) => cc.id !== c.id))
                    }
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addCondition}
                className="h-8 text-[11px]"
              >
                <Plus className="size-3" /> Add condition
              </Button>
            </div>
          </BuilderStep>

          {/* Step 3: Actions */}
          <BuilderStep
            number={3}
            title="Then do this (actions)"
            done={actions.length > 0}
          >
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {actions.map((a) => {
                  const opt = ACTIONS.find((o) => o.type === a.type);
                  if (!opt) return null;
                  const Icon = opt.icon;
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-md border bg-card p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {opt.description}
                          </p>
                          {opt.metaFields && opt.metaFields.length > 0 ? (
                            <div className="mt-2 space-y-1.5">
                              {opt.metaFields.map((f) => (
                                <ActionMetaField
                                  key={f.key}
                                  field={f}
                                  value={a.meta?.[f.key] ?? ""}
                                  users={users}
                                  statuses={STATUSES}
                                  onChange={(v) =>
                                    updateActionMeta(a.id, f.key, v)
                                  }
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeAction(a.id)}
                        >
                          <Trash2 className="size-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <details className="rounded-md border">
                <summary className="cursor-pointer list-none p-3 text-xs font-medium hover:bg-accent">
                  <span className="inline-flex items-center gap-2">
                    <Plus className="size-3.5" /> Add action
                  </span>
                </summary>
                <div className="border-t bg-muted/20 p-2">
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {ACTIONS.map((opt) => (
                      <CardButton
                        key={opt.type}
                        icon={opt.icon}
                        label={opt.label}
                        description={opt.description}
                        compact
                        onClick={() => addAction(opt)}
                      />
                    ))}
                  </div>
                </div>
              </details>
            </div>
          </BuilderStep>

          {/* Live preview */}
          <section className="rounded-md border border-dashed bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <PlayCircle className="size-3.5" /> Preview
            </div>
            <p className="mt-1 text-sm">
              <strong>{name || "Untitled rule"}</strong>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="rounded-pill border bg-card px-2 py-0.5">
                When: {triggerOpt?.label ?? "—"}
                {trigger?.meta?.to ? (
                  <span className="ml-1 font-mono">→ {trigger.meta.to}</span>
                ) : null}
              </span>
              {conditions.length > 0 ? (
                <span className="rounded-pill border bg-card px-2 py-0.5">
                  +{conditions.length} condition
                  {conditions.length === 1 ? "" : "s"}
                </span>
              ) : null}
              <ChevronRight className="size-3" />
              {actions.length === 0 ? (
                <span className="rounded-pill border bg-card px-2 py-0.5 italic">
                  pick at least one action
                </span>
              ) : (
                actions.map((a) => {
                  const Icon = actionIcon(a.type);
                  return (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 rounded-pill border bg-card px-2 py-0.5"
                    >
                      <Icon className="size-3" />
                      {ACTIONS.find((o) => o.type === a.type)?.label}
                    </span>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={save}>
            {initial ? "Save changes" : "Create rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function BuilderStep({
  number,
  title,
  done,
  optional,
  children,
}: {
  number: number;
  title: string;
  done: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full text-[11px] font-semibold",
            done
              ? "bg-status-done/20 text-status-done"
              : "bg-muted text-muted-foreground",
          )}
        >
          {done ? <Check className="size-3" /> : number}
        </span>
        <h4 className="text-sm font-semibold">{title}</h4>
        {optional ? (
          <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Optional
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function CardButton({
  icon: Icon,
  label,
  description,
  onClick,
  compact = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-start gap-2.5 rounded-md border bg-card text-left transition-colors hover:border-primary/40 hover:bg-accent",
        compact ? "p-2" : "p-3",
      )}
    >
      <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/15">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
          {label}
        </p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

function SelectedTrigger({
  trigger,
  triggerOpt,
  statuses,
  onChangeMeta,
  onClear,
}: {
  trigger: AutomationStep;
  triggerOpt: TriggerOption | null;
  statuses: { value: string; label: string }[];
  onChangeMeta: (key: string, value: string) => void;
  onClear: () => void;
}) {
  const Icon = triggerOpt?.icon ?? Zap;
  return (
    <div className="space-y-3 rounded-md border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{triggerOpt?.label}</p>
          <p className="text-[11px] text-muted-foreground">
            {triggerOpt?.description}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Change
        </Button>
      </div>

      {/* Trigger-specific config */}
      {trigger.type === "task_status_change" ? (
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Target status
          </Label>
          <select
            value={trigger.meta?.to ?? ""}
            onChange={(e) => onChangeMeta("to", e.target.value)}
            className="mt-1.5 h-8 w-full rounded-md border border-input bg-background px-3 text-xs"
          >
            <option value="">Any status</option>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {trigger.type === "budget_threshold" ? (
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Threshold (% of budget)
          </Label>
          <Input
            value={trigger.meta?.threshold ?? ""}
            onChange={(e) => onChangeMeta("threshold", e.target.value)}
            type="number"
            min={1}
            max={100}
            placeholder="80"
            className="mt-1.5 h-8 text-xs"
          />
        </div>
      ) : null}

      {trigger.type === "schedule_recurring" ? (
        <p className="text-[11px] text-muted-foreground">
          For periodic tasks use Settings → Recurring tasks. Schedule-based
          rule firing is wired today via that engine; this trigger persists
          for future cron-style support.
        </p>
      ) : null}
    </div>
  );
}

function ActionMetaField({
  field,
  value,
  onChange,
  users,
  statuses,
}: {
  field: {
    key: string;
    label: string;
    placeholder?: string;
    kind: "text" | "user-picker" | "status";
  };
  value: string;
  onChange: (v: string) => void;
  users: { id: string; fullName: string }[];
  statuses: { value: string; label: string }[];
}) {
  if (field.kind === "user-picker") {
    return (
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {field.label}
        </Label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">Pick a teammate…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (field.kind === "status") {
    return (
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {field.label}
        </Label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">—</option>
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {field.label}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="mt-1 h-8 text-xs"
      />
    </div>
  );
}
