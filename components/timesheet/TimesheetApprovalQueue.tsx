"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
  X,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/UserAvatar";
import { useStore, useCurrentUser } from "@/lib/db/store";
import { toast } from "sonner";
import type { TimesheetSubmission } from "@/types/domain";

/**
 * PM approval queue for submitted timesheets. Replaces the old
 * prompt()-based rejection flow with:
 *   - Expandable per-submission drill-down (per-day per-task)
 *   - Inline reject dialog with required reason
 *   - Bulk select + approve
 *   - Recently reviewed history strip (last 14 days)
 */
export function TimesheetApprovalQueue() {
  const me = useCurrentUser();
  const submissions = useStore((s) => s.timesheetSubmissions);
  const setStatus = useStore((s) => s.setTimesheetStatus);
  const users = useStore((s) => s.users);

  const isPM =
    me.role === "pm" || me.role === "admin" || me.role === "super_admin";
  const pending = useMemo(
    () => submissions.filter((s) => s.status === "submitted"),
    [submissions],
  );
  const recent = useMemo(() => {
    const fortnightAgo = Date.now() - 14 * 86_400_000;
    return submissions
      .filter(
        (s) =>
          (s.status === "approved" || s.status === "rejected") &&
          s.reviewedAt &&
          new Date(s.reviewedAt).getTime() > fortnightAgo,
      )
      .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))
      .slice(0, 5);
  }, [submissions]);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<TimesheetSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (!isPM) return null;

  const allSelected = pending.length > 0 && selected.size === pending.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function approve(id: string) {
    setStatus(id, "approved", { reviewerId: me.id });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (expanded === id) setExpanded(null);
    toast.success("Timesheet approved");
  }

  function bulkApprove() {
    if (selected.size === 0) return;
    for (const id of selected) {
      setStatus(id, "approved", { reviewerId: me.id });
    }
    toast.success(`${selected.size} timesheet${selected.size === 1 ? "" : "s"} approved`);
    setSelected(new Set());
  }

  function confirmReject() {
    if (!rejecting) return;
    if (!rejectReason.trim()) {
      toast.error("Add a reason so the team member knows what to fix");
      return;
    }
    setStatus(rejecting.id, "rejected", {
      reviewerId: me.id,
      rejectionReason: rejectReason.trim(),
    });
    toast.success("Timesheet rejected with feedback");
    setRejecting(null);
    setRejectReason("");
  }

  return (
    <>
      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-primary" /> Approval queue
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {pending.length} timesheet{pending.length === 1 ? "" : "s"} waiting
              {selected.size > 0 ? ` · ${selected.size} selected` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {pending.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelected(allSelected ? new Set() : new Set(pending.map((p) => p.id)))}
              >
                {allSelected ? <Square className="size-3.5" /> : <CheckSquare className="size-3.5" />}
                {allSelected ? "Deselect all" : "Select all"}
              </Button>
            )}
            {selected.size > 0 && (
              <Button size="sm" onClick={bulkApprove}>
                <CheckCircle2 className="size-3.5" /> Approve {selected.size}
              </Button>
            )}
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="grid place-items-center px-5 py-10 text-center">
            <CheckCircle2 className="mb-2 size-7 text-status-done" />
            <p className="text-sm font-medium">No pending approvals</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              All submitted timesheets are reviewed.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            <AnimatePresence initial={false}>
              {pending.map((sub) => {
                const submitter = users.find((u) => u.id === sub.userId);
                const isExpanded = expanded === sub.id;
                const isSelected = selected.has(sub.id);
                return (
                  <motion.li
                    key={sub.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 30, height: 0 }}
                  >
                    <div className="flex items-center gap-3 px-5 py-3">
                      <button
                        onClick={() => toggle(sub.id)}
                        className="grid size-5 shrink-0 place-items-center rounded border hover:bg-accent"
                        aria-label="Select submission"
                      >
                        {isSelected ? (
                          <CheckSquare className="size-3.5 text-primary" />
                        ) : (
                          <Square className="size-3.5 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : sub.id)}
                        className="grid size-5 shrink-0 place-items-center rounded hover:bg-accent"
                        aria-label="Expand"
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronRight className="size-3.5" />
                        )}
                      </button>
                      <UserAvatar
                        user={{
                          name: submitter?.fullName ?? "?",
                          avatarUrl: submitter?.avatarUrl,
                        }}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{submitter?.fullName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Week of {format(parseISO(sub.weekStart), "MMM d")} ·{" "}
                          {(sub.totalMinutes / 60).toFixed(1)}h logged ·{" "}
                          {(sub.billableMinutes / 60).toFixed(1)}h billable
                          {sub.submittedAt
                            ? ` · submitted ${format(parseISO(sub.submittedAt), "MMM d, h:mm a")}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejecting(sub);
                            setRejectReason("");
                          }}
                        >
                          <X className="size-3.5" /> Reject
                        </Button>
                        <Button size="sm" onClick={() => approve(sub.id)}>
                          <CheckCircle2 className="size-3.5" /> Approve
                        </Button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExpanded && (
                        <SubmissionBreakdown submission={sub} />
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </Card>

      {recent.length > 0 && (
        <Card className="mt-4 overflow-hidden">
          <div className="flex items-center gap-2 border-b px-5 py-2.5">
            <History className="size-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recently reviewed
            </h3>
          </div>
          <ul className="divide-y">
            {recent.map((sub) => {
              const submitter = users.find((u) => u.id === sub.userId);
              return (
                <li key={sub.id} className="flex items-center gap-3 px-5 py-2 text-xs">
                  <span
                    className={`rounded-pill px-1.5 py-0.5 text-[10px] font-medium ${
                      sub.status === "approved"
                        ? "bg-status-done/15 text-status-done"
                        : "bg-status-blocked/15 text-status-blocked"
                    }`}
                  >
                    {sub.status}
                  </span>
                  <span className="font-medium">{submitter?.fullName}</span>
                  <span className="text-muted-foreground">
                    week of {format(parseISO(sub.weekStart), "MMM d")} ·{" "}
                    {(sub.totalMinutes / 60).toFixed(1)}h
                  </span>
                  {sub.rejectionReason && (
                    <span className="ml-auto truncate italic text-muted-foreground">
                      "{sub.rejectionReason}"
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Dialog open={rejecting !== null} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject timesheet</DialogTitle>
            <DialogDescription>
              {rejecting && (
                <>
                  {users.find((u) => u.id === rejecting.userId)?.fullName} ·{" "}
                  week of {format(parseISO(rejecting.weekStart), "MMM d")} ·{" "}
                  {(rejecting.totalMinutes / 60).toFixed(1)}h logged
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-medium">Reason for rejection</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              autoFocus
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="What needs to be corrected? The team member sees this verbatim."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmReject}
              disabled={!rejectReason.trim()}
              className="border-destructive/30 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <X className="mr-1 size-3.5" />
              Reject with feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SubmissionBreakdown({ submission }: { submission: TimesheetSubmission }) {
  const allEntries = useStore((s) => s.timeEntries);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);

  // Sum per task across the week (Mon..Sun starting weekStart)
  const start = parseISO(submission.weekStart);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const userEntries = allEntries.filter((e) => e.userId === submission.userId);
  const inWeek = userEntries.filter((e) => {
    const d = parseISO(e.date);
    return (
      d.getTime() >= days[0].getTime() &&
      d.getTime() <= days[6].getTime() + 86_400_000
    );
  });

  const byTask = new Map<string, Map<string, number>>();
  for (const e of inWeek) {
    if (!byTask.has(e.taskId)) byTask.set(e.taskId, new Map());
    const inner = byTask.get(e.taskId)!;
    inner.set(e.date, (inner.get(e.date) ?? 0) + e.durationMinutes);
  }

  if (byTask.size === 0) {
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="overflow-hidden"
      >
        <div className="border-t bg-muted/30 px-5 py-4 text-xs text-muted-foreground">
          No time entries recorded in this week range.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden"
    >
      <div className="border-t bg-muted/30 px-5 py-3">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-1.5 pr-3">Task</th>
                {days.map((d, i) => (
                  <th key={i} className="pb-1.5 pr-2 text-right font-mono">
                    {format(d, "EEE")[0]}
                  </th>
                ))}
                <th className="pb-1.5 pr-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(byTask.entries()).map(([taskId, perDay]) => {
                const task = tasks.find((t) => t.id === taskId);
                const project = task ? projects.find((p) => p.id === task.projectId) : null;
                const total = Array.from(perDay.values()).reduce((s, n) => s + n, 0);
                return (
                  <tr key={taskId} className="border-b last:border-b-0">
                    <td className="py-1.5 pr-3">
                      <p className="truncate font-medium">{task?.title ?? "(deleted task)"}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {project?.code ?? ""} · {task?.code ?? ""}
                      </p>
                    </td>
                    {days.map((d, i) => {
                      const key = format(d, "yyyy-MM-dd");
                      const m = perDay.get(key) ?? 0;
                      return (
                        <td key={i} className="py-1.5 pr-2 text-right font-mono">
                          {m > 0 ? (m / 60).toFixed(1) : "—"}
                        </td>
                      );
                    })}
                    <td className="py-1.5 pr-2 text-right font-mono font-semibold">
                      {(total / 60).toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
