"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  CheckSquare,
  Clock,
  ExternalLink,
  GitBranch,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  Send,
  Tag,
  Timer,
  User as UserIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Activity as ActivityIcon } from "lucide-react";
import { StatusPill } from "@/components/pills/StatusPill";
import { PriorityPill } from "@/components/pills/PriorityPill";
import { UserAvatar } from "@/components/UserAvatar";
import { AssigneePicker } from "@/components/views/AssigneePicker";
import { DueDatePicker } from "@/components/views/DueDatePicker";
import { SubtaskList } from "@/components/views/SubtaskList";
import { DependencyPicker } from "@/components/views/DependencyPicker";
import { SlaChip } from "@/components/views/SlaChip";
import { FigmaFrameLink } from "@/components/integrations/FigmaFrameLink";
import { useStore, useCurrentUser } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import {
  KANBAN_COLUMNS,
  STATUS_META,
  type TaskStatus,
} from "@/lib/design/tokens";
import { toast } from "sonner";

interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
  /** When set, j/k cycle within this task list. Falls back to project tasks. */
  navTaskIds?: string[];
  /** Called when j/k navigates to a sibling task. */
  onNavigate?: (nextTaskId: string) => void;
}

export function TaskDetailDrawer({
  taskId,
  onClose,
  navTaskIds,
  onNavigate,
}: TaskDetailDrawerProps) {
  const allTasks = useStore((s) => s.tasks);
  const allProjects = useStore((s) => s.projects);
  const allComments = useStore((s) => s.comments);
  const allTimeEntries = useStore((s) => s.timeEntries);
  const updateTask = useStore((s) => s.updateTask);
  const users = useStore((s) => s.users);
  const addComment = useStore((s) => s.addComment);
  const addTimeEntry = useStore((s) => s.addTimeEntry);

  const task = taskId ? allTasks.find((t) => t.id === taskId) : undefined;
  const project = task
    ? allProjects.find((p) => p.id === task.projectId)
    : undefined;
  const comments = taskId
    ? allComments.filter((c) => c.taskId === taskId)
    : [];
  const timeEntries = taskId
    ? allTimeEntries.filter((e) => e.taskId === taskId)
    : [];
  const currentUser = useCurrentUser();
  const [comment, setComment] = useState("");
  const [timerActive, setTimerActive] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);

  // Sync editable title with selected task
  useEffect(() => {
    setTitleDraft(task?.title ?? "");
    setEditingTitle(false);
  }, [task?.id, task?.title]);

  // Keyboard nav: j/k to cycle through siblings, e to edit title
  useEffect(() => {
    if (!task) return;
    const onKey = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if ((e.key === "j" || e.key === "k") && onNavigate) {
        const list =
          navTaskIds && navTaskIds.length > 0
            ? navTaskIds
            : allTasks
                .filter((t) => t.projectId === task.projectId)
                .map((t) => t.id);
        const idx = list.indexOf(task.id);
        if (idx === -1) return;
        const next =
          e.key === "j"
            ? list[(idx + 1) % list.length]
            : list[(idx - 1 + list.length) % list.length];
        if (next) {
          e.preventDefault();
          onNavigate(next);
        }
      } else if (e.key === "e") {
        e.preventDefault();
        setEditingTitle(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [task, allTasks, navTaskIds, onNavigate]);

  const commitTitle = () => {
    if (!task) return;
    const next = titleDraft.trim();
    if (next && next !== task.title) {
      updateTask(task.id, { title: next });
      toast.success("Title updated");
    } else {
      setTitleDraft(task.title);
    }
    setEditingTitle(false);
  };

  const open = Boolean(task);

  const assignees = task
    ? (task.assigneeIds
        .map((id) => users.find((u) => u.id === id))
        .filter(Boolean) as typeof users)
    : [];

  const totalLogged = timeEntries.reduce((s, e) => s + e.durationMinutes, 0);

  const handlePostComment = () => {
    if (!task || !comment.trim()) return;
    addComment(task.id, comment.trim());
    setComment("");
    toast.success("Comment posted");
  };

  const handleTimer = () => {
    if (!task) return;
    if (!timerActive) {
      setTimerActive(true);
      setTimerStartedAt(Date.now());
      toast.info("Timer started");
    } else {
      const elapsed = Math.max(
        1,
        Math.floor((Date.now() - (timerStartedAt ?? Date.now())) / 60000),
      );
      addTimeEntry({
        taskId: task.id,
        userId: currentUser.id,
        date: new Date().toISOString().slice(0, 10),
        durationMinutes: elapsed,
        description: "Timer entry",
        billable: true,
      });
      updateTask(task.id, { actualHours: task.actualHours + elapsed / 60 });
      setTimerActive(false);
      setTimerStartedAt(null);
      toast.success(`Logged ${elapsed} minutes`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex max-w-2xl flex-col p-0">
        {task && project ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{task.code}</span>
                <span>·</span>
                <span>{project.name}</span>
              </div>
              <SheetTitle className="mt-1 text-xl">
                {editingTitle ? (
                  <Input
                    autoFocus
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={commitTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitTitle();
                      }
                      if (e.key === "Escape") {
                        setTitleDraft(task.title);
                        setEditingTitle(false);
                      }
                    }}
                    className="h-9 text-xl font-semibold"
                  />
                ) : (
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="block w-full rounded-md px-1 -mx-1 text-left transition-colors hover:bg-accent"
                  >
                    {task.title}
                  </button>
                )}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Task details and discussion
              </SheetDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill status={task.status} />
                <PriorityPill priority={task.priority} />
                <SlaChip taskId={task.id} />
                {task.taskType ? (
                  <span className="rounded-pill bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {task.taskType}
                  </span>
                ) : null}
                {task.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-pill bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="grid gap-6 p-6 lg:grid-cols-[1fr_220px]">
                <div className="min-w-0">
                  <Tabs defaultValue="details" className="space-y-0">
                    <TabsList>
                      <TabsTrigger value="details">
                        Details
                      </TabsTrigger>
                      <TabsTrigger value="comments">
                        <MessageSquare className="size-3.5" />
                        Comments
                        {comments.length > 0 ? (
                          <span className="ml-1 rounded-pill bg-muted px-1.5 py-0 text-[10px] font-mono">
                            {comments.length}
                          </span>
                        ) : null}
                      </TabsTrigger>
                      <TabsTrigger value="activity">
                        <ActivityIcon className="size-3.5" /> Activity
                      </TabsTrigger>
                      <TabsTrigger value="time">
                        <Clock className="size-3.5" /> Time
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-6">
                  {task.description ? (
                    <section>
                      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Description
                      </h3>
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {task.description}
                      </p>
                    </section>
                  ) : null}

                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <CheckSquare className="size-3" /> Subtasks
                    </h3>
                    <SubtaskList taskId={task.id} />
                  </section>

                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Link2 className="size-3" /> Dependencies
                    </h3>
                    <DependencyPicker taskId={task.id} />
                  </section>

                  {task.repoUrl ? (
                    <section>
                      <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <GitBranch className="size-3" /> Pull request
                      </h3>
                      <div className="overflow-hidden rounded-lg border bg-card">
                        <div className="flex items-start gap-3 p-4">
                          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-status-progress/15 text-status-progress">
                            <GitBranch className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                              {task.repoUrl
                                .replace(/^https?:\/\/(www\.)?/, "")
                                .replace(/\/$/, "")}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1 rounded-pill bg-status-done/15 px-1.5 py-0.5 font-medium text-status-done">
                                <span className="size-1.5 rounded-full bg-status-done" />
                                Open
                              </span>
                              <span>
                                feat/branch →{" "}
                                <span className="font-mono">main</span>
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                              <span>
                                <span className="font-mono text-status-done">
                                  +247
                                </span>{" "}
                                <span className="font-mono text-status-blocked">
                                  −82
                                </span>
                              </span>
                              <span>14 files changed</span>
                              <span>2 reviewers</span>
                            </div>
                          </div>
                          <a
                            href={task.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-pill bg-status-progress/10 px-2.5 py-1 text-[11px] font-medium text-status-progress hover:bg-status-progress/20"
                          >
                            View <ExternalLink className="size-3" />
                          </a>
                        </div>
                        <div className="flex items-center justify-between border-t bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-block size-1.5 rounded-full bg-status-done" />
                            CI passing · 12/12 checks
                          </span>
                          <span className="font-mono">a8f3c21 · 4h ago</span>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  <section>
                    <FigmaFrameLink task={task} />
                  </section>

                    </TabsContent>

                    <TabsContent value="time" className="space-y-4">
                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Clock className="size-3" /> Time tracking
                    </h3>
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Logged
                          </p>
                          <p className="font-mono text-lg">
                            {(totalLogged / 60).toFixed(1)}h
                            <span className="text-sm text-muted-foreground">
                              {" "}
                              / {task.estimatedHours ?? "—"}h
                            </span>
                          </p>
                        </div>
                        <Button
                          variant={timerActive ? "destructive" : "default"}
                          size="sm"
                          onClick={handleTimer}
                        >
                          <Timer className="size-4" />
                          {timerActive ? "Stop timer" : "Start timer"}
                        </Button>
                      </div>
                      {timeEntries.length > 0 ? (
                        <ul className="mt-4 space-y-2 text-sm">
                          {timeEntries.slice(0, 4).map((e) => {
                            const user = users.find((u) => u.id === e.userId);
                            return (
                              <li
                                key={e.id}
                                className="flex items-center justify-between gap-3 border-t pt-2 first:border-t-0 first:pt-0"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {user ? (
                                    <UserAvatar
                                      user={{
                                        name: user.fullName,
                                        avatarUrl: user.avatarUrl,
                                      }}
                                      size="xs"
                                    />
                                  ) : null}
                                  <span className="truncate text-xs">
                                    {e.description}
                                  </span>
                                </div>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {(e.durationMinutes / 60).toFixed(1)}h
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  </section>

                    </TabsContent>

                    <TabsContent value="comments">
                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <MessageSquare className="size-3" /> Discussion
                    </h3>
                    <div className="space-y-3">
                      {comments.length === 0 ? (
                        <p className="rounded-md border border-dashed bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
                          Be the first to comment.
                        </p>
                      ) : null}
                      {comments.map((c) => {
                        const author = users.find((u) => u.id === c.authorId);
                        return (
                          <div
                            key={c.id}
                            className="flex gap-3 rounded-md border bg-card p-3"
                          >
                            {author ? (
                              <UserAvatar
                                user={{
                                  name: author.fullName,
                                  avatarUrl: author.avatarUrl,
                                }}
                                size="sm"
                              />
                            ) : null}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-sm font-medium">
                                  {author?.fullName ?? "Someone"}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {format(parseISO(c.createdAt), "MMM d, h:mm a")}
                                </span>
                              </div>
                              <p className="mt-1 text-sm leading-relaxed">
                                {c.body}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Input
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handlePostComment();
                          }
                        }}
                        placeholder="Write a comment…"
                      />
                      <Button onClick={handlePostComment} disabled={!comment.trim()}>
                        <Send className="size-4" />
                      </Button>
                    </div>
                  </section>
                    </TabsContent>

                    <TabsContent value="activity">
                      <ol className="relative space-y-3 pl-6 before:absolute before:left-[10px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                        {[
                          {
                            who: "Avery Chen",
                            what: "created the task",
                            when: task.createdAt,
                            icon: ActivityIcon,
                            cls: "bg-muted text-muted-foreground",
                          },
                          ...(task.assigneeIds.length > 0
                            ? [
                                {
                                  who:
                                    users.find(
                                      (u) => u.id === task.assigneeIds[0],
                                    )?.fullName ?? "Someone",
                                  what: "was assigned",
                                  when: task.createdAt,
                                  icon: UserIcon,
                                  cls: "bg-status-progress/15 text-status-progress",
                                },
                              ]
                            : []),
                          ...(task.status !== "todo"
                            ? [
                                {
                                  who:
                                    users.find(
                                      (u) => u.id === task.assigneeIds[0],
                                    )?.fullName ?? "Someone",
                                  what: `moved to ${task.status.replace("_", " ")}`,
                                  when: task.updatedAt,
                                  icon: ActivityIcon,
                                  cls: "bg-status-review/15 text-status-review",
                                },
                              ]
                            : []),
                          ...(task.subtasksDone > 0
                            ? [
                                {
                                  who: "Team",
                                  what: `completed ${task.subtasksDone} subtask${task.subtasksDone === 1 ? "" : "s"}`,
                                  when: task.updatedAt,
                                  icon: CheckSquare,
                                  cls: "bg-status-done/15 text-status-done",
                                },
                              ]
                            : []),
                          ...timeEntries.slice(-3).map((e) => ({
                            who:
                              users.find((u) => u.id === e.userId)?.fullName ??
                              "Someone",
                            what: `logged ${(e.durationMinutes / 60).toFixed(1)}h`,
                            when: `${e.date}T09:00:00Z`,
                            icon: Clock,
                            cls: "bg-status-revisions/15 text-status-revisions",
                          })),
                        ].map((ev, i) => (
                          <li key={i} className="relative">
                            <span
                              className={cn(
                                "absolute -left-6 grid size-5 place-items-center rounded-full ring-4 ring-background",
                                ev.cls,
                              )}
                            >
                              <ev.icon className="size-2.5" />
                            </span>
                            <p className="text-sm">
                              <span className="font-medium">{ev.who}</span>{" "}
                              <span className="text-muted-foreground">
                                {ev.what}
                              </span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(parseISO(ev.when), "MMM d, h:mm a")}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </TabsContent>
                  </Tabs>
                </div>

                <aside className="space-y-5 rounded-lg border bg-card/50 p-4">
                  <section>
                    <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {KANBAN_COLUMNS.map((s) => (
                        <button
                          key={s}
                          onClick={() => updateTask(task.id, { status: s })}
                          className={cn(
                            "rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors",
                            task.status === s
                              ? "border-primary/40 bg-primary/5"
                              : "hover:bg-accent",
                          )}
                        >
                          <span
                            className={cn(
                              "mr-1.5 inline-block size-1.5 rounded-full align-middle",
                              STATUS_META[s].dot,
                            )}
                          />
                          {STATUS_META[s].label}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      <UserIcon className="size-3" /> Assignees
                    </h4>
                    <AssigneePicker
                      taskId={task.id}
                      assigneeIds={task.assigneeIds}
                      onChange={(next) => {
                        updateTask(task.id, { assigneeIds: next });
                        toast.success(
                          next.length > task.assigneeIds.length
                            ? "Assignee added"
                            : "Assignee updated",
                        );
                      }}
                    />
                  </section>

                  <section>
                    <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      <Calendar className="size-3" /> Due date
                    </h4>
                    <DueDatePicker
                      value={task.dueDate}
                      onChange={(next) => {
                        updateTask(task.id, { dueDate: next });
                        toast.success(
                          next ? "Due date set" : "Due date cleared",
                        );
                      }}
                    />
                  </section>

                  {(task.figmaUrl || task.repoUrl) && (
                    <section>
                      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        <Tag className="size-3" /> Links
                      </h4>
                      <div className="space-y-1">
                        {task.figmaUrl ? (
                          <a
                            href={task.figmaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                          >
                            <ImageIcon className="size-3" />
                            Figma file <ExternalLink className="size-3" />
                          </a>
                        ) : null}
                        {task.repoUrl ? (
                          <a
                            href={task.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                          >
                            <GitBranch className="size-3" />
                            Pull request <ExternalLink className="size-3" />
                          </a>
                        ) : null}
                      </div>
                    </section>
                  )}
                </aside>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
