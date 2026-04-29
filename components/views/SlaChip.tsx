"use client";

import { Timer } from "lucide-react";
import { useStore } from "@/lib/db/store";
import { evaluateTaskSla, overallSlaState } from "@/lib/automation/sla";
import { cn } from "@/lib/utils";
import type { SlaState } from "@/types/domain";

const META: Record<
  Exclude<SlaState, "no_policy">,
  { label: string; pill: string }
> = {
  breached: {
    label: "SLA breached",
    pill: "bg-status-blocked/15 text-status-blocked",
  },
  at_risk: {
    label: "SLA at risk",
    pill: "bg-status-revisions/15 text-status-revisions",
  },
  ok: {
    label: "SLA on track",
    pill: "bg-status-progress/15 text-status-progress",
  },
  met: { label: "SLA met", pill: "bg-status-done/15 text-status-done" },
};

function fmtRemaining(h: number): string {
  if (!isFinite(h)) return "";
  if (h < 0) {
    const over = Math.abs(h);
    return over < 24 ? `· ${over.toFixed(1)}h over` : `· ${(over / 24).toFixed(1)}d over`;
  }
  if (h < 1) return `· ${(h * 60).toFixed(0)}m left`;
  if (h < 24) return `· ${h.toFixed(1)}h left`;
  return `· ${(h / 24).toFixed(1)}d left`;
}

export function SlaChip({ taskId }: { taskId: string }) {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const slaPolicies = useStore((s) => s.slaPolicies);

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;
  const project = projects.find((p) => p.id === task.projectId);
  const snap = evaluateTaskSla(task, project?.clientId, slaPolicies);
  if (!snap) return null;
  const worst = overallSlaState(snap);
  if (worst === "no_policy") return null;
  const meta = META[worst];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-xs font-medium",
        meta.pill,
      )}
      title={`Tier: ${snap.tier.priority} · resp ${snap.tier.responseHours}h · res ${snap.tier.resolutionHours}h`}
    >
      <Timer className="size-3" />
      {meta.label}
      <span className="font-mono opacity-70">
        {fmtRemaining(snap.hoursToNextDeadline)}
      </span>
    </span>
  );
}
