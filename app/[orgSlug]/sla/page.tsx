"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Timer,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/db/store";
import { evaluateTaskSla, overallSlaState } from "@/lib/automation/sla";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import type { SlaIncidentSnapshot, SlaState } from "@/types/domain";

const STATE_META: Record<
  SlaState,
  { label: string; pill: string; dot: string; rank: number }
> = {
  breached: {
    label: "Breached",
    pill: "bg-status-blocked/15 text-status-blocked",
    dot: "bg-status-blocked",
    rank: 0,
  },
  at_risk: {
    label: "At risk",
    pill: "bg-status-revisions/15 text-status-revisions",
    dot: "bg-status-revisions",
    rank: 1,
  },
  ok: {
    label: "On track",
    pill: "bg-status-progress/15 text-status-progress",
    dot: "bg-status-progress",
    rank: 2,
  },
  met: {
    label: "Met",
    pill: "bg-status-done/15 text-status-done",
    dot: "bg-status-done",
    rank: 3,
  },
  no_policy: {
    label: "No policy",
    pill: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
    rank: 4,
  },
};

function formatHoursRemaining(h: number): string {
  if (!isFinite(h)) return "—";
  if (h < 0) {
    const over = Math.abs(h);
    if (over < 24) return `${over.toFixed(1)}h over`;
    return `${(over / 24).toFixed(1)}d over`;
  }
  if (h < 1) return `${(h * 60).toFixed(0)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

interface Row {
  task: ReturnType<typeof useStore.getState>["tasks"][number];
  project: ReturnType<typeof useStore.getState>["projects"][number] | undefined;
  client: ReturnType<typeof useStore.getState>["clients"][number] | undefined;
  snapshot: SlaIncidentSnapshot;
  worst: SlaState;
}

export default function SlaDashboardPage() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const clients = useStore((s) => s.clients);
  const slaPolicies = useStore((s) => s.slaPolicies);
  const orgSlug = useStore((s) => s.organization.slug);
  const [stateFilter, setStateFilter] = useState<SlaState | "all">("all");

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const task of tasks) {
      if (!task.clientVisible) continue;
      const project = projects.find((p) => p.id === task.projectId);
      const client = project
        ? clients.find((c) => c.id === project.clientId)
        : undefined;
      const snap = evaluateTaskSla(task, client?.id, slaPolicies);
      if (!snap) continue;
      out.push({ task, project, client, snapshot: snap, worst: overallSlaState(snap) });
    }
    return out.sort(
      (a, b) =>
        STATE_META[a.worst].rank - STATE_META[b.worst].rank ||
        a.snapshot.hoursToNextDeadline - b.snapshot.hoursToNextDeadline,
    );
  }, [tasks, projects, clients, slaPolicies]);

  const counts = useMemo(() => {
    const c: Record<SlaState, number> = {
      breached: 0,
      at_risk: 0,
      ok: 0,
      met: 0,
      no_policy: 0,
    };
    for (const r of rows) c[r.worst]++;
    return c;
  }, [rows]);

  const filtered = useMemo(
    () =>
      stateFilter === "all"
        ? rows
        : rows.filter((r) => r.worst === stateFilter),
    [rows, stateFilter],
  );

  const groupedByClient = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of filtered) {
      const key = r.client?.name ?? "—";
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
          <Timer className="size-6 text-primary" />
          SLA dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live response + resolution timers across every client-visible task.
          Configure policies in Settings → SLA policies.
        </p>
      </motion.div>

      {/* Stat tiles */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Breached"
          count={counts.breached}
          icon={AlertTriangle}
          color="text-status-blocked"
          bg="bg-status-blocked/10"
        />
        <StatTile
          label="At risk"
          count={counts.at_risk}
          icon={Clock}
          color="text-status-revisions"
          bg="bg-status-revisions/10"
        />
        <StatTile
          label="On track"
          count={counts.ok}
          icon={Timer}
          color="text-status-progress"
          bg="bg-status-progress/10"
        />
        <StatTile
          label="Met"
          count={counts.met}
          icon={CheckCircle2}
          color="text-status-done"
          bg="bg-status-done/10"
        />
      </div>

      {/* Filter pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <Filter className="size-3.5 text-muted-foreground" />
        <FilterChip
          label={`All (${rows.length})`}
          active={stateFilter === "all"}
          onClick={() => setStateFilter("all")}
        />
        {(["breached", "at_risk", "ok", "met"] as const).map((s) => (
          <FilterChip
            key={s}
            label={`${STATE_META[s].label} (${counts[s]})`}
            active={stateFilter === s}
            onClick={() => setStateFilter(s)}
            dotClass={STATE_META[s].dot}
          />
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Timer}
          title="No SLA incidents yet"
          description="SLAs cover client-visible tasks once a policy is active. Create a default policy in Settings to start the clock."
        />
      ) : (
        <div className="space-y-6">
          {groupedByClient.map(([clientName, clientRows]) => (
            <section key={clientName}>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                {clientName}
                <span className="ml-2 text-[11px] uppercase tracking-wider">
                  {clientRows.length} task{clientRows.length === 1 ? "" : "s"}
                </span>
              </h2>
              <div className="overflow-hidden rounded-lg border bg-card">
                <table className="min-w-full divide-y">
                  <thead className="bg-muted/40">
                    <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2">Task</th>
                      <th className="px-4 py-2">Priority</th>
                      <th className="px-4 py-2">Response</th>
                      <th className="px-4 py-2">Resolution</th>
                      <th className="px-4 py-2 text-right">Next deadline</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {clientRows.map((r) => {
                      const respMeta = STATE_META[r.snapshot.responseState];
                      const resMeta = STATE_META[r.snapshot.resolutionState];
                      const projectId = r.project?.id;
                      return (
                        <tr
                          key={r.task.id}
                          className="transition-colors hover:bg-accent"
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium">
                              {r.task.title}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {r.project?.name ?? "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                              {r.task.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-[11px] font-medium",
                                respMeta.pill,
                              )}
                            >
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  respMeta.dot,
                                )}
                              />
                              {respMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-[11px] font-medium",
                                resMeta.pill,
                              )}
                            >
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  resMeta.dot,
                                )}
                              />
                              {resMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs">
                            {formatHoursRemaining(
                              r.snapshot.hoursToNextDeadline,
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {projectId ? (
                              <Link
                                href={`/${orgSlug}/projects/${projectId}/kanban?task=${r.task.id}`}
                                className="inline-flex items-center gap-1 rounded-pill border bg-card px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent"
                              >
                                Open
                                <ExternalLink className="size-3" />
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  count,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={cn("grid size-10 place-items-center rounded-md", bg, color)}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight">{count}</p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  dotClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dotClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "bg-card text-muted-foreground hover:bg-accent",
      )}
    >
      {dotClass ? (
        <span className={cn("size-1.5 rounded-full", dotClass)} />
      ) : null}
      {label}
    </button>
  );
}
