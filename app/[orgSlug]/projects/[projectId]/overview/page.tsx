"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Image as ImageIcon,
  GitBranch,
  ArrowRight,
} from "lucide-react";
import { useStore } from "@/lib/db/store";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { StatusPill } from "@/components/pills/StatusPill";
import { BudgetBurnPanel } from "@/components/project/BudgetBurnPanel";
import { RetrospectivePanel } from "@/components/sprint/RetrospectivePanel";
import { ReleasesPanel } from "@/components/sprint/ReleasesPanel";
import { cn, formatCurrency } from "@/lib/utils";

export default function ProjectOverviewPage() {
  const params = useParams<{ projectId: string; orgSlug: string }>();
  const allProjects = useStore((s) => s.projects);
  const allClients = useStore((s) => s.clients);
  const allPhases = useStore((s) => s.phases);
  const allTasks = useStore((s) => s.tasks);
  const allFiles = useStore((s) => s.files);
  const users = useStore((s) => s.users);

  const project = allProjects.find((p) => p.id === params.projectId);
  const client = project
    ? allClients.find((c) => c.id === project.clientId)
    : undefined;

  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === params.projectId),
    [allPhases, params.projectId],
  );
  const tasks = useMemo(
    () => allTasks.filter((t) => t.projectId === params.projectId),
    [allTasks, params.projectId],
  );
  const files = useMemo(
    () => allFiles.filter((f) => f.projectId === params.projectId),
    [allFiles, params.projectId],
  );

  if (!project || !client) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted-foreground">
        Project not found.
      </div>
    );
  }

  const team = Array.from(
    new Set(tasks.flatMap((t) => t.assigneeIds)),
  )
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean) as typeof users;

  const recentReview = tasks
    .filter((t) => t.status === "in_review")
    .slice(0, 3);
  const overdue = tasks
    .filter((t) => {
      if (!t.dueDate || t.status === "done") return false;
      return new Date(t.dueDate) < new Date("2026-04-29");
    })
    .slice(0, 3);
  const recentFiles = files.slice(0, 4);

  // Phase completion stats
  const phaseStats = phases.map((ph) => {
    const phTasks = tasks.filter((t) => t.phaseId === ph.id);
    const done = phTasks.filter((t) => t.status === "done").length;
    return {
      phase: ph,
      total: phTasks.length,
      done,
      pct: phTasks.length === 0 ? 0 : (done / phTasks.length) * 100,
    };
  });

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <BudgetBurnPanel projectId={params.projectId} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-6 min-w-0">
          {/* Description */}
          {project.description ? (
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                About
              </h2>
              <p className="text-sm leading-relaxed">{project.description}</p>
            </motion.section>
          ) : null}

          {/* Phase progress */}
          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Phase progress
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {phaseStats.filter((p) => p.pct === 100).length} of{" "}
                {phaseStats.length} complete
              </span>
            </div>
            <Card className="divide-y">
              {phaseStats.map(({ phase, total, done, pct }, i) => (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full text-xs font-mono",
                      pct === 100
                        ? "bg-status-done/15 text-status-done"
                        : pct > 0
                          ? "bg-status-progress/15 text-status-progress"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {pct === 100 ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{phase.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {total === 0
                        ? "No tasks yet"
                        : `${done} / ${total} tasks complete`}
                    </p>
                  </div>
                  <div className="flex w-32 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.3 + i * 0.04, duration: 0.5 }}
                        className={cn(
                          "h-full rounded-full",
                          pct === 100
                            ? "bg-status-done"
                            : "bg-gradient-to-r from-primary to-primary/60",
                        )}
                      />
                    </div>
                    <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">
                      {Math.round(pct)}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </Card>
          </motion.section>

          {/* Awaiting review */}
          {recentReview.length > 0 || overdue.length > 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid gap-4 md:grid-cols-2"
            >
              {recentReview.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-status-review">
                    In review
                  </h3>
                  <Card className="divide-y">
                    {recentReview.map((t) => (
                      <Link
                        key={t.id}
                        href={`/${params.orgSlug}/projects/${project.id}/kanban?task=${t.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {t.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {t.code}
                          </p>
                        </div>
                        <StatusPill status={t.status} size="sm" animated={false} />
                      </Link>
                    ))}
                  </Card>
                </div>
              ) : null}
              {overdue.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-status-blocked">
                    Overdue
                  </h3>
                  <Card className="divide-y">
                    {overdue.map((t) => (
                      <Link
                        key={t.id}
                        href={`/${params.orgSlug}/projects/${project.id}/kanban?task=${t.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {t.title}
                          </p>
                          <p className="text-[11px] text-status-blocked">
                            Was due{" "}
                            {t.dueDate
                              ? format(parseISO(t.dueDate), "MMM d")
                              : ""}
                          </p>
                        </div>
                        <StatusPill status={t.status} size="sm" animated={false} />
                      </Link>
                    ))}
                  </Card>
                </div>
              ) : null}
            </motion.section>
          ) : null}

          {/* Recent files */}
          {recentFiles.length > 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Recent files
                </h2>
                <Link
                  href={`/${params.orgSlug}/files`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  All files <ArrowRight className="size-3" />
                </Link>
              </div>
              <Card className="divide-y">
                {recentFiles.map((f) => {
                  const Icon =
                    f.mimeType?.startsWith("image/")
                      ? ImageIcon
                      : f.mimeType?.startsWith("video/")
                        ? GitBranch
                        : FileText;
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {f.fileName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {(f.sizeBytes / 1024 / 1024).toFixed(1)} MB · v
                          {f.version} ·{" "}
                          {format(parseISO(f.createdAt), "MMM d")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </motion.section>
          ) : null}
        </div>

        {/* Right rail */}
        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          <Card className="p-5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Stakeholders
            </h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Client</span>
                <Link
                  href={`/${params.orgSlug}/clients/${client.id}`}
                  className="font-medium hover:underline"
                >
                  {client.name}
                </Link>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">PM</span>
                <span className="font-medium">
                  {users.find((u) => u.id === project.projectManagerId)
                    ?.fullName ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Account manager</span>
                <span className="font-medium">
                  {users.find((u) => u.id === client.accountManagerId)
                    ?.fullName ?? "—"}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Team ({team.length})
            </h3>
            <div className="mt-3 space-y-1">
              {team.map((u) => {
                const userTasks = tasks.filter((t) =>
                  t.assigneeIds.includes(u.id),
                );
                return (
                  <Link
                    key={u.id}
                    href={`/${params.orgSlug}/profile/${u.id}`}
                    className="-mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
                  >
                    <UserAvatar
                      user={{ name: u.fullName, avatarUrl: u.avatarUrl }}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {u.fullName}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {u.role.replace("_", " ")}
                      </p>
                    </div>
                    <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {userTasks.length}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Timeline
            </h3>
            <div className="mt-3 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Started</span>
                <span className="font-medium">
                  {project.startDate
                    ? format(parseISO(project.startDate), "MMM d, yyyy")
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Target delivery</span>
                <span className="font-medium">
                  {project.endDate
                    ? format(parseISO(project.endDate), "MMM d, yyyy")
                    : "—"}
                </span>
              </div>
              {project.totalBudget ? (
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(project.totalBudget, client.currency)}
                  </span>
                </div>
              ) : null}
              {project.estimatedHours ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estimate</span>
                  <span className="font-mono font-medium">
                    {project.estimatedHours}h
                  </span>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              At a glance
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="Tasks" value={String(tasks.length)} />
              <Stat
                label="Done"
                value={`${tasks.filter((t) => t.status === "done").length}`}
                tint="text-status-done"
              />
              <Stat
                label="In review"
                value={String(
                  tasks.filter((t) => t.status === "in_review").length,
                )}
                tint="text-status-review"
              />
              <Stat
                label="Blocked"
                value={String(
                  tasks.filter((t) => t.status === "blocked").length,
                )}
                tint="text-status-blocked"
              />
            </div>
          </Card>
        </aside>
      </div>

      {/* Sprint cadence: retros + releases — agile-mode features (PRD §5.13) */}
      <div className="mt-8 grid gap-6">
        <RetrospectivePanel projectId={params.projectId} />
        <ReleasesPanel projectId={params.projectId} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-0.5 font-mono text-lg font-semibold", tint)}>
        {value}
      </p>
    </div>
  );
}
