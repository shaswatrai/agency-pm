"use client";

import { useMemo } from "react";
import { Filter, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { useStore } from "@/lib/db/store";
import {
  useProjectFilters,
  useFilterFor,
  countActiveFilters,
} from "@/lib/db/filters";
import {
  KANBAN_COLUMNS,
  STATUS_META,
  PRIORITY_META,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

interface ProjectFilterPopoverProps {
  projectId: string;
}

export function ProjectFilterPopover({ projectId }: ProjectFilterPopoverProps) {
  const allTasks = useStore((s) => s.tasks);
  const users = useStore((s) => s.users);
  const projectTasks = useMemo(
    () => allTasks.filter((t) => t.projectId === projectId),
    [allTasks, projectId],
  );
  const projectAssignees = Array.from(
    new Set(projectTasks.flatMap((t) => t.assigneeIds)),
  )
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean) as typeof users;

  const filter = useFilterFor(projectId);
  const setFilter = useProjectFilters((s) => s.setFilter);
  const clearFilter = useProjectFilters((s) => s.clearFilter);
  const activeCount = countActiveFilters(filter);

  const toggleStatus = (s: TaskStatus) => {
    const next = filter.statuses.includes(s)
      ? filter.statuses.filter((x) => x !== s)
      : [...filter.statuses, s];
    setFilter(projectId, { statuses: next });
  };
  const togglePriority = (p: TaskPriority) => {
    const next = filter.priorities.includes(p)
      ? filter.priorities.filter((x) => x !== p)
      : [...filter.priorities, p];
    setFilter(projectId, { priorities: next });
  };
  const toggleAssignee = (id: string) => {
    const next = filter.assigneeIds.includes(id)
      ? filter.assigneeIds.filter((x) => x !== id)
      : [...filter.assigneeIds, id];
    setFilter(projectId, { assigneeIds: next });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={activeCount > 0 ? "default" : "ghost"}
          size="sm"
          className={activeCount > 0 ? "" : ""}
        >
          <Filter className="size-4" />
          Filter
          {activeCount > 0 ? (
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0 text-[10px] font-semibold",
                activeCount > 0
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Filter tasks</p>
          {activeCount > 0 ? (
            <button
              onClick={() => clearFilter(projectId)}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <X className="size-3" /> Clear all
            </button>
          ) : null}
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Search
            </label>
            <Input
              value={filter.search}
              onChange={(e) =>
                setFilter(projectId, { search: e.target.value })
              }
              placeholder="Title or code…"
              className="mt-1 h-8 text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {KANBAN_COLUMNS.map((s) => {
                const meta = STATUS_META[s];
                const active = filter.statuses.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary/40 bg-primary/5 text-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Priority
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(["low", "medium", "high", "urgent"] as TaskPriority[]).map(
                (p) => {
                  const meta = PRIORITY_META[p];
                  const active = filter.priorities.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePriority(p)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary/40 bg-primary/5 text-foreground"
                          : "hover:bg-accent",
                      )}
                    >
                      <span
                        className={cn("size-1.5 rounded-full", meta.dot)}
                      />
                      {meta.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Assignees
            </label>
            <div className="mt-1.5 max-h-48 space-y-0.5 overflow-y-auto scrollbar-thin">
              {projectAssignees.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">
                  No assigned tasks yet.
                </p>
              ) : (
                projectAssignees.map((u) => {
                  const active = filter.assigneeIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleAssignee(u.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                        active
                          ? "bg-primary/10"
                          : "hover:bg-accent",
                      )}
                    >
                      <UserAvatar
                        user={{
                          name: u.fullName,
                          avatarUrl: u.avatarUrl,
                        }}
                        size="xs"
                      />
                      <span className="flex-1 truncate text-xs font-medium">
                        {u.fullName}
                      </span>
                      {active ? (
                        <span className="size-1.5 rounded-full bg-primary" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
