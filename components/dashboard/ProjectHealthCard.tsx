"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Project } from "@/types/domain";
import { HealthPill } from "@/components/pills/HealthPill";
import { PriorityPill } from "@/components/pills/PriorityPill";
import { AvatarStack } from "@/components/UserAvatar";
import { useStore } from "@/lib/db/store";
import { formatCurrency } from "@/lib/utils";

export function ProjectHealthCard({
  project,
  index,
}: {
  project: Project;
  index: number;
}) {
  const orgSlug = useStore((s) => s.organization.slug);
  const users = useStore((s) => s.users);
  const allTasks = useStore((s) => s.tasks);
  const allClients = useStore((s) => s.clients);

  const tasks = allTasks.filter((t) => t.projectId === project.id);
  const client = allClients.find((c) => c.id === project.clientId);

  const assignedUsers = Array.from(
    new Set(tasks.flatMap((t) => t.assigneeIds)),
  )
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean) as typeof users;

  const progressPct = Math.round(project.progress * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28,
        delay: index * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        href={`/${orgSlug}/projects/${project.id}/overview`}
        className="group block rounded-lg border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">
                {project.code}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{client?.name}</span>
            </div>
            <h3 className="mt-1 text-base font-semibold tracking-tight group-hover:text-primary">
              {project.name}
            </h3>
          </div>
          <HealthPill health={project.health} size="sm" />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <PriorityPill priority={project.priority} size="sm" />
          {project.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="rounded-pill bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {project.taskCounts.done}/{project.taskCounts.total} tasks ·{" "}
              {progressPct}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.05 }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <AvatarStack
            users={assignedUsers.map((u) => ({
              name: u.fullName,
              avatarUrl: u.avatarUrl,
            }))}
            max={4}
            size="sm"
          />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {project.endDate ? (
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3" />
                {format(parseISO(project.endDate), "MMM d")}
              </span>
            ) : null}
            {project.totalBudget ? (
              <span className="font-medium text-foreground">
                {formatCurrency(project.totalBudget, client?.currency)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Open board
          <ArrowRight className="ml-1 size-3" />
        </div>
      </Link>
    </motion.div>
  );
}
