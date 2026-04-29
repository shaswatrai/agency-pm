"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import {
  Plus,
  Search,
  Zap,
  CalendarClock,
  ShieldCheck,
  Wallet,
  UserPlus,
  Repeat,
  TrendingUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  CircleDashed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import { AutomationFlow } from "@/components/automations/AutomationFlow";
import { toast } from "sonner";
import type { AutomationRule } from "@/types/domain";

const CATEGORY_META: Record<
  AutomationRule["category"],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  status: { label: "Status", icon: TrendingUp, color: "text-status-progress" },
  assignment: { label: "Assignment", icon: UserPlus, color: "text-status-review" },
  deadline: {
    label: "Deadlines",
    icon: CalendarClock,
    color: "text-status-revisions",
  },
  budget: { label: "Budget", icon: Wallet, color: "text-status-blocked" },
  approval: {
    label: "Approvals",
    icon: ShieldCheck,
    color: "text-status-done",
  },
  recurring: { label: "Recurring", icon: Repeat, color: "text-muted-foreground" },
};

export default function AutomationsPage() {
  const automations = useStore((s) => s.automations);
  const automationRuns = useStore((s) => s.automationRuns);
  const toggleAutomation = useStore((s) => s.toggleAutomation);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const runsByRule = useMemo(() => {
    const map = new Map<string, typeof automationRuns>();
    for (const run of automationRuns) {
      const list = map.get(run.ruleId) ?? [];
      list.push(run);
      map.set(run.ruleId, list);
    }
    return map;
  }, [automationRuns]);

  const filtered = automations.filter((a) => {
    const matchesQuery =
      query === "" ||
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.description?.toLowerCase().includes(query.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || a.category === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  const totalRuns = automations.reduce((s, a) => s + a.runCount, 0);
  const activeCount = automations.filter((a) => a.isActive).length;

  const categoryCounts = automations.reduce<Record<string, number>>(
    (acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + 1;
      acc.all = (acc.all ?? 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
            <Zap className="size-6 text-primary" />
            Automations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trigger → Condition → Action rules that run automatically across
            your work
          </p>
        </div>
        <Button>
          <Plus className="size-4" /> New rule
        </Button>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-lg border bg-card p-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <div className="relative">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Active rules
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold">
              {activeCount}
              <span className="ml-1 text-base text-muted-foreground">
                / {automations.length}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Currently running
            </p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="relative overflow-hidden rounded-lg border bg-card p-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-status-done/10 to-transparent" />
          <div className="relative">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Total executions
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold">
              {totalRuns.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Lifetime · across all rules
            </p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="relative overflow-hidden rounded-lg border bg-card p-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-status-progress/10 to-transparent" />
          <div className="relative">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Time saved (est.)
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold">
              {Math.round(totalRuns * 1.5)}h
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ~1.5 min saved per execution
            </p>
          </div>
        </motion.div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rules…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-md border bg-card p-0.5">
          {[
            { value: "all", label: "All" },
            ...Object.entries(CATEGORY_META).map(([key, meta]) => ({
              value: key,
              label: meta.label,
            })),
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCategoryFilter(tab.value)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                categoryFilter === tab.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {categoryCounts[tab.value] ? (
                <span className="ml-1.5 opacity-60">
                  {categoryCounts[tab.value]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {filtered.map((rule, i) => {
          const meta = CATEGORY_META[rule.category];
          return (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "group rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md",
                !rule.isActive && "opacity-70",
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-md bg-muted",
                    meta.color,
                  )}
                >
                  <meta.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold tracking-tight">
                      {rule.name}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {rule.isActive ? "Active" : "Paused"}
                      </span>
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => {
                          toggleAutomation(rule.id);
                          toast.success(
                            rule.isActive
                              ? `Paused: ${rule.name}`
                              : `Activated: ${rule.name}`,
                          );
                        }}
                      />
                    </div>
                  </div>
                  {rule.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {rule.description}
                    </p>
                  ) : null}

                  <div className="mt-4">
                    <AutomationFlow
                      trigger={rule.trigger}
                      conditions={rule.conditions}
                      actions={rule.actions}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-medium text-foreground">
                        {rule.runCount.toLocaleString()}
                      </span>
                      runs
                    </span>
                    {rule.lastRunAt ? (
                      <span>
                        Last fired{" "}
                        {formatDistanceToNow(parseISO(rule.lastRunAt), {
                          addSuffix: true,
                        })}
                      </span>
                    ) : null}
                    <span className="capitalize">{meta.label}</span>
                    <button
                      onClick={() =>
                        setExpandedId(
                          expandedId === rule.id ? null : rule.id,
                        )
                      }
                      className="ml-auto inline-flex items-center gap-1 rounded-pill border bg-card px-2 py-0.5 text-[10px] hover:bg-accent"
                    >
                      Run history
                      <ChevronDown
                        className={cn(
                          "size-3 transition-transform",
                          expandedId === rule.id && "rotate-180",
                        )}
                      />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {expandedId === rule.id ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 rounded-md border bg-muted/20 p-3">
                          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            Recent runs
                          </p>
                          {(runsByRule.get(rule.id) ?? []).length === 0 ? (
                            <p className="px-1 py-3 text-center text-xs text-muted-foreground">
                              Hasn't fired yet in this session. Trigger an
                              event in the app and watch it appear here live.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {(runsByRule.get(rule.id) ?? [])
                                .slice(0, 6)
                                .map((run) => {
                                  const StatusIcon =
                                    run.status === "success"
                                      ? CheckCircle2
                                      : run.status === "error"
                                        ? XCircle
                                        : CircleDashed;
                                  const statusCls =
                                    run.status === "success"
                                      ? "text-status-done"
                                      : run.status === "error"
                                        ? "text-status-blocked"
                                        : "text-muted-foreground";
                                  return (
                                    <li
                                      key={run.id}
                                      className="rounded-md border bg-card px-3 py-2"
                                    >
                                      <div className="flex items-start gap-2">
                                        <StatusIcon
                                          className={cn(
                                            "mt-0.5 size-3.5 shrink-0",
                                            statusCls,
                                          )}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-xs font-medium">
                                            {run.triggerSummary}
                                          </p>
                                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                                            {format(
                                              parseISO(run.createdAt),
                                              "MMM d, h:mm:ss a",
                                            )}
                                          </p>
                                          {run.actions.length > 0 ? (
                                            <ul className="mt-1.5 space-y-0.5">
                                              {run.actions.map((a, i) => (
                                                <li
                                                  key={i}
                                                  className="flex items-start gap-1.5 text-[10px]"
                                                >
                                                  <span
                                                    className={cn(
                                                      "mt-0.5 size-1 shrink-0 rounded-full",
                                                      a.outcome === "ok"
                                                        ? "bg-status-done"
                                                        : a.outcome === "error"
                                                          ? "bg-status-blocked"
                                                          : "bg-muted-foreground",
                                                    )}
                                                  />
                                                  <span className="text-muted-foreground">
                                                    <span className="font-medium text-foreground">
                                                      {a.label}
                                                    </span>
                                                    {a.detail
                                                      ? ` — ${a.detail}`
                                                      : ""}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          ) : null}
                                        </div>
                                      </div>
                                    </li>
                                  );
                                })}
                            </ul>
                          )}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
            No automations match your filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}
