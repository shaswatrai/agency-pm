"use client";

import { useMemo, useRef } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useState } from "react";
import { format, parseISO, isPast, isToday } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  MessageSquare,
  Paperclip,
  X,
} from "lucide-react";
import type { Task } from "@/types/domain";
import { useStore } from "@/lib/db/store";
import { applyTaskFilter, useFilterFor } from "@/lib/db/filters";
import { StatusPill } from "@/components/pills/StatusPill";
import { PriorityPill } from "@/components/pills/PriorityPill";
import { AvatarStack } from "@/components/UserAvatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  STATUS_META,
  PRIORITY_META,
  KANBAN_COLUMNS,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/design/tokens";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ListViewProps {
  projectId: string;
  onOpenTask: (taskId: string) => void;
}

export function ListView({ projectId, onOpenTask }: ListViewProps) {
  const allTasks = useStore((s) => s.tasks);
  const allPhases = useStore((s) => s.phases);
  const updateTask = useStore((s) => s.updateTask);
  const users = useStore((s) => s.users);
  const filter = useFilterFor(projectId);
  const tasks = useMemo(
    () =>
      applyTaskFilter(
        allTasks.filter((t) => t.projectId === projectId),
        filter,
      ),
    [allTasks, projectId, filter],
  );
  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === projectId),
    [allPhases, projectId],
  );
  const [sorting, setSorting] = useState<SortingState>([
    { id: "dueDate", desc: false },
  ]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected =
    tasks.length > 0 && tasks.every((t) => selectedIds.has(t.id));
  const someSelected =
    selectedIds.size > 0 && !allSelected;
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(tasks.map((t) => t.id)));
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const bulkSetStatus = (status: TaskStatus) => {
    selectedIds.forEach((id) => updateTask(id, { status }));
    toast.success(
      `Moved ${selectedIds.size} task${selectedIds.size !== 1 ? "s" : ""} to ${STATUS_META[status].label}`,
    );
    clearSelection();
  };
  const bulkSetPriority = (priority: TaskPriority) => {
    selectedIds.forEach((id) => updateTask(id, { priority }));
    toast.success(
      `Set priority to ${PRIORITY_META[priority].label} on ${selectedIds.size} task${selectedIds.size !== 1 ? "s" : ""}`,
    );
    clearSelection();
  };

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        id: "title",
        header: "Task",
        accessorKey: "title",
        cell: ({ row }) => {
          const t = row.original;
          const phase = phases.find((p) => p.id === t.phaseId);
          return (
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <span>{t.code.split("-").slice(-1)[0]}</span>
                {phase ? (
                  <>
                    <span>·</span>
                    <span className="truncate normal-case tracking-normal">
                      {phase.name}
                    </span>
                  </>
                ) : null}
              </div>
              <span className="truncate text-sm font-medium">{t.title}</span>
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => <StatusPill status={row.original.status} size="sm" />,
        size: 130,
      },
      {
        id: "priority",
        header: "Priority",
        accessorKey: "priority",
        cell: ({ row }) => (
          <PriorityPill priority={row.original.priority} size="sm" />
        ),
        size: 110,
      },
      {
        id: "assignees",
        header: "Assignees",
        cell: ({ row }) => {
          const t = row.original;
          const us = t.assigneeIds
            .map((id) => users.find((u) => u.id === id))
            .filter(Boolean) as typeof users;
          if (us.length === 0)
            return (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            );
          return (
            <AvatarStack
              users={us.map((u) => ({
                name: u.fullName,
                avatarUrl: u.avatarUrl,
              }))}
              max={3}
              size="xs"
            />
          );
        },
        size: 110,
      },
      {
        id: "dueDate",
        header: "Due",
        accessorFn: (row) => row.dueDate ?? "",
        cell: ({ row }) => {
          const d = row.original.dueDate;
          if (!d) return <span className="text-xs text-muted-foreground">—</span>;
          const date = parseISO(d);
          const overdue =
            isPast(date) && !isToday(date) && row.original.status !== "done";
          const today = isToday(date);
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-pill px-1.5 py-0.5 text-xs",
                overdue && "bg-status-blocked/15 text-status-blocked",
                today && "bg-status-revisions/15 text-status-revisions",
                !overdue && !today && "text-muted-foreground",
              )}
            >
              <Calendar className="size-3" />
              {format(date, "MMM d")}
            </span>
          );
        },
        size: 110,
      },
      {
        id: "hours",
        header: "Hours",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <span className="font-mono text-xs">
              {t.actualHours.toFixed(1)}/{t.estimatedHours ?? "—"}
            </span>
          );
        },
        size: 90,
      },
      {
        id: "activity",
        header: "Activity",
        cell: ({ row }) => {
          const t = row.original;
          return (
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
          );
        },
        size: 100,
      },
    ],
    [users, phases],
  );

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  });

  return (
    <div className="relative flex h-full flex-col">
      <div
        ref={parentRef}
        className="flex-1 overflow-auto scrollbar-thin"
      >
        <div className="min-w-[900px]">
          <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
            <div className="grid grid-cols-[40px_minmax(280px,1.5fr)_130px_110px_110px_110px_90px_100px] gap-4 px-6 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center">
                <Checkbox
                  checked={
                    allSelected
                      ? true
                      : someSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </div>
              {table.getHeaderGroups()[0].headers.map((header) => {
                const sortDir = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                return (
                  <button
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    disabled={!canSort}
                    className={cn(
                      "flex items-center gap-1 text-left",
                      canSort && "transition-colors hover:text-foreground",
                    )}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {canSort ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : sortDir === "desc" ? (
                        <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isSelected = selectedIds.has(row.original.id);
              return (
                <div
                  key={row.id}
                  onClick={() => onOpenTask(row.original.id)}
                  className={cn(
                    "group absolute left-0 right-0 grid grid-cols-[40px_minmax(280px,1.5fr)_130px_110px_110px_110px_90px_100px] items-center gap-4 border-b px-6 py-3 text-left transition-colors cursor-pointer",
                    isSelected ? "bg-primary/5" : "hover:bg-accent",
                  )}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    height: `${virtualRow.size}px`,
                  }}
                >
                  <div
                    className="flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOne(row.original.id);
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(row.original.id)}
                      aria-label={`Select ${row.original.title}`}
                    />
                  </div>
                  {row.getVisibleCells().map((cell) => (
                    <div key={cell.id} className="min-w-0">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating bulk actions */}
      <AnimatePresence>
        {selectedIds.size > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 z-30"
          >
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border bg-popover px-3 py-1.5 shadow-lg">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {selectedIds.size}
              </span>
              <span className="text-xs text-muted-foreground">selected</span>
              <span className="mx-1 h-4 w-px bg-border" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Set status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {KANBAN_COLUMNS.map((s) => {
                    const meta = STATUS_META[s];
                    return (
                      <DropdownMenuItem
                        key={s}
                        onSelect={() => bulkSetStatus(s)}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            meta.dot,
                          )}
                        />
                        {meta.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    Priority
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Set priority</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(["low", "medium", "high", "urgent"] as TaskPriority[]).map(
                    (p) => {
                      const meta = PRIORITY_META[p];
                      return (
                        <DropdownMenuItem
                          key={p}
                          onSelect={() => bulkSetPriority(p)}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              meta.dot,
                            )}
                          />
                          {meta.label}
                        </DropdownMenuItem>
                      );
                    },
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="mx-1 h-4 w-px bg-border" />

              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                aria-label="Clear selection"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
