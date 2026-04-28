"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/db/store";
import { applyTaskFilter, useFilterFor } from "@/lib/db/filters";
import { cn } from "@/lib/utils";
import { STATUS_META, type TaskStatus } from "@/lib/design/tokens";
import type { Task } from "@/types/domain";

const REFERENCE_DATE = new Date("2026-04-29");

export function CalendarView({
  projectId,
  onOpenTask,
}: {
  projectId: string;
  onOpenTask: (taskId: string) => void;
}) {
  const allTasks = useStore((s) => s.tasks);
  const filter = useFilterFor(projectId);
  const [cursor, setCursor] = useState(REFERENCE_DATE);

  const tasks = useMemo(
    () =>
      applyTaskFilter(
        allTasks.filter((t) => t.projectId === projectId && t.dueDate),
        filter,
      ),
    [allTasks, projectId, filter],
  );

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const key = t.dueDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  return (
    <div className="flex h-full flex-col px-4 py-4 md:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-lg font-semibold tracking-tight min-w-[180px] text-center">
            {format(cursor, "MMMM yyyy")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(REFERENCE_DATE)}
            className="ml-2"
          >
            Today
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {tasks.length} tasks scheduled this view
        </div>
      </div>

      <div className="grid grid-cols-7 border-t border-l rounded-tl-lg rounded-tr-lg overflow-hidden">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="border-r border-b bg-muted/40 px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-[repeat(auto-fill,minmax(120px,1fr))] border-l overflow-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          {days.map((day, idx) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDay.get(key) ?? [];
            const inMonth = isSameMonth(day, monthStart);
            const today = isSameDay(day, REFERENCE_DATE);

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.005 }}
                className={cn(
                  "group relative min-h-[120px] border-b border-r p-2 transition-colors hover:bg-accent/30",
                  !inMonth && "bg-muted/20",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                      today
                        ? "bg-primary text-primary-foreground"
                        : !inMonth
                          ? "text-muted-foreground/40"
                          : "text-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <button
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Add task"
                  >
                    <Plus className="size-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayTasks.slice(0, 4).map((t) => {
                    const meta = STATUS_META[t.status as TaskStatus];
                    return (
                      <button
                        key={t.id}
                        onClick={() => onOpenTask(t.id)}
                        className={cn(
                          "group/task flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] text-left transition-colors hover:bg-accent",
                          meta.pill,
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            meta.dot,
                          )}
                        />
                        <span className="truncate font-medium">{t.title}</span>
                      </button>
                    );
                  })}
                  {dayTasks.length > 4 ? (
                    <button className="px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground">
                      +{dayTasks.length - 4} more
                    </button>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
