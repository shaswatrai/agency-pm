"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import type { Subtask } from "@/types/domain";

interface SubtaskListProps {
  taskId: string;
}

export function SubtaskList({ taskId }: SubtaskListProps) {
  const allTasks = useStore((s) => s.tasks);
  const updateTask = useStore((s) => s.updateTask);
  const task = allTasks.find((t) => t.id === taskId);

  const [draft, setDraft] = useState("");

  if (!task) return null;
  const subtasks = task.subtasks ?? [];
  const done = subtasks.filter((s) => s.done).length;
  const total = subtasks.length;

  const persist = (next: Subtask[]) => {
    updateTask(taskId, {
      subtasks: next,
      subtaskCount: next.length,
      subtasksDone: next.filter((s) => s.done).length,
    });
  };

  const toggle = (subtaskId: string) => {
    persist(
      subtasks.map((s) =>
        s.id === subtaskId ? { ...s, done: !s.done } : s,
      ),
    );
  };

  const remove = (subtaskId: string) => {
    persist(subtasks.filter((s) => s.id !== subtaskId));
  };

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    const next: Subtask = {
      id: `${taskId}_st_${Date.now()}`,
      title,
      done: false,
      position: (subtasks.length + 1) * 1000,
    };
    persist([...subtasks, next]);
    setDraft("");
  };

  const pct = total === 0 ? 0 : (done / total) * 100;

  return (
    <div className="rounded-lg border bg-card">
      {total > 0 ? (
        <div className="flex items-center gap-3 border-b px-4 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {done} of {total} complete
          </div>
          <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "h-full rounded-full",
                pct === 100
                  ? "bg-status-done"
                  : "bg-gradient-to-r from-primary to-primary/60",
              )}
            />
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {Math.round(pct)}%
          </span>
        </div>
      ) : null}

      <div className="divide-y">
        <AnimatePresence initial={false}>
          {subtasks.map((s) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="group flex items-center gap-3 px-4 py-2"
            >
              <button
                onClick={() => toggle(s.id)}
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                  s.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40",
                )}
                aria-label={s.done ? "Mark incomplete" : "Mark complete"}
              >
                {s.done ? <Check className="size-3" /> : null}
              </button>
              <span
                className={cn(
                  "flex-1 text-sm transition-all",
                  s.done && "text-muted-foreground line-through",
                )}
              >
                {s.title}
              </span>
              <button
                onClick={() => remove(s.id)}
                className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-status-blocked"
                aria-label="Remove subtask"
              >
                <Trash2 className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2 border-t px-3 py-2">
        <Plus className="size-3.5 text-muted-foreground shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a subtask…"
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
        {draft.trim() ? (
          <button
            onClick={add}
            className="rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add
          </button>
        ) : null}
      </div>
    </div>
  );
}
