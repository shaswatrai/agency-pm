"use client";

import { ChevronRight, Zap, Filter, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AutomationStep } from "@/types/domain";

interface AutomationFlowProps {
  trigger: AutomationStep;
  conditions: AutomationStep[];
  actions: AutomationStep[];
  compact?: boolean;
}

export function AutomationFlow({
  trigger,
  conditions,
  actions,
  compact = false,
}: AutomationFlowProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", compact && "text-[11px]")}>
      <FlowChip
        kind="trigger"
        icon={<Zap className="size-3" />}
        label={trigger.label}
        compact={compact}
      />
      {conditions.length > 0 ? (
        <>
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" />
          {conditions.map((c, i) => (
            <FlowChip
              key={c.id}
              kind="condition"
              icon={<Filter className="size-3" />}
              label={c.label}
              compact={compact}
              delay={i * 0.04}
            />
          ))}
        </>
      ) : null}
      <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" />
      {actions.map((a, i) => (
        <FlowChip
          key={a.id}
          kind="action"
          icon={<PlayCircle className="size-3" />}
          label={a.label}
          compact={compact}
          delay={(conditions.length + i) * 0.04}
        />
      ))}
    </div>
  );
}

function FlowChip({
  kind,
  icon,
  label,
  compact,
  delay = 0,
}: {
  kind: "trigger" | "condition" | "action";
  icon: React.ReactNode;
  label: string;
  compact?: boolean;
  delay?: number;
}) {
  const cls = {
    trigger:
      "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
    condition:
      "bg-muted text-foreground/80 ring-1 ring-inset ring-border",
    action:
      "bg-status-done/10 text-status-done ring-1 ring-inset ring-status-done/20",
  }[kind];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, delay }}
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-medium",
        cls,
        compact ? "text-[11px]" : "text-xs",
      )}
    >
      {icon}
      <span className="truncate max-w-[200px]">{label}</span>
    </motion.span>
  );
}
