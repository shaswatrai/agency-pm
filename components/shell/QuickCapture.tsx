"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  STATUS_META,
  PRIORITY_META,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/design/tokens";

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const projects = useStore((s) => s.projects);
  const orgSlug = useStore((s) => s.organization.slug);
  const addTask = useStore((s) => s.addTask);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // `c` to create (Linear-style). ⌘N is reserved by Chrome.
      // Custom event lets us trigger from the topbar button too.
      const isCreateShortcut =
        (e.key === "c" || e.key === "C") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey;
      if (e.type === "atelier:open-quick-capture" || isCreateShortcut) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("atelier:open-quick-capture", onKey as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(
        "atelier:open-quick-capture",
        onKey as EventListener,
      );
    };
  }, []);

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatus("todo");
    setPriority("medium");
  };

  const handleCreate = (openDetail = false) => {
    if (!title.trim()) {
      toast.error("Give the task a title");
      return;
    }
    if (!projectId) {
      toast.error("Pick a project");
      return;
    }
    const task = addTask({
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      assigneeIds: [],
      clientVisible: false,
      tags: [],
      actualHours: 0,
      commentCount: 0,
      attachmentCount: 0,
      subtaskCount: 0,
      subtasksDone: 0,
    });
    toast.success("Task captured", { description: task.code });
    reset();
    setOpen(false);
    if (openDetail) {
      router.push(`/${orgSlug}/projects/${projectId}/kanban?task=${task.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogHeader className="border-b bg-gradient-to-br from-primary/5 to-transparent px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            Quick capture
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleCreate(false);
                }
              }}
              placeholder="What needs to happen?"
              className="h-11 text-base font-medium"
            />
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more detail (optional)…"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Project
              </Label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Priority
              </Label>
              <div className="mt-1.5 flex gap-1">
                {(["low", "medium", "high", "urgent"] as TaskPriority[]).map(
                  (p) => {
                    const meta = PRIORITY_META[p];
                    return (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
                          priority === p
                            ? "border-primary/40 bg-primary/5"
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
          </div>

          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Initial status
            </Label>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(["todo", "in_progress", "in_review", "done"] as TaskStatus[]).map(
                (s) => {
                  const meta = STATUS_META[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-medium transition-all",
                        status === s
                          ? "border-primary/40 bg-primary/5"
                          : "hover:bg-accent",
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", meta.dot)} />
                      {meta.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-6 py-3">
          <p className="text-[11px] text-muted-foreground">
            Open anywhere with{" "}
            <kbd className="rounded bg-background px-1 py-0.5 font-mono">C</kbd>{" "}
            ·{" "}
            <kbd className="rounded bg-background px-1 py-0.5 font-mono">
              ⌘ Enter
            </kbd>{" "}
            to save
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleCreate(false)}>
              Capture
            </Button>
            <Button size="sm" onClick={() => handleCreate(true)}>
              Capture & open <ArrowRight className="size-3" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
