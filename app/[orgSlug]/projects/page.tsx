"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, LayoutGrid, List as ListIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProjectHealthCard } from "@/components/dashboard/ProjectHealthCard";
import { EmptyState } from "@/components/EmptyState";
import { NewProjectDialog } from "@/components/dialogs/NewProjectDialog";
import { FolderOpen } from "lucide-react";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import { HealthPill } from "@/components/pills/HealthPill";
import { PriorityPill } from "@/components/pills/PriorityPill";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export default function ProjectsPage() {
  const projects = useStore((s) => s.projects);
  const clients = useStore((s) => s.clients);
  const orgSlug = useStore((s) => s.organization.slug);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newOpen, setNewOpen] = useState(false);

  const filtered = projects.filter((p) => {
    const matchesQuery =
      query === "" ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.code.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const statusCounts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    acc.all = (acc.all ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Projects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {projects.length} projects across {clients.length} clients
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="size-4" /> New project
        </Button>
      </motion.div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-md border bg-card p-0.5">
          {[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "on_hold", label: "On hold" },
            { value: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === tab.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {statusCounts[tab.value] ? (
                <span className="ml-1.5 opacity-60">
                  {statusCounts[tab.value]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1 rounded-md border bg-card p-0.5">
          <button
            onClick={() => setView("grid")}
            className={cn(
              "rounded px-2 py-1 transition-colors",
              view === "grid"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            onClick={() => setView("table")}
            className={cn(
              "rounded px-2 py-1 transition-colors",
              view === "table"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ListIcon className="size-4" />
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p, i) => (
            <ProjectHealthCard key={p.id} project={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Health</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Progress</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2 text-right">Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => {
                const c = clients.find((x) => x.id === p.clientId);
                return (
                  <tr key={p.id} className="transition-colors hover:bg-accent">
                    <td className="px-4 py-3">
                      <Link
                        href={`/${orgSlug}/projects/${p.id}/overview`}
                        className="block min-w-0"
                      >
                        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {p.code}
                        </div>
                        <div className="text-sm font-medium hover:text-primary">
                          {p.name}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {c?.name}
                    </td>
                    <td className="px-4 py-3">
                      <HealthPill health={p.health} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityPill priority={p.priority} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${p.progress * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(p.progress * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.endDate ? format(parseISO(p.endDate), "MMM d") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {p.totalBudget
                        ? formatCurrency(p.totalBudget, c?.currency)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={FolderOpen}
            title="No projects match"
            description={
              query
                ? `Nothing matches "${query}" in the ${statusFilter === "all" ? "current" : statusFilter} list.`
                : "Try a different status filter or create a new project."
            }
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      ) : null}

      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
