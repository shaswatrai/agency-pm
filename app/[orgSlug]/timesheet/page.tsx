"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  startOfWeek,
  addDays,
  format,
  parseISO,
  addWeeks,
  subWeeks,
  isSameDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Timer,
  Send,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { useStore, useCurrentUser } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TimesheetStatus } from "@/types/domain";
import { TimesheetApprovalQueue } from "@/components/timesheet/TimesheetApprovalQueue";

const STATUS_META: Record<
  TimesheetStatus,
  { label: string; cls: string }
> = {
  draft: {
    label: "Draft",
    cls: "bg-status-todo/15 text-status-todo",
  },
  submitted: {
    label: "Submitted",
    cls: "bg-status-progress/15 text-status-progress",
  },
  approved: {
    label: "Approved",
    cls: "bg-status-done/15 text-status-done",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-status-blocked/15 text-status-blocked",
  },
};

export default function TimesheetPage() {
  const currentUser = useCurrentUser();
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const users = useStore((s) => s.users);
  const allTimeEntries = useStore((s) => s.timeEntries);
  const submissions = useStore((s) => s.timesheetSubmissions);
  const setStatus = useStore((s) => s.setTimesheetStatus);
  const timeEntries = allTimeEntries.filter(
    (e) => e.userId === currentUser.id,
  );

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date("2026-04-26"), { weekStartsOn: 1 }),
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Group entries by task
  const entriesByTaskAndDay = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const e of timeEntries) {
      if (!map.has(e.taskId)) map.set(e.taskId, new Map());
      const dayKey = e.date;
      const inner = map.get(e.taskId)!;
      inner.set(dayKey, (inner.get(dayKey) ?? 0) + e.durationMinutes);
    }
    return map;
  }, [timeEntries]);

  const taskRows = Array.from(entriesByTaskAndDay.keys()).map((taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    const project = task ? projects.find((p) => p.id === task.projectId) : undefined;
    return { taskId, task, project };
  });

  const dayTotals = days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    let total = 0;
    entriesByTaskAndDay.forEach((days) => {
      total += days.get(key) ?? 0;
    });
    return total;
  });

  const weekTotal = dayTotals.reduce((s, n) => s + n, 0);

  // Find the current week's submission for this user
  const weekKey = format(weekStart, "yyyy-MM-dd");
  const ownSubmission = submissions.find(
    (s) => s.userId === currentUser.id && s.weekStart === weekKey,
  );
  const ownStatus: TimesheetStatus = ownSubmission?.status ?? "draft";

  const handleSubmit = () => {
    if (weekTotal === 0) {
      toast.error("Log some time first before submitting");
      return;
    }
    if (ownSubmission) {
      setStatus(ownSubmission.id, "submitted", { reviewerId: undefined });
    } else {
      // Create a new submission inline
      const id = `ts_new_${Date.now()}`;
      useStore.setState((state) => ({
        timesheetSubmissions: [
          ...state.timesheetSubmissions,
          {
            id,
            organizationId: state.organization.id,
            userId: currentUser.id,
            weekStart: weekKey,
            status: "submitted",
            totalMinutes: weekTotal,
            billableMinutes: weekTotal,
            entryIds: [],
            submittedAt: new Date().toISOString(),
          },
        ],
      }));
    }
    toast.success(`Week submitted for approval`, {
      description: `${(weekTotal / 60).toFixed(1)}h to your PM`,
    });
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Timesheet
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Week of {format(weekStart, "MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-medium",
              STATUS_META[ownStatus].cls,
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {STATUS_META[ownStatus].label}
          </span>
          <Button variant="outline" size="sm">
            <Timer className="size-4" /> Start timer
          </Button>
          <Button variant="outline" size="sm">
            <Plus className="size-4" /> Log time
          </Button>
          {ownStatus === "draft" || ownStatus === "rejected" ? (
            <Button size="sm" onClick={handleSubmit}>
              <Send className="size-4" /> Submit week
            </Button>
          ) : null}
        </div>
      </motion.div>

      {/* Rejection feedback for the current week */}
      <AnimatePresence>
        {ownSubmission?.status === "rejected" &&
        ownSubmission.rejectionReason ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-5 flex items-start gap-3 rounded-md border border-status-blocked/30 bg-status-blocked/5 p-3 text-xs"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-status-blocked" />
            <div>
              <p className="font-medium text-status-blocked">
                This week was rejected
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {ownSubmission.rejectionReason}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekStart((w) => subWeeks(w, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            This week
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Week total: </span>
          <span className="font-mono text-base font-semibold">
            {(weekTotal / 60).toFixed(1)}h
          </span>
          <span className="ml-1 text-muted-foreground">/ 40h target</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-[minmax(240px,2fr)_repeat(7,1fr)_120px] divide-x">
          <div className="bg-muted/40 px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Task
          </div>
          {days.map((d) => {
            const isToday =
              format(d, "yyyy-MM-dd") ===
              format(new Date("2026-04-28"), "yyyy-MM-dd");
            return (
              <div
                key={d.toISOString()}
                className={cn(
                  "bg-muted/40 px-3 py-3 text-center",
                  isToday && "bg-primary/10",
                )}
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {format(d, "EEE")}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-sm font-medium",
                    isToday && "text-primary",
                  )}
                >
                  {format(d, "d")}
                </p>
              </div>
            );
          })}
          <div className="bg-muted/40 px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Total
          </div>
        </div>

        {taskRows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No time logged this week. Start a timer or log entries manually.
          </div>
        ) : (
          taskRows.map(({ taskId, task, project }) => {
            const entries = entriesByTaskAndDay.get(taskId)!;
            const rowTotal = Array.from(entries.values()).reduce(
              (s, n) => s + n,
              0,
            );
            return (
              <div
                key={taskId}
                className="grid grid-cols-[minmax(240px,2fr)_repeat(7,1fr)_120px] divide-x border-t hover:bg-accent/40"
              >
                <div className="px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {project?.name ?? "—"}
                  </p>
                  <p className="text-sm font-medium">{task?.title ?? "Task"}</p>
                </div>
                {days.map((d) => {
                  const minutes = entries.get(format(d, "yyyy-MM-dd")) ?? 0;
                  return (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        "px-3 py-3 text-center font-mono text-sm",
                        minutes === 0 && "text-muted-foreground/40",
                      )}
                    >
                      {minutes > 0 ? (minutes / 60).toFixed(1) : "—"}
                    </div>
                  );
                })}
                <div className="px-3 py-3 text-right font-mono text-sm font-medium">
                  {(rowTotal / 60).toFixed(1)}h
                </div>
              </div>
            );
          })
        )}

        <div className="grid grid-cols-[minmax(240px,2fr)_repeat(7,1fr)_120px] divide-x border-t bg-muted/30">
          <div className="px-4 py-3 text-sm font-semibold">Daily total</div>
          {dayTotals.map((m, i) => (
            <div
              key={i}
              className="px-3 py-3 text-center font-mono text-sm font-semibold"
            >
              {m > 0 ? (m / 60).toFixed(1) : "—"}
            </div>
          ))}
          <div className="px-3 py-3 text-right font-mono text-sm font-semibold">
            {(weekTotal / 60).toFixed(1)}h
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold">Recent entries</h3>
        <ul className="mt-3 divide-y">
          {timeEntries.slice(-5).reverse().map((e) => {
            const t = tasks.find((x) => x.id === e.taskId);
            const p = t ? projects.find((x) => x.id === t.projectId) : undefined;
            return (
              <li
                key={e.id}
                className="flex items-center justify-between gap-4 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate">{e.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {p?.name} · {t?.title}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">
                    {(e.durationMinutes / 60).toFixed(1)}h
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(parseISO(e.date), "EEE MMM d")}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <TimesheetApprovalQueue />
    </div>
  );
}
