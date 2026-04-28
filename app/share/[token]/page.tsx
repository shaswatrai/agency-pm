"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/lib/db/store";
import { Card } from "@/components/ui/card";
import { HealthPill } from "@/components/pills/HealthPill";
import { StatusPill } from "@/components/pills/StatusPill";
import { cn } from "@/lib/utils";

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const allProjects = useStore((s) => s.projects);
  const allClients = useStore((s) => s.clients);
  const allPhases = useStore((s) => s.phases);
  const allTasks = useStore((s) => s.tasks);

  // Reverse the simple token format: tokens end with `_<projectId-last-4>`
  // (or with `_<seed>` appended after regenerate). Match by suffix.
  const project = useMemo(() => {
    const suffix = params.token.split("_")[2]; // first 4 chars of tail
    if (!suffix) return null;
    return (
      allProjects.find((p) => p.id.endsWith(suffix)) ?? allProjects[0]
    );
  }, [params.token, allProjects]);

  if (!project) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="text-center">
          <p className="text-base font-semibold">Link expired or revoked</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask the project owner for a new shareable link.
          </p>
        </div>
      </div>
    );
  }

  const client = allClients.find((c) => c.id === project.clientId);
  const phases = allPhases.filter((p) => p.projectId === project.id);
  // Only public-visible tasks
  const tasks = allTasks.filter(
    (t) => t.projectId === project.id && t.clientVisible,
  );
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
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      {/* Read-only banner */}
      <div className="mb-6 flex items-center gap-2 rounded-md border bg-card/60 px-3 py-2 text-[11px] text-muted-foreground">
        <Eye className="size-3.5" />
        <span>You're viewing a read-only share link</span>
        <span className="ml-auto font-mono">{params.token}</span>
      </div>

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Shared by Atelier Studio
            </p>
            <p className="text-sm font-semibold">{client?.name}</p>
          </div>
        </div>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-6"
      >
        <Card className="overflow-hidden">
          <div className="relative h-20 bg-gradient-to-br from-primary/30 to-primary/10">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "repeating-linear-gradient(45deg, hsl(var(--muted-foreground) / 0.2) 0 1px, transparent 1px 12px)",
              }}
            />
          </div>
          <div className="-mt-10 px-6 pb-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {project.code}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {project.name}
                </h1>
              </div>
              <HealthPill health={project.health} />
            </div>

            {project.description ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {project.description}
              </p>
            ) : null}

            <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Progress
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${project.progress * 100}%` }}
                      transition={{ duration: 0.7, delay: 0.2 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                    />
                  </div>
                  <span className="font-mono text-sm font-semibold">
                    {Math.round(project.progress * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Tasks shared
                </p>
                <p className="mt-1 font-mono text-sm font-semibold">
                  {tasks.length}{" "}
                  <span className="text-muted-foreground">
                    of {project.taskCounts.total} total
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Target delivery
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {project.endDate
                    ? format(parseISO(project.endDate), "MMM d, yyyy")
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mt-6"
      >
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Phase progress
        </h2>
        <Card className="divide-y">
          {phaseStats.map(({ phase, done, total, pct }, i) => (
            <div
              key={phase.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs",
                  pct === 100
                    ? "bg-status-done/15 text-status-done"
                    : pct > 0
                      ? "bg-status-progress/15 text-status-progress"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {pct === 100 ? <CheckCircle2 className="size-3.5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{phase.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {total === 0
                    ? "No public tasks"
                    : `${done} / ${total} complete`}
                </p>
              </div>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
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
            </div>
          ))}
        </Card>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-6"
      >
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Public tasks ({tasks.length})
        </h2>
        {tasks.length === 0 ? (
          <Card className="px-4 py-10 text-center text-sm text-muted-foreground">
            No tasks have been shared with you yet.
          </Card>
        ) : (
          <Card className="divide-y">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.dueDate
                      ? `Due ${format(parseISO(t.dueDate), "MMM d")}`
                      : "No date"}
                  </p>
                </div>
                <StatusPill status={t.status} size="sm" animated={false} />
              </div>
            ))}
          </Card>
        )}
      </motion.section>

      <footer className="mt-10 flex items-center justify-between border-t pt-6 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" /> Snapshot from{" "}
          {format(new Date(), "MMM d, h:mm a")}
        </span>
        <a
          href="https://atelier.app"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          Made with Atelier <ExternalLink className="size-3" />
        </a>
      </footer>
    </div>
  );
}
