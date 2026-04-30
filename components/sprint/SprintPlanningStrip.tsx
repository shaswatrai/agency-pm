"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Users } from "lucide-react";
import { useStore } from "@/lib/db/store";
import { STORY_POINT_FALLBACK } from "@/lib/sprint/metrics";

interface Props {
  projectId: string;
  /** Length of the upcoming sprint in days. */
  sprintDays?: number;
}

/**
 * Sprint planning capacity indicator (PRD §5.13). Shows committed
 * story points vs. team available capacity for the next sprint
 * window so the PM doesn't over-commit.
 *
 * Capacity computation: each member of the project team contributes
 * their weekly_capacity (defaults to 40h) × sprintDays/7. Velocity
 * conversion uses 1 story point ≈ 2 hours.
 */
export function SprintPlanningStrip({ projectId, sprintDays = 14 }: Props) {
  const tasks = useStore((s) => s.tasks);
  const users = useStore((s) => s.users);
  const projects = useStore((s) => s.projects);

  const project = projects.find((p) => p.id === projectId);

  const stats = useMemo(() => {
    const projectTasks = tasks.filter((t) => t.projectId === projectId);
    // "Committed" approximation: anything not Done.
    const committed = projectTasks
      .filter((t) => t.status !== "done")
      .reduce((s, t) => s + STORY_POINT_FALLBACK(t), 0);

    // Project team = anyone listed as an assignee on the project + the PM
    const assignees = new Set<string>();
    for (const t of projectTasks) for (const a of t.assigneeIds) assignees.add(a);
    if (project?.projectManagerId) assignees.add(project.projectManagerId);

    const team = users.filter((u) => assignees.has(u.id));
    // 40h/week default, scaled to sprint length
    const hoursPerSprint =
      ((sprintDays / 7) * 40) * Math.max(1, team.length);
    const capacityPoints = Math.round(hoursPerSprint / 2);
    const utilization = capacityPoints === 0 ? 0 : (committed / capacityPoints) * 100;
    return { committed, capacityPoints, team, utilization };
  }, [tasks, users, projects, projectId, sprintDays, project]);

  const severity =
    stats.utilization > 100 ? "red" : stats.utilization > 85 ? "amber" : "green";
  const meta = {
    green: {
      label: "Capacity OK",
      cls: "border-status-done/30 bg-status-done/5 text-status-done",
      barCls: "bg-status-done",
    },
    amber: {
      label: "Tight",
      cls: "border-status-revisions/30 bg-status-revisions/5 text-status-revisions",
      barCls: "bg-status-revisions",
    },
    red: {
      label: "Over capacity",
      cls: "border-status-blocked/30 bg-status-blocked/5 text-status-blocked",
      barCls: "bg-status-blocked",
    },
  }[severity];

  const Icon = severity === "red" ? AlertTriangle : CheckCircle2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-md border p-3 ${meta.cls}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-4" />
        <p className="text-xs font-semibold uppercase tracking-wider">
          Sprint planning · {meta.label}
        </p>
      </div>
      <div className="mt-2 flex items-end justify-between text-[11px]">
        <span>
          <span className="font-mono font-semibold">{stats.committed}</span> pts
          committed
        </span>
        <span className="text-muted-foreground">
          of <span className="font-mono">{stats.capacityPoints}</span> pts
          capacity
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(140, stats.utilization)}%` }}
          transition={{ duration: 0.6 }}
          className={`h-full ${meta.barCls}`}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="size-2.5" />
          {stats.team.length} contributor{stats.team.length === 1 ? "" : "s"}
        </span>
        <span>{stats.utilization.toFixed(0)}% utilization</span>
      </div>
    </motion.div>
  );
}
