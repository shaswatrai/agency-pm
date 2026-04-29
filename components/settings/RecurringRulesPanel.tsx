"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Repeat,
  Plus,
  Trash2,
  Play,
  Pause,
  Calendar,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/db/store";
import { materialiseRecurringTasks } from "@/lib/automation/recurring";
import type {
  RecurrenceFreq,
  RecurringTaskRule,
} from "@/types/domain";
import type { TaskPriority } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function describeRule(rule: RecurringTaskRule): string {
  const every =
    rule.intervalCount === 1
      ? rule.freq.replace(/y$/, "")
      : `${rule.intervalCount} ${rule.freq}s`;
  if (rule.freq === "weekly" && rule.dayOfWeek != null) {
    return `Every ${every} on ${DOW_LABELS[rule.dayOfWeek]}`;
  }
  if (rule.freq === "monthly" && rule.dayOfMonth != null) {
    return `Every ${every} on day ${rule.dayOfMonth}`;
  }
  return `Every ${every}`;
}

export function RecurringRulesPanel() {
  const rules = useStore((s) => s.recurringRules);
  const projects = useStore((s) => s.projects);
  const phases = useStore((s) => s.phases);
  const addRecurringRule = useStore((s) => s.addRecurringRule);
  const toggleRecurringRule = useStore((s) => s.toggleRecurringRule);
  const removeRecurringRule = useStore((s) => s.removeRecurringRule);

  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [phaseId, setPhaseId] = useState<string>("");
  const [freq, setFreq] = useState<RecurrenceFreq>("monthly");
  const [intervalCount, setIntervalCount] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1); // Mon
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [startDate, setStartDate] = useState(
    format(new Date("2026-04-29"), "yyyy-MM-dd"),
  );
  const [taskTitle, setTaskTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [estHours, setEstHours] = useState<number | "">(4);

  const projectPhases = phases.filter((p) => p.projectId === projectId);

  const reset = () => {
    setName("");
    setProjectId("");
    setPhaseId("");
    setFreq("monthly");
    setIntervalCount(1);
    setDayOfWeek(1);
    setDayOfMonth(1);
    setStartDate(format(new Date("2026-04-29"), "yyyy-MM-dd"));
    setTaskTitle("");
    setPriority("medium");
    setEstHours(4);
    setCreating(false);
  };

  const submit = () => {
    if (!name.trim() || !projectId || !taskTitle.trim()) {
      toast.error("Name, project, and task title are required");
      return;
    }
    addRecurringRule({
      name: name.trim(),
      projectId,
      phaseId: phaseId || undefined,
      isActive: true,
      freq,
      intervalCount,
      dayOfWeek: freq === "weekly" ? dayOfWeek : undefined,
      dayOfMonth: freq === "monthly" ? dayOfMonth : undefined,
      startDate,
      taskTemplate: {
        title: taskTitle.trim(),
        priority,
        estimatedHours: estHours === "" ? undefined : Number(estHours),
        assigneeIds: [],
        clientVisible: false,
        tags: [],
      },
    });
    toast.success(`Recurring rule "${name}" created`);
    reset();
  };

  const runNow = async () => {
    setRunning(true);
    const results = materialiseRecurringTasks();
    const total = results.reduce((s, r) => s + r.generated, 0);
    setRunning(false);
    if (total === 0) {
      toast.info("Nothing due — every active rule is up to date");
    } else {
      toast.success(`Generated ${total} task${total === 1 ? "" : "s"}`, {
        description: results
          .filter((r) => r.generated > 0)
          .map((r) => `${r.ruleName}: ${r.generated}`)
          .join(" · "),
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Recurring task rules</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Auto-generate tasks on a daily / weekly / monthly schedule. Best
            for monthly retainer work or weekly QA passes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runNow}
            disabled={running || rules.length === 0}
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Run now
          </Button>
          <Dialog
            open={creating}
            onOpenChange={(o) => (o ? setCreating(true) : reset())}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> New rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New recurring rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Name
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Monthly SEO audit · Studio Atelier"
                    className="mt-1.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Project
                    </Label>
                    <select
                      value={projectId}
                      onChange={(e) => {
                        setProjectId(e.target.value);
                        setPhaseId("");
                      }}
                      className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Pick a project…</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Phase (optional)
                    </Label>
                    <select
                      value={phaseId}
                      onChange={(e) => setPhaseId(e.target.value)}
                      disabled={!projectId}
                      className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                    >
                      <option value="">No phase</option>
                      {projectPhases.map((ph) => (
                        <option key={ph.id} value={ph.id}>
                          {ph.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Frequency
                    </Label>
                    <select
                      value={freq}
                      onChange={(e) =>
                        setFreq(e.target.value as RecurrenceFreq)
                      }
                      className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Every
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={intervalCount}
                      onChange={(e) =>
                        setIntervalCount(
                          Math.max(1, Number(e.target.value) || 1),
                        )
                      }
                      className="mt-1.5"
                    />
                  </div>
                  {freq === "weekly" ? (
                    <div>
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Day of week
                      </Label>
                      <select
                        value={dayOfWeek}
                        onChange={(e) => setDayOfWeek(Number(e.target.value))}
                        className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {DOW_LABELS.map((d, i) => (
                          <option key={d} value={i}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : freq === "monthly" ? (
                    <div>
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Day of month
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        value={dayOfMonth}
                        onChange={(e) =>
                          setDayOfMonth(
                            Math.max(
                              1,
                              Math.min(28, Number(e.target.value) || 1),
                            ),
                          )
                        }
                        className="mt-1.5"
                      />
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Start date
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Generated task
                  </p>
                  <div className="space-y-2">
                    <Input
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder='Task title (use "{date}" for the run date)'
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={priority}
                        onChange={(e) =>
                          setPriority(e.target.value as TaskPriority)
                        }
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="low">Low priority</option>
                        <option value="medium">Medium priority</option>
                        <option value="high">High priority</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={estHours}
                        onChange={(e) =>
                          setEstHours(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder="Estimated hours"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={reset}>
                  Cancel
                </Button>
                <Button onClick={submit}>Create rule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        {rules.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <Repeat className="size-5" />
            </div>
            <p className="text-sm font-medium">No recurring rules yet</p>
            <p className="text-xs text-muted-foreground">
              Create one to auto-generate tasks on a schedule.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            <AnimatePresence initial={false}>
              {rules.map((r) => {
                const project = projects.find((p) => p.id === r.projectId);
                const phase = phases.find((p) => p.id === r.phaseId);
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start justify-between gap-3 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            !r.isActive && "text-muted-foreground line-through",
                          )}
                        >
                          {r.name}
                        </p>
                        <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                          {r.freq}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {describeRule(r)} · creates "
                        {r.taskTemplate.title}" in {project?.name ?? "—"}
                        {phase ? ` · ${phase.name}` : ""}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3" />
                          Starts {format(parseISO(r.startDate), "MMM d, yyyy")}
                        </span>
                        {r.lastRunAt ? (
                          <span>
                            Last run {format(parseISO(r.lastRunAt), "MMM d")}
                          </span>
                        ) : (
                          <span>Never run</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={r.isActive}
                        onCheckedChange={() => toggleRecurringRule(r.id)}
                        aria-label={r.isActive ? "Pause" : "Activate"}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete recurring rule "${r.name}"? Already generated tasks stay.`,
                            )
                          ) {
                            removeRecurringRule(r.id);
                            toast.success("Recurring rule removed");
                          }
                        }}
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="rounded-md border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground">
        Rules run once on app boot, plus whenever you click <em>Run now</em>.
        Use <code className="font-mono">{`{date}`}</code> in the task title to
        substitute the run date (e.g.{" "}
        <code className="font-mono">"SEO report — {`{date}`}"</code> →{" "}
        <code className="font-mono">"SEO report — Apr 29"</code>).
      </div>
    </div>
  );
}
