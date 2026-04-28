"use client";

import { cn } from "@/lib/utils";
import { HEALTH_META, type ProjectHealth } from "@/lib/design/tokens";

export function HealthPill({
  health,
  size = "md",
  className,
}: {
  health: ProjectHealth;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = HEALTH_META[health];
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
