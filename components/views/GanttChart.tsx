"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  format,
  parseISO,
  differenceInCalendarDays,
  addDays,
  startOfWeek,
  isWeekend,
  isSameMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/db/store";
import { applyTaskFilter, useFilterFor } from "@/lib/db/filters";
import { STATUS_META, type TaskStatus } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 56;
const REFERENCE_DATE = new Date("2026-04-29");

export function GanttChart({
  projectId,
  onOpenTask,
}: {
  projectId: string;
  onOpenTask: (taskId: string) => void;
}) {
  const allTasks = useStore((s) => s.tasks);
  const allPhases = useStore((s) => s.phases);
  const allProjects = useStore((s) => s.projects);
  const taskDependencies = useStore((s) => s.taskDependencies);

  const project = allProjects.find((p) => p.id === projectId);
  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === projectId),
    [allPhases, projectId],
  );
  const filter = useFilterFor(projectId);
  const tasks = useMemo(
    () =>
      applyTaskFilter(
        allTasks.filter((t) => t.projectId === projectId && t.dueDate),
        filter,
      ),
    [allTasks, projectId, filter],
  );

  const [zoom, setZoom] = useState(28); // px per day

  // determine date range from project + tasks
  const { rangeStart, rangeEnd } = useMemo(() => {
    let min = project?.startDate ? parseISO(project.startDate) : REFERENCE_DATE;
    let max = project?.endDate ? parseISO(project.endDate) : addDays(REFERENCE_DATE, 60);
    for (const t of tasks) {
      if (t.dueDate) {
        const d = parseISO(t.dueDate);
        if (d > max) max = d;
      }
    }
    min = startOfWeek(addDays(min, -7), { weekStartsOn: 1 });
    max = addDays(max, 14);
    return { rangeStart: min, rangeEnd: max };
  }, [project, tasks]);

  const totalDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1;
  const totalWidth = totalDays * zoom;

  const todayOffset = differenceInCalendarDays(REFERENCE_DATE, rangeStart) * zoom;

  // Group tasks by phase
  const rows = useMemo(() => {
    const out: Array<
      | { type: "phase"; phaseId: string; name: string }
      | { type: "task"; task: (typeof tasks)[number] }
    > = [];
    for (const phase of phases) {
      const phaseTasks = tasks.filter((t) => t.phaseId === phase.id);
      if (phaseTasks.length === 0) continue;
      out.push({ type: "phase", phaseId: phase.id, name: phase.name });
      for (const t of phaseTasks) out.push({ type: "task", task: t });
    }
    // tasks without a phase
    const orphan = tasks.filter((t) => !t.phaseId);
    if (orphan.length > 0) {
      out.push({ type: "phase", phaseId: "no_phase", name: "Unassigned" });
      for (const t of orphan) out.push({ type: "task", task: t });
    }
    return out;
  }, [phases, tasks]);

  const taskRows = rows.filter((r) => r.type === "task");

  // Pre-compute bar geometry per task so we can both render bars + connect
  // them with dependency arrows. Keyed by task id.
  const barById = useMemo(() => {
    const map = new Map<
      string,
      { left: number; width: number; rowIndex: number }
    >();
    rows.forEach((row, i) => {
      if (row.type !== "task") return;
      const t = row.task;
      if (!t.dueDate) return;
      const due = parseISO(t.dueDate);
      const estDays = Math.max(1, Math.ceil((t.estimatedHours ?? 8) / 8));
      const start = addDays(due, -estDays + 1);
      const left = differenceInCalendarDays(start, rangeStart) * zoom;
      const width = estDays * zoom - 4;
      map.set(t.id, { left: Math.max(2, left), width, rowIndex: i });
    });
    return map;
  }, [rows, rangeStart, zoom]);

  // Build arrow paths from predecessor → successor for tasks in this project
  const arrows = useMemo(() => {
    const taskIds = new Set(rows.filter((r) => r.type === "task").map((r) =>
      r.type === "task" ? r.task.id : "",
    ));
    return taskDependencies
      .filter(
        (d) =>
          taskIds.has(d.taskId) &&
          taskIds.has(d.dependsOnTaskId) &&
          barById.has(d.taskId) &&
          barById.has(d.dependsOnTaskId),
      )
      .map((d) => {
        const pred = barById.get(d.dependsOnTaskId)!;
        const succ = barById.get(d.taskId)!;
        // finish_to_start: right edge of pred → left edge of succ
        const x1 = pred.left + pred.width;
        const y1 =
          HEADER_HEIGHT + pred.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
        const x2 = succ.left;
        const y2 =
          HEADER_HEIGHT + succ.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
        // Routing: short horizontal stub, drop / rise, horizontal to target
        const stub = Math.min(14, Math.max(4, Math.abs(x2 - x1) / 4));
        const path = `M ${x1} ${y1} L ${x1 + stub} ${y1} L ${
          x1 + stub
        } ${y2} L ${x2 - 4} ${y2}`;
        return { id: `${d.dependsOnTaskId}->${d.taskId}`, path, x2, y2 };
      });
  }, [taskDependencies, barById, rows]);

  // Build month/day header tiers
  const days = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i)),
    [rangeStart, totalDays],
  );

  const monthSegments = useMemo(() => {
    const segments: { label: string; start: number; width: number }[] = [];
    let cursor = 0;
    while (cursor < days.length) {
      const monthStart = days[cursor];
      let end = cursor;
      while (end + 1 < days.length && isSameMonth(days[end + 1], monthStart)) end++;
      const span = end - cursor + 1;
      segments.push({
        label: format(monthStart, "MMMM yyyy"),
        start: cursor * zoom,
        width: span * zoom,
      });
      cursor = end + 1;
    }
    return segments;
  }, [days, zoom]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && todayOffset > 0) {
      containerRef.current.scrollLeft = Math.max(0, todayOffset - 200);
    }
  }, [todayOffset]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2 md:px-8">
        <div className="text-xs text-muted-foreground">
          {taskRows.length} tasks · {phases.length} phases
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom((z) => Math.max(10, z - 6))}
            aria-label="Zoom out"
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom((z) => Math.min(80, z + 6))}
            aria-label="Zoom in"
          >
            <ZoomIn className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left rail */}
        <div className="w-[280px] shrink-0 border-r bg-card/40 overflow-y-auto scrollbar-thin">
          <div
            style={{ height: HEADER_HEIGHT }}
            className="sticky top-0 z-10 border-b bg-muted/40 px-4 flex items-end pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            Task
          </div>
          {rows.map((row, i) => {
            if (row.type === "phase") {
              return (
                <div
                  key={`phase-${i}`}
                  style={{ height: ROW_HEIGHT }}
                  className="flex items-center border-b bg-muted/30 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {row.name}
                </div>
              );
            }
            const t = row.task;
            return (
              <button
                key={t.id}
                onClick={() => onOpenTask(t.id)}
                style={{ height: ROW_HEIGHT }}
                className="flex w-full items-center gap-2 border-b px-4 text-left transition-colors hover:bg-accent"
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full shrink-0",
                    STATUS_META[t.status as TaskStatus].dot,
                  )}
                />
                <span className="truncate text-sm font-medium">{t.title}</span>
              </button>
            );
          })}
        </div>

        {/* Right timeline */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-auto scrollbar-thin"
        >
          <div style={{ width: totalWidth }} className="relative">
            {/* Header */}
            <div
              style={{ height: HEADER_HEIGHT }}
              className="sticky top-0 z-20 bg-muted/40 border-b"
            >
              <div className="relative h-7 border-b">
                {monthSegments.map((m, i) => (
                  <div
                    key={i}
                    style={{ left: m.start, width: m.width }}
                    className="absolute top-0 flex h-full items-center border-r px-2 text-[11px] font-semibold tracking-wide text-foreground"
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="relative h-7">
                {days.map((day, i) => (
                  <div
                    key={i}
                    style={{ left: i * zoom, width: zoom }}
                    className={cn(
                      "absolute top-0 flex h-full items-center justify-center text-[10px] tracking-wider",
                      isWeekend(day) ? "bg-muted/40" : "",
                      isSameMonth(day, REFERENCE_DATE) ? "" : "text-muted-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </div>
                ))}
              </div>
            </div>

            {/* Today line */}
            {todayOffset >= 0 && todayOffset <= totalWidth ? (
              <div
                className="absolute top-0 z-10 h-full w-px bg-primary/60"
                style={{
                  left: todayOffset + zoom / 2,
                  height: rows.length * ROW_HEIGHT + HEADER_HEIGHT,
                }}
              >
                <div className="sticky top-0 -ml-2 mt-1 inline-block rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Today
                </div>
              </div>
            ) : null}

            {/* Weekend background bands */}
            {days.map((d, i) =>
              isWeekend(d) ? (
                <div
                  key={`wk-${i}`}
                  style={{
                    left: i * zoom,
                    width: zoom,
                    top: HEADER_HEIGHT,
                    height: rows.length * ROW_HEIGHT,
                  }}
                  className="absolute bg-muted/20 pointer-events-none"
                />
              ) : null,
            )}

            {/* Rows */}
            {rows.map((row, i) => {
              const top = HEADER_HEIGHT + i * ROW_HEIGHT;
              if (row.type === "phase") {
                return (
                  <div
                    key={`phase-${i}`}
                    className="absolute left-0 right-0 border-b bg-muted/15"
                    style={{ top, height: ROW_HEIGHT }}
                  />
                );
              }
              const t = row.task;
              const bar = barById.get(t.id);
              if (!bar) return null;
              const meta = STATUS_META[t.status as TaskStatus];

              return (
                <div
                  key={t.id}
                  className="absolute border-b"
                  style={{ top, height: ROW_HEIGHT, left: 0, right: 0 }}
                >
                  <motion.button
                    onClick={() => onOpenTask(t.id)}
                    initial={{ opacity: 0, scaleX: 0.96 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.24, delay: i * 0.015 }}
                    style={{
                      left: bar.left,
                      width: Math.max(zoom - 4, bar.width),
                      top: 6,
                      height: ROW_HEIGHT - 12,
                      transformOrigin: "left center",
                    }}
                    className={cn(
                      "group/bar absolute flex items-center gap-1.5 rounded-md px-2 text-[11px] font-medium shadow-sm transition-shadow hover:shadow-md",
                      meta.pill,
                      "ring-1 ring-inset ring-black/5 dark:ring-white/5",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full shrink-0",
                        meta.dot,
                      )}
                    />
                    <span className="truncate">{t.title}</span>
                  </motion.button>
                </div>
              );
            })}

            {/* Dependency arrows overlay */}
            {arrows.length > 0 ? (
              <svg
                className="pointer-events-none absolute inset-0"
                style={{
                  width: totalWidth,
                  height: rows.length * ROW_HEIGHT + HEADER_HEIGHT,
                }}
              >
                <defs>
                  <marker
                    id="gantt-arrow"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path
                      d="M 0 0 L 10 5 L 0 10 z"
                      fill="hsl(var(--muted-foreground))"
                    />
                  </marker>
                </defs>
                {arrows.map((a) => (
                  <motion.path
                    key={a.id}
                    d={a.path}
                    fill="none"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.4}
                    strokeOpacity={0.55}
                    markerEnd="url(#gantt-arrow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                ))}
              </svg>
            ) : null}

            {/* Spacer */}
            <div style={{ height: rows.length * ROW_HEIGHT + HEADER_HEIGHT }} />
          </div>
        </div>
      </div>
    </div>
  );
}
