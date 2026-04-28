"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive: boolean };
  hint?: string;
  accent?: "primary" | "success" | "warning" | "destructive";
}

const accentMap = {
  primary: "from-primary/15 to-primary/0",
  success: "from-status-done/15 to-status-done/0",
  warning: "from-status-revisions/15 to-status-revisions/0",
  destructive: "from-status-blocked/15 to-status-blocked/0",
};

export function StatCard({
  label,
  value,
  delta,
  hint,
  accent = "primary",
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60",
          accentMap[accent],
        )}
      />
      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="text-3xl font-semibold tracking-tight">{value}</span>
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-pill px-2 py-0.5 text-xs font-medium",
                delta.positive
                  ? "bg-status-done/15 text-status-done"
                  : "bg-status-blocked/15 text-status-blocked",
              )}
            >
              {delta.positive ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {delta.value}
            </span>
          ) : null}
        </div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </motion.div>
  );
}
