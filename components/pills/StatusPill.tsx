"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { STATUS_META, type TaskStatus } from "@/lib/design/tokens";
import { pillBounce } from "@/lib/design/motion";

interface StatusPillProps {
  status: TaskStatus;
  size?: "sm" | "md";
  className?: string;
  animated?: boolean;
}

export function StatusPill({
  status,
  size = "md",
  className,
  animated = true,
}: StatusPillProps) {
  const meta = STATUS_META[status];
  const Comp = animated ? motion.span : "span";
  const motionProps = animated
    ? { variants: pillBounce, initial: "initial", animate: "animate", key: status }
    : {};

  return (
    <Comp
      {...motionProps}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-medium leading-none",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        meta.pill,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Comp>
  );
}
