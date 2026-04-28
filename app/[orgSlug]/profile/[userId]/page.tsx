"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { format, parseISO, isPast, isToday } from "date-fns";
import {
  ArrowLeft,
  Mail,
  CalendarClock,
  Briefcase,
  Target,
  Activity as ActivityIcon,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useStore } from "@/lib/db/store";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { StatusPill } from "@/components/pills/StatusPill";
import { PriorityPill } from "@/components/pills/PriorityPill";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";

const REFERENCE_DATE = new Date("2026-04-29");

export default function ProfilePage() {
  const params = useParams<{ userId: string; orgSlug: string }>();
  const users = useStore((s) => s.users);
  const allTasks = useStore((s) => s.tasks);
  const allProjects = useStore((s) => s.projects);
  const allTimeEntries = useStore((s) => s.timeEntries);

  const user = users.find((u) => u.id === params.userId);

  const tasks = useMemo(
    () =>
      user ? allTasks.filter((t) => t.assigneeIds.includes(user.id)) : [],
    [user, allTasks],
  );
  const timeEntries = useMemo(
    () =>
      user ? allTimeEntries.filter((e) => e.userId === user.id) : [],
    [user, allTimeEntries],
  );

  if (!user) {
    return (
      <div className="px-4 py-12 md:px-8 text-center">
        <p className="text-sm text-muted-foreground">Member not found.</p>
        <Link
          href={`/${params.orgSlug}/dashboard`}
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  // Stats
  const activeTasks = tasks.filter((t) => t.status !== "done");
  const overdue = activeTasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < REFERENCE_DATE &&
      !isToday(parseISO(t.dueDate)),
  );
  const inReview = activeTasks.filter((t) => t.status === "in_review");

  const totalMinutes = timeEntries.reduce(
    (s, e) => s + e.durationMinutes,
    0,
  );
  const billableMinutes = timeEntries
    .filter((e) => e.billable)
    .reduce((s, e) => s + e.durationMinutes, 0);
  const utilizationPct = Math.min(
    100,
    Math.round((totalMinutes / 60 / 40) * 100),
  );

  // Project membership
  const projectMembership = Array.from(
    new Set(tasks.map((t) => t.projectId)),
  )
    .map((id) => allProjects.find((p) => p.id === id))
    .filter(Boolean) as typeof allProjects;

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1200px] mx-auto">
      <Link
        href={`/${params.orgSlug}/dashboard`}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-card overflow-hidden"
      >
        <div className="relative h-24 bg-gradient-to-br from-primary/30 via-primary/15 to-transparent">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "repeating-linear-gradient(45deg, hsl(var(--muted-foreground) / 0.2) 0 1px, transparent 1px 12px)",
            }}
          />
        </div>
        <div className="-mt-10 px-6 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <UserAvatar
                user={{ name: user.fullName, avatarUrl: user.avatarUrl }}
                size="lg"
                className="size-20 ring-4 ring-card"
              />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {user.fullName}
                </h1>
                <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                  {user.role.replace("_", " ")}
                </p>
                <a
                  href={`mailto:${user.email}`}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Mail className="size-3" /> {user.email}
                </a>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-pill bg-muted px-2 py-0.5">
                <Briefcase className="size-3" />
                {projectMembership.length} projects
              </span>
              <span className="inline-flex items-center gap-1 rounded-pill bg-muted px-2 py-0.5">
                <Target className="size-3" />
                40h/week capacity
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          {
            label: "Active tasks",
            value: String(activeTasks.length),
            tint: "text-foreground",
            accent: "from-primary/15",
            icon: ActivityIcon,
          },
          {
            label: "In review",
            value: String(inReview.length),
            tint: "text-status-review",
            accent: "from-status-review/15",
            icon: CheckCircle2,
          },
          {
            label: "Hours logged",
            value: `${(totalMinutes / 60).toFixed(1)}h`,
            tint: "text-foreground",
            accent: "from-status-progress/15",
            icon: Clock,
          },
          {
            label: "Utilization",
            value: `${utilizationPct}%`,
            tint:
              utilizationPct > 90
                ? "text-status-revisions"
                : utilizationPct > 60
                  ? "text-status-done"
                  : "text-foreground",
            accent: "from-status-done/15",
            icon: CalendarClock,
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="relative overflow-hidden rounded-lg border bg-card p-5"
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent",
                stat.accent,
              )}
            />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
                <p className={cn("mt-2 font-mono text-2xl font-semibold", stat.tint)}>
                  {stat.value}
                </p>
              </div>
              <stat.icon className="size-4 text-muted-foreground" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Tasks */}
        <div className="space-y-4">
          {overdue.length > 0 ? (
            <section>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-status-blocked">
                Overdue ({overdue.length})
              </h2>
              <Card className="divide-y">
                {overdue.map((t) => {
                  const project = allProjects.find(
                    (p) => p.id === t.projectId,
                  );
                  return (
                    <Link
                      key={t.id}
                      href={`/${params.orgSlug}/projects/${t.projectId}/kanban?task=${t.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {t.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {project?.name} · was due{" "}
                          {t.dueDate
                            ? format(parseISO(t.dueDate), "MMM d")
                            : ""}
                        </p>
                      </div>
                      <PriorityPill priority={t.priority} size="sm" />
                      <StatusPill
                        status={t.status}
                        size="sm"
                        animated={false}
                      />
                    </Link>
                  );
                })}
              </Card>
            </section>
          ) : null}

          <section>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Active tasks ({activeTasks.length})
            </h2>
            {activeTasks.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All caught up"
                description={`${user.fullName.split(" ")[0]} has no active tasks right now.`}
                variant="card"
              />
            ) : (
              <Card className="divide-y">
                {activeTasks.slice(0, 12).map((t) => {
                  const project = allProjects.find(
                    (p) => p.id === t.projectId,
                  );
                  return (
                    <Link
                      key={t.id}
                      href={`/${params.orgSlug}/projects/${t.projectId}/kanban?task=${t.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {t.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {project?.name}
                          {t.dueDate
                            ? ` · due ${format(parseISO(t.dueDate), "MMM d")}`
                            : ""}
                        </p>
                      </div>
                      <PriorityPill priority={t.priority} size="sm" />
                      <StatusPill
                        status={t.status}
                        size="sm"
                        animated={false}
                      />
                    </Link>
                  );
                })}
              </Card>
            )}
          </section>
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          <Card className="p-5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Projects ({projectMembership.length})
            </h3>
            <div className="mt-3 space-y-1.5">
              {projectMembership.map((p) => {
                const ptasks = tasks.filter((t) => t.projectId === p.id);
                const done = ptasks.filter((t) => t.status === "done").length;
                return (
                  <Link
                    key={p.id}
                    href={`/${params.orgSlug}/projects/${p.id}/overview`}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
                  >
                    <span className="truncate text-sm">{p.name}</span>
                    <span className="rounded-pill bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {done}/{ptasks.length}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recent time logs
            </h3>
            <ul className="mt-3 space-y-2">
              {timeEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No time logged yet.
                </p>
              ) : (
                timeEntries
                  .slice()
                  .reverse()
                  .slice(0, 5)
                  .map((e) => {
                    const t = allTasks.find((x) => x.id === e.taskId);
                    return (
                      <li
                        key={e.id}
                        className="flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {e.description}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {t?.title} · {format(parseISO(e.date), "MMM d")}
                          </p>
                        </div>
                        <span className="font-mono text-xs">
                          {(e.durationMinutes / 60).toFixed(1)}h
                        </span>
                      </li>
                    );
                  })
              )}
            </ul>
            <div className="mt-3 border-t pt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billable</span>
                <span className="font-mono">
                  {(billableMinutes / 60).toFixed(1)}h
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono">
                  {(totalMinutes / 60).toFixed(1)}h
                </span>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
