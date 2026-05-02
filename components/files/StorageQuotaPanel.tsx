"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { HardDrive, AlertTriangle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/db/store";
import {
  formatBytes,
  storageByProject,
  totalStorageUsed,
} from "@/lib/files/search";
import { toast } from "sonner";

/**
 * Storage quota panel (PRD §5.7). Shows org-wide usage vs. cap, alert
 * threshold indicator, and per-project breakdown so admins can spot
 * which project is consuming the most.
 */
export function StorageQuotaPanel() {
  const files = useStore((s) => s.files);
  const projects = useStore((s) => s.projects);
  const quota = useStore((s) => s.storageQuota);
  const update = useStore((s) => s.updateStorageQuota);

  const used = useMemo(() => totalStorageUsed(files), [files]);
  const byProject = useMemo(() => storageByProject(files), [files]);

  const [totalLimitGb, setTotalLimitGb] = useState(
    quota.totalLimitBytes ? (quota.totalLimitBytes / (1024 ** 3)).toString() : "",
  );
  const [perProjectGb, setPerProjectGb] = useState(
    quota.perProjectLimitBytes
      ? (quota.perProjectLimitBytes / (1024 ** 3)).toString()
      : "",
  );
  const [thresholdInput, setThresholdInput] = useState(
    quota.warningThresholdPct.toString(),
  );

  const orgPct =
    quota.totalLimitBytes === 0
      ? 0
      : (used / quota.totalLimitBytes) * 100;
  const isOverThreshold = orgPct > quota.warningThresholdPct;

  // Sort projects by usage desc
  const projectRows = projects
    .map((p) => ({
      project: p,
      bytes: byProject[p.id] ?? 0,
      pct:
        quota.perProjectLimitBytes > 0
          ? ((byProject[p.id] ?? 0) / quota.perProjectLimitBytes) * 100
          : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 8);

  function save() {
    const totalBytes = totalLimitGb.trim()
      ? Math.round(Number(totalLimitGb) * 1024 ** 3)
      : 0;
    const perProjectBytes = perProjectGb.trim()
      ? Math.round(Number(perProjectGb) * 1024 ** 3)
      : 0;
    const threshold = Math.max(
      0,
      Math.min(100, Number(thresholdInput) || 80),
    );
    update({
      totalLimitBytes: totalBytes,
      perProjectLimitBytes: perProjectBytes,
      warningThresholdPct: threshold,
    });
    toast.success("Quota saved");
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2">
        <HardDrive className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Storage quota</h3>
        {isOverThreshold && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-pill bg-status-blocked/15 px-2 py-0.5 text-[10px] font-medium text-status-blocked">
            <AlertTriangle className="size-2.5" />
            Over threshold
          </span>
        )}
      </div>

      <div className="mt-3 rounded-md border bg-muted/30 p-3">
        <div className="flex items-end justify-between text-xs">
          <span>
            <span className="font-mono font-semibold">{formatBytes(used)}</span>{" "}
            used
          </span>
          <span className="text-muted-foreground">
            of{" "}
            {quota.totalLimitBytes === 0
              ? "unlimited"
              : formatBytes(quota.totalLimitBytes)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, orgPct)}%` }}
            transition={{ duration: 0.6 }}
            className={`h-full ${
              orgPct > quota.warningThresholdPct
                ? "bg-status-blocked"
                : orgPct > quota.warningThresholdPct - 15
                  ? "bg-status-revisions"
                  : "bg-status-done"
            }`}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Alert at {quota.warningThresholdPct}% — currently {orgPct.toFixed(0)}%
        </p>
      </div>

      {projectRows.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Top projects by usage
          </p>
          <ul className="mt-1.5 space-y-1">
            {projectRows.map(({ project, bytes, pct }) => (
              <li
                key={project.id}
                className="grid grid-cols-[1fr_120px_60px] items-center gap-2 text-xs"
              >
                <span className="truncate font-medium">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {project.code}
                  </span>{" "}
                  {project.name}
                </span>
                <span className="h-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className={`block h-full rounded-full ${
                      pct > 100
                        ? "bg-status-blocked"
                        : "bg-status-progress"
                    }`}
                    style={{ width: `${Math.min(100, pct || (bytes / Math.max(1, used)) * 100)}%` }}
                  />
                </span>
                <span className="text-right font-mono text-[10px] text-muted-foreground">
                  {formatBytes(bytes)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div>
          <Label className="text-xs">Org-wide cap (GB)</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={totalLimitGb}
            onChange={(e) => setTotalLimitGb(e.target.value)}
            placeholder="0 = unlimited"
          />
        </div>
        <div>
          <Label className="text-xs">Per-project cap (GB)</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={perProjectGb}
            onChange={(e) => setPerProjectGb(e.target.value)}
            placeholder="0 = inherits org cap"
          />
        </div>
        <div>
          <Label className="text-xs">Warning threshold (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={thresholdInput}
            onChange={(e) => setThresholdInput(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={save}>
          <Save className="mr-1 size-3.5" /> Save quota
        </Button>
      </div>
    </div>
  );
}
