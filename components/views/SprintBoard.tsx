"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/db/store";
import { KanbanBoard } from "./KanbanBoard";
import { Card } from "@/components/ui/card";
import { TrendingDown, Zap, CheckSquare, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface SprintBoardProps {
  projectId: string;
  onOpenTask: (taskId: string) => void;
  onAddTask: (status: import("@/lib/design/tokens").TaskStatus) => void;
}

export function SprintBoard({
  projectId,
  onOpenTask,
  onAddTask,
}: SprintBoardProps) {
  const allTasks = useStore((s) => s.tasks);
  const tasks = useMemo(
    () => allTasks.filter((t) => t.projectId === projectId),
    [allTasks, projectId],
  );

  const totalPoints = tasks.reduce(
    (sum, t) => sum + (t.storyPoints ?? Math.ceil((t.estimatedHours ?? 4) / 2)),
    0,
  );
  const donePoints = tasks
    .filter((t) => t.status === "done")
    .reduce(
      (sum, t) =>
        sum + (t.storyPoints ?? Math.ceil((t.estimatedHours ?? 4) / 2)),
      0,
    );
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const pct = totalPoints === 0 ? 0 : (donePoints / totalPoints) * 100;

  // Synthetic burndown (10 days)
  const burndown = useMemo(() => {
    const days = 10;
    const ideal = Array.from({ length: days + 1 }, (_, i) => ({
      day: i,
      ideal: totalPoints - (totalPoints / days) * i,
    }));
    const actual = Array.from({ length: 7 }, (_, i) => ({
      day: i,
      actual:
        totalPoints -
        Math.min(
          totalPoints,
          (donePoints / 6) * i + Math.sin(i) * 2,
        ),
    }));
    return { ideal, actual, days };
  }, [totalPoints, donePoints]);

  const W = 280;
  const H = 120;
  const PAD = 16;
  const xMax = burndown.days;
  const yMax = totalPoints;

  const xScale = (x: number) =>
    PAD + (x / xMax) * (W - PAD * 2);
  const yScale = (y: number) =>
    H - PAD - (y / yMax) * (H - PAD * 2);

  const idealPath = burndown.ideal
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.day)} ${yScale(p.ideal)}`)
    .join(" ");
  const actualPath = burndown.actual
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.day)} ${yScale(p.actual)}`)
    .join(" ");

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0">
        <KanbanBoard
          projectId={projectId}
          onOpenTask={onOpenTask}
          onAddTask={onAddTask}
        />
      </div>
      <aside className="hidden xl:flex w-[320px] shrink-0 flex-col gap-4 border-l bg-card/40 p-4 overflow-y-auto scrollbar-thin">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Active sprint
          </p>
          <h3 className="mt-1 text-base font-semibold">Sprint 14</h3>
          <p className="text-xs text-muted-foreground">
            Apr 22 → May 5 · 6 days remaining
          </p>
        </motion.div>

        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Target className="size-3" /> Committed
              </p>
              <p className="mt-1 font-mono text-xl">{totalPoints}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <CheckSquare className="size-3" /> Completed
              </p>
              <p className="mt-1 font-mono text-xl">{donePoints}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Zap className="size-3" /> In flight
              </p>
              <p className="mt-1 font-mono text-xl">{inProgress}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <TrendingDown className="size-3" /> Velocity
              </p>
              <p className="mt-1 font-mono text-xl">28<span className="text-xs text-muted-foreground"> avg</span></p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Progress</span>
              <span className="font-mono">{Math.round(pct)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Burndown
          </p>
          <svg width={W} height={H} className="overflow-visible">
            {/* Y-axis grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <line
                key={p}
                x1={PAD}
                x2={W - PAD}
                y1={yScale(yMax * (1 - p))}
                y2={yScale(yMax * (1 - p))}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                strokeDasharray="2 4"
                opacity={0.6}
              />
            ))}
            {/* Ideal */}
            <path
              d={idealPath}
              fill="none"
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              opacity={0.6}
            />
            {/* Actual */}
            <motion.path
              d={actualPath}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
            {burndown.actual.map((p, i) => (
              <motion.circle
                key={i}
                cx={xScale(p.day)}
                cy={yScale(p.actual)}
                r={3}
                fill="hsl(var(--primary))"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              />
            ))}
          </svg>
          <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 border-t border-dashed border-muted-foreground/60" />
              Ideal
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-3 bg-primary" />
              Actual
            </span>
          </div>
        </Card>

        <Card className="p-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Team velocity
          </p>
          <div className="flex h-20 items-end gap-1.5">
            {[22, 28, 26, 32, 24, 30, 28].map((v, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${(v / 35) * 100}%` }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className={cn(
                  "flex-1 rounded-t bg-primary/20",
                  i === 6 && "bg-primary",
                )}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wider text-muted-foreground">
            {["S8", "S9", "S10", "S11", "S12", "S13", "S14"].map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}
