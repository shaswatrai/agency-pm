"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task } from "@/types/domain";
import type { TaskStatus } from "@/lib/design/tokens";
import { STATUS_META } from "@/lib/design/tokens";
import { KanbanCard } from "./KanbanCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
  onAddTask: (status: TaskStatus) => void;
}

export function KanbanColumn({
  status,
  tasks,
  onOpenTask,
  onAddTask,
}: KanbanColumnProps) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", meta.dot)} />
          <h3 className="text-sm font-semibold tracking-tight">
            {meta.label}
          </h3>
          <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => onAddTask(status)}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <motion.div
        ref={setNodeRef}
        animate={{
          backgroundColor: isOver
            ? "hsl(var(--primary) / 0.06)"
            : "hsl(var(--muted) / 0.4)",
        }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex-1 rounded-lg p-2 transition-colors scrollbar-thin overflow-y-auto",
          isOver && "ring-2 ring-primary/30",
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <KanbanCard key={task.id} task={task} onOpen={onOpenTask} />
            ))}
            {tasks.length === 0 ? (
              <button
                onClick={() => onAddTask(status)}
                className="rounded-md border border-dashed border-border/60 bg-card/50 px-3 py-6 text-center text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <Plus className="mx-auto mb-1 size-4" />
                Drop or add a task
              </button>
            ) : null}
          </div>
        </SortableContext>
      </motion.div>
    </div>
  );
}
