"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  startOfWeek,
  addDays,
  format,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { useStore } from "@/lib/db/store";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

const REFERENCE_DATE = new Date("2026-04-29");

function utilizationColor(pct: number) {
  if (pct < 0.4) return "bg-status-todo/30";
  if (pct < 0.6) return "bg-status-progress/30";
  if (pct < 0.85) return "bg-status-done/40";
  if (pct <= 1.0) return "bg-status-done";
  if (pct <= 1.15) return "bg-status-revisions/70";
  return "bg-status-blocked";
}

function utilizationLabel(pct: number) {
  if (pct < 0.4) return "Underused";
  if (pct < 0.85) return "Healthy";
  if (pct <= 1.0) return "Optimal";
  if (pct <= 1.15) return "At risk";
  return "Overloaded";
}

export default function UtilizationPage() {
  const users = useStore((s) => s.users);
  const allTasks = useStore((s) => s.tasks);
  const allProjects = useStore((s) => s.projects);

  // 8 weeks forward
  const weeks = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const start = addDays(
          startOfWeek(REFERENCE_DATE, { weekStartsOn: 1 }),
          i * 7,
        );
        return { start, end: addDays(start, 6) };
      }),
    [],
  );

  // Calculate utilization per user per week from task estimates and due dates.
  const utilizationGrid = useMemo(() => {
    return users.map((user) => {
      const weeklyHours = weeks.map(({ start, end }) => {
        const userTasks = allTasks.filter(
          (t) =>
            t.assigneeIds.includes(user.id) &&
            t.dueDate &&
            isWithinInterval(parseISO(t.dueDate), { start, end }) &&
            t.status !== "done",
        );
        const hours = userTasks.reduce(
          (s, t) =>
            s + (t.estimatedHours ?? 4) / Math.max(1, t.assigneeIds.length),
          0,
        );
        return { hours, tasks: userTasks.length };
      });
      const capacity = 40;
      return { user, weeklyHours, capacity };
    });
  }, [users, allTasks, weeks]);

  const orgUtilization = useMemo(() => {
    const allHours = utilizationGrid.flatMap((u) =>
      u.weeklyHours.map((w) => w.hours / u.capacity),
    );
    return allHours.reduce((s, n) => s + n, 0) / allHours.length;
  }, [utilizationGrid]);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Resource utilization
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            8-week forecast across {users.length} team members ·{" "}
            {allProjects.filter((p) => p.status === "active").length} active
            projects
          </p>
        </div>
        <div className="rounded-lg border bg-card px-5 py-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Org average
          </p>
          <p className="mt-0.5 font-mono text-2xl font-semibold">
            {Math.round(orgUtilization * 100)}%
          </p>
        </div>
      </motion.div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div
          className="grid border-b bg-muted/30"
          style={{
            gridTemplateColumns: `minmax(220px, 1fr) repeat(${weeks.length}, minmax(56px, 1fr))`,
          }}
        >
          <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Team member
          </div>
          {weeks.map((w) => (
            <div
              key={w.start.toISOString()}
              className="border-l px-2 py-2 text-center"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {format(w.start, "MMM d")}
              </p>
            </div>
          ))}
        </div>

        {utilizationGrid.map(({ user, weeklyHours, capacity }, i) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="grid border-b last:border-b-0 hover:bg-accent/30 transition-colors"
            style={{
              gridTemplateColumns: `minmax(220px, 1fr) repeat(${weeks.length}, minmax(56px, 1fr))`,
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <UserAvatar
                user={{ name: user.fullName, avatarUrl: user.avatarUrl }}
                size="sm"
              />
              <div>
                <p className="text-sm font-medium">{user.fullName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {user.role.replace("_", " ")} · {capacity}h/week
                </p>
              </div>
            </div>
            {weeklyHours.map((w, idx) => {
              const pct = w.hours / capacity;
              return (
                <div
                  key={idx}
                  className="border-l p-1.5 group/cell relative"
                >
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 + idx * 0.02 + i * 0.03 }}
                    className={cn(
                      "flex h-12 w-full items-center justify-center rounded-md text-[11px] font-mono font-medium transition-shadow hover:shadow-sm cursor-default",
                      utilizationColor(pct),
                      pct > 1.0 ? "text-white" : "text-foreground",
                    )}
                  >
                    {w.hours > 0 ? `${w.hours.toFixed(0)}h` : "—"}
                  </motion.div>
                  <div className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs shadow-md opacity-0 transition-opacity group-hover/cell:opacity-100 whitespace-nowrap">
                    {Math.round(pct * 100)}% · {w.tasks} task{w.tasks !== 1 ? "s" : ""}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Info className="size-3" /> Legend:
        </span>
        {[
          { pct: 0.3, label: "Underused" },
          { pct: 0.6, label: "Healthy" },
          { pct: 0.92, label: "Optimal" },
          { pct: 1.1, label: "At risk" },
          { pct: 1.3, label: "Overloaded" },
        ].map((b) => (
          <span key={b.label} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "size-3 rounded",
                utilizationColor(b.pct),
              )}
            />
            <span className="text-muted-foreground">{b.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
