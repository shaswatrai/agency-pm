"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/db/store";
import { STATUS_META, type TaskStatus } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

/**
 * Compact picker for task dependencies. Shows the current
 * "depends on …" list as removable chips and a search box that
 * adds new ones from the same project.
 *
 * The store enforces:
 *   • no self-link (taskId === dependsOnTaskId)
 *   • no duplicate edges
 *   • no direct cycle (A depends on B AND B depends on A)
 *
 * Reverse links ("blocks …") are shown read-only at the bottom.
 */
export function DependencyPicker({ taskId }: { taskId: string }) {
  const tasks = useStore((s) => s.tasks);
  const taskDependencies = useStore((s) => s.taskDependencies);
  const addTaskDependency = useStore((s) => s.addTaskDependency);
  const removeTaskDependency = useStore((s) => s.removeTaskDependency);

  const task = tasks.find((t) => t.id === taskId);
  const sameProject = useMemo(
    () => tasks.filter((t) => t.projectId === task?.projectId && t.id !== taskId),
    [tasks, task, taskId],
  );

  const dependsOn = useMemo(
    () => taskDependencies.filter((d) => d.taskId === taskId),
    [taskDependencies, taskId],
  );
  const blockedBy = useMemo(
    () => taskDependencies.filter((d) => d.dependsOnTaskId === taskId),
    [taskDependencies, taskId],
  );

  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  if (!task) return null;

  const existingIds = new Set(dependsOn.map((d) => d.dependsOnTaskId));
  // Don't propose tasks that already block this one — would be a direct cycle
  const reverseIds = new Set(blockedBy.map((d) => d.taskId));

  const candidates = sameProject
    .filter((t) => !existingIds.has(t.id) && !reverseIds.has(t.id))
    .filter((t) =>
      query.trim().length === 0
        ? true
        : t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.code.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 12);

  return (
    <div className="space-y-3">
      {/* Depends on */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Depends on
          </span>
          {!adding ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => setAdding(true)}
            >
              <Plus className="size-3" /> Add
            </Button>
          ) : null}
        </div>

        {dependsOn.length === 0 && !adding ? (
          <p className="text-xs text-muted-foreground">
            No predecessors. Add a task that must finish before this one can
            start.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {dependsOn.map((d) => {
            const dep = tasks.find((t) => t.id === d.dependsOnTaskId);
            if (!dep) return null;
            const meta = STATUS_META[dep.status as TaskStatus];
            return (
              <motion.span
                key={d.dependsOnTaskId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "group/chip inline-flex max-w-[260px] items-center gap-1.5 rounded-pill border bg-card px-2 py-1 text-[11px]",
                )}
                title={dep.title}
              >
                <span className={cn("size-1.5 rounded-full shrink-0", meta.dot)} />
                <span className="truncate">{dep.title}</span>
                <button
                  type="button"
                  onClick={() =>
                    removeTaskDependency(taskId, d.dependsOnTaskId)
                  }
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Remove dependency"
                >
                  <X className="size-3" />
                </button>
              </motion.span>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {adding ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 overflow-hidden rounded-md border bg-card"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tasks in this project…"
                  className="border-0 pl-9 text-sm focus-visible:ring-0"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border-t scrollbar-thin">
                {candidates.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    No matches
                  </div>
                ) : (
                  candidates.map((t) => {
                    const meta = STATUS_META[t.status as TaskStatus];
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          addTaskDependency(taskId, t.id);
                          setQuery("");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                      >
                        <span
                          className={cn("size-1.5 rounded-full", meta.dot)}
                        />
                        <span className="truncate">{t.title}</span>
                        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                          {t.code}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="flex items-center justify-end gap-2 border-t bg-muted/40 px-2 py-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => {
                    setAdding(false);
                    setQuery("");
                  }}
                >
                  Done
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Blocks (reverse links — read-only) */}
      {blockedBy.length > 0 ? (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Link2 className="size-3" /> Blocks
          </p>
          <div className="flex flex-wrap gap-1.5">
            {blockedBy.map((d) => {
              const t = tasks.find((tt) => tt.id === d.taskId);
              if (!t) return null;
              const meta = STATUS_META[t.status as TaskStatus];
              return (
                <span
                  key={d.taskId}
                  className="inline-flex max-w-[260px] items-center gap-1.5 rounded-pill border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground"
                  title={t.title}
                >
                  <span className={cn("size-1.5 rounded-full", meta.dot)} />
                  <span className="truncate">{t.title}</span>
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
