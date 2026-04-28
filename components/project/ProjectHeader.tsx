"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  KanbanSquare,
  List as ListIcon,
  Share2,
  Star,
  CalendarDays,
  Network,
  GanttChart,
  Zap,
  LayoutDashboard,
  Activity,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { HealthPill } from "@/components/pills/HealthPill";
import { PriorityPill } from "@/components/pills/PriorityPill";
import { AvatarStack } from "@/components/UserAvatar";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { BudgetWidget } from "@/components/project/BudgetWidget";
import { ProjectFilterPopover } from "@/components/project/ProjectFilterPopover";
import { ShareProjectDialog } from "@/components/dialogs/ShareProjectDialog";

export function ProjectHeader({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const [shareOpen, setShareOpen] = useState(false);
  const orgSlug = useStore((s) => s.organization.slug);
  const allProjects = useStore((s) => s.projects);
  const allClients = useStore((s) => s.clients);
  const allTasks = useStore((s) => s.tasks);
  const users = useStore((s) => s.users);

  const project = allProjects.find((p) => p.id === projectId);
  const client = project
    ? allClients.find((c) => c.id === project.clientId)
    : undefined;
  const tasks = allTasks.filter((t) => t.projectId === projectId);

  if (!project) {
    return (
      <div className="border-b px-4 py-6 md:px-8 text-sm text-muted-foreground">
        Project not found.
      </div>
    );
  }

  const teamUsers = Array.from(new Set(tasks.flatMap((t) => t.assigneeIds)))
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean) as typeof users;

  const tabs = [
    {
      href: `/${orgSlug}/projects/${projectId}/overview`,
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      href: `/${orgSlug}/projects/${projectId}/kanban`,
      label: "Kanban",
      icon: KanbanSquare,
    },
    {
      href: `/${orgSlug}/projects/${projectId}/list`,
      label: "List",
      icon: ListIcon,
    },
    {
      href: `/${orgSlug}/projects/${projectId}/calendar`,
      label: "Calendar",
      icon: CalendarDays,
    },
    {
      href: `/${orgSlug}/projects/${projectId}/gantt`,
      label: "Gantt",
      icon: GanttChart,
    },
    {
      href: `/${orgSlug}/projects/${projectId}/mindmap`,
      label: "Mind map",
      icon: Network,
    },
    {
      href: `/${orgSlug}/projects/${projectId}/sprint`,
      label: "Sprint",
      icon: Zap,
    },
    {
      href: `/${orgSlug}/projects/${projectId}/activity`,
      label: "Activity",
      icon: Activity,
    },
  ];

  return (
    <div className="border-b bg-card/40">
      <div className="px-4 pt-6 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link
                href={`/${orgSlug}/clients/${client?.id}`}
                className="hover:text-foreground hover:underline"
              >
                {client?.name}
              </Link>
              <span>·</span>
              <span className="font-mono">{project.code}</span>
            </div>
            <h1 className="mt-1 truncate text-xl font-semibold tracking-tight md:text-2xl">
              {project.name}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Star">
              <Star className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="size-4" /> Share
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <HealthPill health={project.health} size="sm" />
          <PriorityPill priority={project.priority} size="sm" />
          {project.startDate && project.endDate ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Calendar className="size-3" />
              {format(parseISO(project.startDate), "MMM d")} →{" "}
              {format(parseISO(project.endDate), "MMM d, yyyy")}
            </span>
          ) : null}
          {project.totalBudget ? (
            <span className="rounded-pill bg-muted px-2 py-0.5 text-xs font-medium">
              {formatCurrency(project.totalBudget, client?.currency)}
            </span>
          ) : null}
          <div className="ml-auto">
            <AvatarStack
              users={teamUsers.map((u) => ({
                name: u.fullName,
                avatarUrl: u.avatarUrl,
              }))}
              max={5}
              size="sm"
            />
          </div>
        </div>

        <div className="mt-5">
          <BudgetWidget projectId={projectId} />
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-b border-transparent">
          <nav className="flex items-center gap-1 -mb-px">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <tab.icon className="size-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <ProjectFilterPopover projectId={projectId} />
        </div>
      </div>

      <ShareProjectDialog
        projectId={projectId}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}
