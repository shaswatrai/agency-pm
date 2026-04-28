"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { format, parseISO, isPast, isToday, isTomorrow } from "date-fns";
import { Calendar, MessageSquare, Paperclip } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/db/store";
import { StatusPill } from "@/components/pills/StatusPill";
import { PriorityPill } from "@/components/pills/PriorityPill";
import { TaskDetailDrawer } from "@/components/views/TaskDetailDrawer";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/domain";

function categorize(t: Task): "overdue" | "today" | "tomorrow" | "upcoming" | "later" {
  if (!t.dueDate) return "later";
  const d = parseISO(t.dueDate);
  if (t.status === "done") return "later";
  if (isPast(d) && !isToday(d)) return "overdue";
  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "tomorrow";
  return "upcoming";
}

const SECTION_META = {
  overdue: { label: "Overdue", cls: "text-status-blocked", count: 0 },
  today: { label: "Today", cls: "text-status-revisions", count: 0 },
  tomorrow: { label: "Tomorrow", cls: "text-status-progress", count: 0 },
  upcoming: { label: "Upcoming", cls: "text-foreground", count: 0 },
  later: { label: "Later / no date", cls: "text-muted-foreground", count: 0 },
} as const;

export default function MyTasksPage() {
  const currentUser = useCurrentUser();
  const allTasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const orgSlug = useStore((s) => s.organization.slug);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const tasks = allTasks.filter((t) =>
    t.assigneeIds.includes(currentUser.id),
  );

  const grouped = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    const cat = categorize(t);
    (acc[cat] ??= []).push(t);
    return acc;
  }, {});

  const sections = ["overdue", "today", "tomorrow", "upcoming", "later"] as const;

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1100px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          My tasks
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tasks.length} tasks assigned to you across your projects
        </p>
      </motion.div>

      <div className="space-y-8">
        {sections.map((section) => {
          const items = grouped[section] ?? [];
          if (items.length === 0) return null;
          const meta = SECTION_META[section];
          return (
            <section key={section}>
              <h2
                className={cn(
                  "mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider",
                  meta.cls,
                )}
              >
                {meta.label}
                <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {items.length}
                </span>
              </h2>
              <div className="overflow-hidden rounded-lg border bg-card divide-y">
                {items.map((t) => {
                  const project = projects.find((p) => p.id === t.projectId);
                  return (
                    <button
                      key={t.id}
                      onClick={() => setOpenTaskId(t.id)}
                      className="group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium group-hover:text-primary">
                          {t.title}
                        </span>
                        <Link
                          href={`/${orgSlug}/projects/${t.projectId}/overview`}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 text-xs text-muted-foreground hover:underline"
                        >
                          {project?.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {t.commentCount > 0 ? (
                          <span className="inline-flex items-center gap-0.5">
                            <MessageSquare className="size-3" />
                            {t.commentCount}
                          </span>
                        ) : null}
                        {t.attachmentCount > 0 ? (
                          <span className="inline-flex items-center gap-0.5">
                            <Paperclip className="size-3" />
                            {t.attachmentCount}
                          </span>
                        ) : null}
                      </div>
                      {t.dueDate ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="size-3" />
                          {format(parseISO(t.dueDate), "MMM d")}
                        </span>
                      ) : null}
                      <PriorityPill priority={t.priority} size="sm" />
                      <StatusPill status={t.status} size="sm" animated={false} />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
            No tasks assigned. Time for a coffee.
          </div>
        ) : null}
      </div>

      <TaskDetailDrawer
        taskId={openTaskId}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  );
}
