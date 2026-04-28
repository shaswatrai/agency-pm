"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusPill } from "@/components/pills/StatusPill";
import { PriorityPill } from "@/components/pills/PriorityPill";
import {
  KANBAN_COLUMNS,
  STATUS_META,
  PRIORITY_META,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/design/tokens";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/db/store";
import { toast } from "sonner";

export function InlineStatusPicker({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const [open, setOpen] = useState(false);
  const updateTask = useStore((s) => s.updateTask);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StatusPill status={status} size="sm" animated={false} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-44 p-1"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {KANBAN_COLUMNS.map((s) => {
          const meta = STATUS_META[s];
          const active = s === status;
          return (
            <button
              key={s}
              onClick={(e) => {
                e.stopPropagation();
                updateTask(taskId, { status: s });
                toast.success(`Moved to ${meta.label}`);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                active ? "bg-primary/5 font-medium" : "hover:bg-accent",
              )}
            >
              <span className={cn("size-1.5 rounded-full", meta.dot)} />
              <span className="flex-1">{meta.label}</span>
              {active ? (
                <Check className="size-3 text-primary" />
              ) : null}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function InlinePriorityPicker({
  taskId,
  priority,
}: {
  taskId: string;
  priority: TaskPriority;
}) {
  const [open, setOpen] = useState(false);
  const updateTask = useStore((s) => s.updateTask);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PriorityPill priority={priority} size="sm" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-40 p-1"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => {
          const meta = PRIORITY_META[p];
          const active = p === priority;
          return (
            <button
              key={p}
              onClick={(e) => {
                e.stopPropagation();
                updateTask(taskId, { priority: p });
                toast.success(`Priority: ${meta.label}`);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                active ? "bg-primary/5 font-medium" : "hover:bg-accent",
              )}
            >
              <span className={cn("size-1.5 rounded-full", meta.dot)} />
              <span className="flex-1">{meta.label}</span>
              {active ? <Check className="size-3 text-primary" /> : null}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
