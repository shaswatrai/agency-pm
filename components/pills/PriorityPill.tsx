"use client";

import { cn } from "@/lib/utils";
import { PRIORITY_META, type TaskPriority } from "@/lib/design/tokens";

interface PriorityPillProps {
  priority: TaskPriority;
  size?: "sm" | "md";
  className?: string;
}

export function PriorityPill({
  priority,
  size = "md",
  className,
}: PriorityPillProps) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-medium leading-none",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        meta.pill,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
