"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Trash2,
  FileText,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore, useCurrentUser } from "@/lib/db/store";
import { toast } from "sonner";
import type { ReleaseStatus } from "@/types/domain";

interface Props {
  projectId: string;
}

const STATUS_META: Record<
  ReleaseStatus,
  { label: string; cls: string }
> = {
  planning: { label: "Planning", cls: "bg-muted text-muted-foreground" },
  in_progress: { label: "In progress", cls: "bg-status-progress/15 text-status-progress" },
  code_freeze: { label: "Code freeze", cls: "bg-status-revisions/15 text-status-revisions" },
  released: { label: "Released", cls: "bg-status-done/15 text-status-done" },
  rolled_back: { label: "Rolled back", cls: "bg-status-blocked/15 text-status-blocked" },
};

/**
 * Release management (PRD §5.13). Group sprints into releases, track
 * scope by linked task IDs, generate release notes from completed
 * tasks. Supports planning → in_progress → code_freeze → released.
 */
export function ReleasesPanel({ projectId }: Props) {
  const me = useCurrentUser();
  const releases = useStore((s) => s.releases);
  const tasks = useStore((s) => s.tasks);
  const addRelease = useStore((s) => s.addRelease);
  const setStatus = useStore((s) => s.setReleaseStatus);
  const removeRelease = useStore((s) => s.removeRelease);
  const removeTask = useStore((s) => s.removeTaskFromRelease);
  const addTasks = useStore((s) => s.addTasksToRelease);

  const projectReleases = useMemo(
    () =>
      releases
        .filter((r) => r.projectId === projectId)
        .sort((a, b) =>
          (b.targetDate ?? b.createdAt).localeCompare(a.targetDate ?? a.createdAt),
        ),
    [releases, projectId],
  );

  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    version: "",
    targetDate: "",
  });

  const projectTaskOptions = tasks.filter((t) => t.projectId === projectId);

  function submit() {
    if (!draft.name.trim()) {
      toast.error("Name your release");
      return;
    }
    addRelease({
      projectId,
      name: draft.name.trim(),
      version: draft.version.trim() || undefined,
      targetDate: draft.targetDate || undefined,
      status: "planning",
      createdBy: me.id,
    });
    toast.success("Release created");
    setDraft({ name: "", version: "", targetDate: "" });
    setCreating(false);
  }

  function copyNotes(releaseId: string) {
    const release = projectReleases.find((r) => r.id === releaseId);
    if (!release) return;
    const releaseTasks = release.taskIds
      .map((id) => tasks.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .filter((t) => t.status === "done");
    const lines = [
      `## ${release.name}${release.version ? ` (${release.version})` : ""}`,
      "",
      release.notes ?? "",
      "",
      "### What's in this release",
      ...releaseTasks.map((t) => `- ${t.title} (${t.code})`),
    ];
    const md = lines.filter(Boolean).join("\n");
    void navigator.clipboard.writeText(md);
    toast.success("Release notes copied");
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Rocket className="size-4 text-primary" /> Releases
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Group sprints, track scope, generate notes
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-3.5" /> New release
        </Button>
      </div>

      {projectReleases.length === 0 ? (
        <div className="grid place-items-center px-5 py-10 text-center">
          <Rocket className="mb-2 size-7 text-muted-foreground" />
          <p className="text-sm font-medium">No releases yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Create one to plan a launch and group its sprints.
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          <AnimatePresence initial={false}>
            {projectReleases.map((rel) => {
              const isOpen = expanded === rel.id;
              const meta = STATUS_META[rel.status];
              const releaseTasks = rel.taskIds
                .map((id) => tasks.find((t) => t.id === id))
                .filter((t): t is NonNullable<typeof t> => Boolean(t));
              const done = releaseTasks.filter((t) => t.status === "done").length;
              const total = releaseTasks.length;
              const pct = total === 0 ? 0 : (done / total) * 100;
              const overdue =
                rel.targetDate &&
                rel.status !== "released" &&
                new Date(rel.targetDate) < new Date();
              return (
                <motion.li
                  key={rel.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="flex items-center gap-3 px-5 py-3">
                    <button
                      onClick={() => setExpanded(isOpen ? null : rel.id)}
                      className="grid size-5 shrink-0 place-items-center hover:bg-accent rounded"
                    >
                      {isOpen ? (
                        <ChevronDown className="size-3.5" />
                      ) : (
                        <ChevronRight className="size-3.5" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {rel.name}
                        </p>
                        {rel.version && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {rel.version}
                          </span>
                        )}
                        <span
                          className={`rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                        {overdue && (
                          <span className="inline-flex items-center gap-1 rounded-pill bg-status-blocked/15 px-1.5 py-0.5 text-[9px] font-medium text-status-blocked">
                            <AlertTriangle className="size-2.5" />
                            Overdue
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                        {rel.targetDate && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-2.5" />
                            {rel.targetDate}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                            <span
                              className="block h-full rounded-full bg-status-done"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          {done}/{total} done
                        </span>
                      </div>
                    </div>
                    <select
                      value={rel.status}
                      onChange={(e) =>
                        setStatus(rel.id, e.target.value as ReleaseStatus)
                      }
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      {(Object.keys(STATUS_META) as ReleaseStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyNotes(rel.id)}
                      title="Copy release notes (markdown)"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        removeRelease(rel.id);
                        toast.success("Release removed");
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t bg-muted/20"
                      >
                        <div className="space-y-2 px-5 py-3">
                          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            <FileText className="size-3" /> Scope
                          </div>
                          {releaseTasks.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No tasks linked yet.
                            </p>
                          ) : (
                            <ul className="space-y-1">
                              {releaseTasks.map((t) => (
                                <li
                                  key={t.id}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  {t.status === "done" ? (
                                    <CheckCircle2 className="size-3 text-status-done" />
                                  ) : (
                                    <span className="size-3 rounded-full border" />
                                  )}
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {t.code}
                                  </span>
                                  <span className="flex-1 truncate">{t.title}</span>
                                  <button
                                    onClick={() => removeTask(rel.id, t.id)}
                                    className="text-muted-foreground hover:text-foreground"
                                    title="Remove from release"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="pt-1">
                            <select
                              onChange={(e) => {
                                if (!e.target.value) return;
                                addTasks(rel.id, [e.target.value]);
                                e.target.value = "";
                              }}
                              className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                              defaultValue=""
                            >
                              <option value="">+ Add task to release…</option>
                              {projectTaskOptions
                                .filter((t) => !rel.taskIds.includes(t.id))
                                .map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.code} · {t.title}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New release</DialogTitle>
            <DialogDescription>
              Group a set of sprints into a launch milestone with notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Spring launch"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Version</Label>
                <Input
                  value={draft.version}
                  onChange={(e) => setDraft((d) => ({ ...d, version: e.target.value }))}
                  placeholder="v1.4"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Target date</Label>
                <Input
                  type="date"
                  value={draft.targetDate}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, targetDate: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Create release</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
