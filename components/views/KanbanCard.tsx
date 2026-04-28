"use client";

import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  Copy,
  GitBranch,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Trash2,
  UserPlus,
  CheckSquare,
} from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import type { Task } from "@/types/domain";
import { PriorityPill } from "@/components/pills/PriorityPill";
import { AvatarStack } from "@/components/UserAvatar";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import { dragLift } from "@/lib/design/motion";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  KANBAN_COLUMNS,
  STATUS_META,
  PRIORITY_META,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/design/tokens";

interface KanbanCardProps {
  task: Task;
  onOpen: (taskId: string) => void;
  isOverlay?: boolean;
}

export function KanbanCard({ task, onOpen, isOverlay = false }: KanbanCardProps) {
  const users = useStore((s) => s.users);
  const updateTask = useStore((s) => s.updateTask);
  const removeTask = useStore((s) => s.removeTask);
  const duplicateTask = useStore((s) => s.duplicateTask);
  const assignees = task.assigneeIds
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean) as typeof users;

  const sortable = useSortable({
    id: task.id,
    data: { type: "task", task },
    disabled: isOverlay,
  });

  const handleStatus = (s: TaskStatus) => {
    updateTask(task.id, { status: s });
    toast.success(`Moved to ${STATUS_META[s].label}`);
  };
  const handlePriority = (p: TaskPriority) => {
    updateTask(task.id, { priority: p });
    toast.success(`Priority set to ${PRIORITY_META[p].label}`);
  };
  const handleAssignSelf = (userId: string) => {
    if (task.assigneeIds.includes(userId)) {
      updateTask(task.id, {
        assigneeIds: task.assigneeIds.filter((id) => id !== userId),
      });
      toast.success("Assignee removed");
    } else {
      updateTask(task.id, {
        assigneeIds: [...task.assigneeIds, userId],
      });
      toast.success("Assignee added");
    }
  };
  const handleDuplicate = () => {
    const copy = duplicateTask(task.id);
    if (copy) toast.success(`Duplicated as ${copy.code}`);
  };
  const handleDelete = () => {
    if (confirm(`Delete "${task.title}"? This can't be undone.`)) {
      removeTask(task.id);
      toast.success("Task deleted");
    }
  };

  const style = isOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.45 : 1,
      };

  const dueDate = task.dueDate ? parseISO(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && task.status !== "done";
  const isDueToday = dueDate && isToday(dueDate);

  const cardInner = (
    <motion.div
      ref={sortable.setNodeRef}
      style={style}
      {...sortable.attributes}
      {...sortable.listeners}
      whileHover={isOverlay ? undefined : { y: -2 }}
      {...(isOverlay ? dragLift.whileDrag : {})}
      animate={isOverlay ? { ...dragLift.whileDrag } : undefined}
      onClick={() => !sortable.isDragging && onOpen(task.id)}
      layoutId={isOverlay ? undefined : `task-${task.id}`}
      className={cn(
        "group cursor-pointer rounded-md border bg-card p-3 shadow-sm transition-shadow",
        "hover:shadow-md focus-within:ring-2 focus-within:ring-ring",
        isOverlay && "shadow-lg ring-1 ring-border",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {task.code.split("-").slice(-1)[0]}
        </span>
        <PriorityPill priority={task.priority} size="sm" />
      </div>

      <h4 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary">
        {task.title}
      </h4>

      {task.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {task.subtaskCount > 0 ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CheckSquare className="size-3" /> Subtasks
            </span>
            <span>
              {task.subtasksDone}/{task.subtaskCount}
            </span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-status-progress transition-all"
              style={{
                width: `${task.subtaskCount === 0 ? 0 : (task.subtasksDone / task.subtaskCount) * 100}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {dueDate ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-pill px-1.5 py-0.5",
                isOverdue && "bg-status-blocked/15 text-status-blocked",
                isDueToday && "bg-status-revisions/15 text-status-revisions",
                !isOverdue && !isDueToday && "text-muted-foreground",
              )}
            >
              <Calendar className="size-3" />
              {format(dueDate, "MMM d")}
            </span>
          ) : null}
          {task.commentCount > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <MessageSquare className="size-3" />
              {task.commentCount}
            </span>
          ) : null}
          {task.attachmentCount > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <Paperclip className="size-3" />
              {task.attachmentCount}
            </span>
          ) : null}
          {task.figmaUrl ? (
            <ImageIcon className="size-3 text-status-review" />
          ) : null}
          {task.repoUrl ? (
            <GitBranch className="size-3 text-status-progress" />
          ) : null}
        </div>
        {assignees.length > 0 ? (
          <AvatarStack
            users={assignees.map((u) => ({
              name: u.fullName,
              avatarUrl: u.avatarUrl,
            }))}
            max={3}
            size="xs"
          />
        ) : null}
      </div>
    </motion.div>
  );

  if (isOverlay) return cardInner;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{cardInner}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>{task.code}</ContextMenuLabel>
        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span
              className={cn(
                "size-1.5 rounded-full",
                STATUS_META[task.status].dot,
              )}
            />
            Status
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {KANBAN_COLUMNS.map((s) => {
              const meta = STATUS_META[s];
              return (
                <ContextMenuItem
                  key={s}
                  onSelect={() => handleStatus(s)}
                  className={cn(
                    s === task.status && "bg-primary/5 font-medium",
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", meta.dot)} />
                  {meta.label}
                </ContextMenuItem>
              );
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span
              className={cn(
                "size-1.5 rounded-full",
                PRIORITY_META[task.priority].dot,
              )}
            />
            Priority
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {(["low", "medium", "high", "urgent"] as TaskPriority[]).map(
              (p) => {
                const meta = PRIORITY_META[p];
                return (
                  <ContextMenuItem
                    key={p}
                    onSelect={() => handlePriority(p)}
                    className={cn(
                      p === task.priority && "bg-primary/5 font-medium",
                    )}
                  >
                    <span
                      className={cn("size-1.5 rounded-full", meta.dot)}
                    />
                    {meta.label}
                  </ContextMenuItem>
                );
              },
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <UserPlus className="text-muted-foreground" />
            Assignees
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="max-h-72 overflow-y-auto">
            {users.map((u) => {
              const isAssigned = task.assigneeIds.includes(u.id);
              return (
                <ContextMenuItem
                  key={u.id}
                  onSelect={() => handleAssignSelf(u.id)}
                  className={cn(
                    isAssigned && "bg-primary/5 font-medium",
                  )}
                >
                  <span className="grid size-4 place-items-center rounded-full bg-muted text-[9px] font-semibold">
                    {u.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  {u.fullName}
                  {isAssigned ? (
                    <span className="ml-auto text-[10px] text-primary">●</span>
                  ) : null}
                </ContextMenuItem>
              );
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={() => onOpen(task.id)}>
          <MessageSquare className="text-muted-foreground" />
          Open detail
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleDuplicate}>
          <Copy className="text-muted-foreground" />
          Duplicate
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onSelect={handleDelete}
          className="text-status-blocked focus:bg-status-blocked/10 focus:text-status-blocked"
        >
          <Trash2 />
          Delete task
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
