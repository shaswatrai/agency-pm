"use client";

import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, addDays, startOfWeek } from "date-fns";
import { Lock, Unlock, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RoundingRule } from "@/types/domain";

const ROUNDING_OPTIONS: { value: RoundingRule; label: string; hint: string }[] =
  [
    { value: "exact", label: "Exact", hint: "Bill the time as logged" },
    { value: "5min", label: "5 minutes", hint: "Round up to the nearest 5 min" },
    {
      value: "15min",
      label: "15 minutes",
      hint: "Round up to the nearest 15 min",
    },
    {
      value: "30min",
      label: "30 minutes",
      hint: "Round up to the nearest 30 min",
    },
  ];

export function TimeTrackingPanel() {
  const config = useStore((s) => s.timeTrackingConfig);
  const setConfig = useStore((s) => s.setTimeTrackingConfig);
  const toggleLockedWeek = useStore((s) => s.toggleLockedWeek);

  const sortedLocked = [...config.lockedWeeks].sort();
  const lastLocked =
    sortedLocked.length > 0
      ? parseISO(sortedLocked[sortedLocked.length - 1])
      : startOfWeek(new Date("2026-04-19"), { weekStartsOn: 1 });
  const nextLockable = format(
    addDays(lastLocked, 7),
    "yyyy-MM-dd",
  );

  return (
    <div className="space-y-6">
      {/* Rounding rules */}
      <section>
        <p className="text-sm font-semibold">Rounding</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          How time entries get billed when invoiced.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ROUNDING_OPTIONS.map((opt) => {
            const active = config.rounding === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setConfig({ rounding: opt.value });
                  toast.success(`Rounding: ${opt.label}`);
                }}
                className={cn(
                  "rounded-md border p-3 text-left transition-all",
                  active
                    ? "border-primary/40 bg-primary/5 ring-1 ring-primary/30"
                    : "hover:bg-accent",
                )}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {opt.hint}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <hr className="border-border" />

      {/* Idle threshold */}
      <section>
        <p className="text-sm font-semibold">Idle threshold</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          When a timer runs longer than this, prompt the user to confirm or
          discard the idle minutes.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {[0, 60, 120, 180, 240, 480].map((mins) => {
            const active = config.idleThresholdMinutes === mins;
            return (
              <button
                key={mins}
                onClick={() => setConfig({ idleThresholdMinutes: mins })}
                className={cn(
                  "rounded-pill border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "hover:bg-accent",
                )}
              >
                {mins === 0 ? "Off" : `${mins / 60}h`}
              </button>
            );
          })}
        </div>
      </section>

      <hr className="border-border" />

      {/* Locked weeks */}
      <section>
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-sm font-semibold">Locked weeks</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Once a week is locked, time entries can't be edited or added.
              Use this after invoicing for the period.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              toggleLockedWeek(nextLockable);
              toast.success(
                `Locked week of ${format(parseISO(nextLockable), "MMM d, yyyy")}`,
              );
            }}
          >
            <Plus className="size-4" /> Lock next week
          </Button>
        </div>

        <div className="mt-3 overflow-hidden rounded-md border">
          {sortedLocked.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No weeks are locked. All time entries are editable.
            </div>
          ) : (
            <ul className="divide-y">
              <AnimatePresence initial={false}>
                {sortedLocked.map((weekStart) => (
                  <motion.li
                    key={weekStart}
                    layout
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    className="flex items-center justify-between gap-3 px-4 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-7 place-items-center rounded-md bg-status-revisions/15 text-status-revisions">
                        <Lock className="size-3.5" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          Week of{" "}
                          {format(parseISO(weekStart), "MMMM d, yyyy")}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(parseISO(weekStart), "MMM d")} →{" "}
                          {format(addDays(parseISO(weekStart), 6), "MMM d")}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        toggleLockedWeek(weekStart);
                        toast.success(
                          `Unlocked ${format(parseISO(weekStart), "MMM d, yyyy")}`,
                        );
                      }}
                    >
                      <Unlock className="size-3.5" /> Unlock
                    </Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Clock className="mt-0.5 size-3.5 shrink-0" />
        <div>
          The timer reminder system (notify if no time is logged by end of
          day, or timer running &gt; threshold) ships with the real-time
          notification engine in Pass 6.
        </div>
      </div>
    </div>
  );
}
