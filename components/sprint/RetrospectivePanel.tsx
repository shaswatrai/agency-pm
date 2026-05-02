"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ThumbsUp,
  ThumbsDown,
  Target,
  Plus,
  CheckSquare,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStore, useCurrentUser } from "@/lib/db/store";
import { toast } from "sonner";
import type { RetroNote } from "@/types/domain";

interface Props {
  projectId: string;
}

const CATEGORIES: { id: RetroNote["category"]; label: string; icon: typeof ThumbsUp; cls: string }[] = [
  {
    id: "went_well",
    label: "What went well",
    icon: ThumbsUp,
    cls: "border-status-done/30 bg-status-done/5",
  },
  {
    id: "didnt_go_well",
    label: "What didn't go well",
    icon: ThumbsDown,
    cls: "border-status-blocked/30 bg-status-blocked/5",
  },
  {
    id: "action_item",
    label: "Action items",
    icon: Target,
    cls: "border-primary/30 bg-primary/5",
  },
];

/**
 * Sprint retrospective per PRD §5.13. Three-column board (went_well /
 * didnt_go_well / action_items) tied to a sprint window. Action items
 * convert to real tasks with one click and stay linked back.
 */
export function RetrospectivePanel({ projectId }: Props) {
  const me = useCurrentUser();
  const retros = useStore((s) => s.sprintRetros);
  const addRetro = useStore((s) => s.addSprintRetro);
  const addNote = useStore((s) => s.addRetroNote);
  const removeNote = useStore((s) => s.removeRetroNote);
  const convertAction = useStore((s) => s.convertRetroActionToTask);

  const projectRetros = useMemo(
    () =>
      retros
        .filter((r) => r.projectId === projectId)
        .sort((a, b) => b.endDate.localeCompare(a.endDate)),
    [retros, projectId],
  );

  const [activeRetroId, setActiveRetroId] = useState<string | null>(
    projectRetros[0]?.id ?? null,
  );
  const active = projectRetros.find((r) => r.id === activeRetroId);

  const [drafts, setDrafts] = useState<Record<RetroNote["category"], string>>({
    went_well: "",
    didnt_go_well: "",
    action_item: "",
  });

  function startNewRetro() {
    const today = new Date();
    const start = new Date(today.getTime() - 14 * 86_400_000);
    const sprintNum = projectRetros.length + 1;
    const retro = addRetro({
      projectId,
      sprintLabel: `Sprint ${sprintNum}`,
      startDate: start.toISOString().slice(0, 10),
      endDate: today.toISOString().slice(0, 10),
      createdBy: me.id,
    });
    setActiveRetroId(retro.id);
    toast.success(`${retro.sprintLabel} retro started`);
  }

  function postNote(category: RetroNote["category"]) {
    if (!active) return;
    const body = drafts[category].trim();
    if (!body) return;
    addNote(active.id, { category, body, authorId: me.id });
    setDrafts((d) => ({ ...d, [category]: "" }));
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold">Sprint retrospective</h3>
          <p className="text-[11px] text-muted-foreground">
            What went well, what to fix, what to do about it
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projectRetros.length > 1 && (
            <select
              value={activeRetroId ?? ""}
              onChange={(e) => setActiveRetroId(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs"
            >
              {projectRetros.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.sprintLabel}
                </option>
              ))}
            </select>
          )}
          <Button size="sm" variant="outline" onClick={startNewRetro}>
            <Plus className="size-3.5" /> New retro
          </Button>
        </div>
      </div>

      {!active ? (
        <div className="grid place-items-center px-5 py-10 text-center">
          <Target className="mb-2 size-7 text-muted-foreground" />
          <p className="text-sm font-medium">No retros yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Start one at the end of each sprint.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 p-4 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const notes = active.notes.filter((n) => n.category === cat.id);
            return (
              <div
                key={cat.id}
                className={`flex flex-col gap-2 rounded-md border p-3 ${cat.cls}`}
              >
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                  <Icon className="size-3.5" />
                  {cat.label}
                  <span className="ml-auto rounded-pill bg-background px-1.5 py-0.5 text-[10px]">
                    {notes.length}
                  </span>
                </div>
                <ul className="space-y-1.5 min-h-[40px]">
                  {notes.map((n) => (
                    <motion.li
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex items-start gap-1.5 rounded-md bg-background px-2 py-1.5 text-xs"
                    >
                      <span className="flex-1">{n.body}</span>
                      {cat.id === "action_item" && !n.taskId && (
                        <button
                          onClick={() => {
                            const id = convertAction(active.id, n.id);
                            if (id) toast.success("Converted to task");
                          }}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          title="Convert to task"
                        >
                          <ArrowRight className="size-3 text-primary" />
                        </button>
                      )}
                      {n.taskId && (
                        <span className="rounded-pill bg-status-done/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-status-done">
                          <CheckSquare className="mr-0.5 inline size-2.5" />
                          Task
                        </span>
                      )}
                      <button
                        onClick={() => removeNote(active.id, n.id)}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        title="Remove"
                      >
                        <Trash2 className="size-3 text-muted-foreground" />
                      </button>
                    </motion.li>
                  ))}
                </ul>
                <div className="flex gap-1.5">
                  <Input
                    value={drafts[cat.id]}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [cat.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        postNote(cat.id);
                      }
                    }}
                    placeholder="Add a note…"
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => postNote(cat.id)}
                    disabled={!drafts[cat.id].trim()}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
