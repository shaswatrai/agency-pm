"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectHealthCard } from "@/components/dashboard/ProjectHealthCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { NewProjectDialog } from "@/components/dialogs/NewProjectDialog";
import { useStore, useCurrentUser } from "@/lib/db/store";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const timeEntries = useStore((s) => s.timeEntries);
  const currentUser = useCurrentUser();
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const overdueTasks = tasks.filter((t) => {
    if (t.status === "done" || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date("2026-04-28");
  }).length;

  const totalBudget = projects
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + (p.totalBudget ?? 0), 0);

  const billableHoursWeek =
    timeEntries
      .filter((e) => e.billable)
      .reduce((sum, e) => sum + e.durationMinutes, 0) / 60;

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Welcome back, {currentUser.fullName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's moving today across your studio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Sparkles className="size-4" /> Quick capture
          </Button>
          <Button size="sm" onClick={() => setNewProjectOpen(true)}>
            <Plus className="size-4" /> New project
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active projects"
          value={String(activeProjects)}
          delta={{ value: "+2 this week", positive: true }}
          accent="primary"
        />
        <StatCard
          label="Pipeline value"
          value={formatCurrency(totalBudget)}
          delta={{ value: "+12.4%", positive: true }}
          hint="Total contracted across active work"
          accent="success"
        />
        <StatCard
          label="Billable hours · week"
          value={billableHoursWeek.toFixed(1)}
          delta={{ value: "−3.2h vs last", positive: false }}
          hint="Across 6 team members"
          accent="warning"
        />
        <StatCard
          label="Overdue tasks"
          value={String(overdueTasks)}
          delta={{ value: "Needs attention", positive: false }}
          accent="destructive"
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Project health
            </h2>
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {projects.map((project, idx) => (
              <ProjectHealthCard
                key={project.id}
                project={project}
                index={idx}
              />
            ))}
          </div>
        </div>
        <aside className="lg:sticky lg:top-4 self-start">
          <ActivityFeed />
        </aside>
      </div>

      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
      />
    </div>
  );
}
