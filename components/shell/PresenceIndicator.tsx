"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePeerCount } from "@/lib/db/sync";
import { cn } from "@/lib/utils";

export function PresenceIndicator() {
  const count = usePeerCount();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border bg-card px-2 py-0.5 text-[11px]",
      )}
      title={
        count > 1
          ? `${count} tabs synced in real time`
          : "Open another tab to see live sync"
      }
    >
      <span className="relative flex size-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-60",
            count > 1
              ? "bg-status-done animate-ping"
              : "bg-muted-foreground/40",
          )}
        />
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            count > 1 ? "bg-status-done" : "bg-muted-foreground/60",
          )}
        />
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={count}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "tabular-nums font-medium",
            count > 1 ? "text-status-done" : "text-muted-foreground",
          )}
        >
          {count > 1 ? `Live · ${count} tabs` : "Live"}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
