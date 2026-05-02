"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Mic,
  Plus,
  Calendar,
  Trash2,
  CheckSquare,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore, useCurrentUser } from "@/lib/db/store";
import { toast } from "sonner";

interface Props {
  projectId: string;
}

/**
 * Project meeting notes (PRD §5.9). Capture meeting summaries with
 * action items that one-click convert to project tasks (auto-assigned
 * + due-dated when set on the action).
 */
export function MeetingNotesPanel({ projectId }: Props) {
  const me = useCurrentUser();
  const notes = useStore((s) => s.meetingNotes);
  const users = useStore((s) => s.users);
  const addNote = useStore((s) => s.addMeetingNote);
  const removeNote = useStore((s) => s.removeMeetingNote);
  const addItem = useStore((s) => s.addMeetingActionItem);
  const convert = useStore((s) => s.convertMeetingActionToTask);

  const projectNotes = useMemo(
    () =>
      notes
        .filter((n) => n.projectId === projectId)
        .sort((a, b) => b.meetingAt.localeCompare(a.meetingAt)),
    [notes, projectId],
  );

  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    meetingAt: new Date().toISOString().slice(0, 16),
    notes: "",
    agenda: "",
  });
  const [actionDrafts, setActionDrafts] = useState<Record<string, string>>({});

  function submit() {
    if (!draft.title.trim()) {
      toast.error("Title the meeting");
      return;
    }
    addNote({
      projectId,
      title: draft.title.trim(),
      meetingAt: new Date(draft.meetingAt).toISOString(),
      attendees: [me.id],
      agenda: draft.agenda.trim() || undefined,
      notes: draft.notes,
      createdBy: me.id,
    });
    toast.success("Meeting note saved");
    setDraft({
      title: "",
      meetingAt: new Date().toISOString().slice(0, 16),
      notes: "",
      agenda: "",
    });
    setCreating(false);
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Mic className="size-4 text-primary" /> Meeting notes
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Capture summaries · convert action items to tasks
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-3.5" /> New note
        </Button>
      </div>

      {projectNotes.length === 0 ? (
        <div className="grid place-items-center px-5 py-10 text-center">
          <Mic className="mb-2 size-7 text-muted-foreground" />
          <p className="text-sm font-medium">No meeting notes yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Start one after your next stand-up or client call.
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          <AnimatePresence initial={false}>
            {projectNotes.map((note) => {
              const isOpen = expanded === note.id;
              return (
                <motion.li key={note.id} layout>
                  <button
                    onClick={() => setExpanded(isOpen ? null : note.id)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-accent/30"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{note.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        <Calendar className="mr-1 inline size-3" />
                        {format(parseISO(note.meetingAt), "MMM d, yyyy · h:mm a")}{" "}
                        · {note.attendees.length} attendee
                        {note.attendees.length === 1 ? "" : "s"}
                        {note.actionItems.length > 0 && (
                          <span> · {note.actionItems.length} action items</span>
                        )}
                      </p>
                    </div>
                    <Trash2
                      className="size-3.5 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNote(note.id);
                        toast.success("Note removed");
                      }}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t bg-muted/20"
                      >
                        <div className="space-y-3 px-5 py-3">
                          {note.agenda && (
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                Agenda
                              </p>
                              <p className="mt-1 text-xs whitespace-pre-wrap">
                                {note.agenda}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              Notes
                            </p>
                            <p className="mt-1 text-xs whitespace-pre-wrap">
                              {note.notes || "(no notes captured)"}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              Action items
                            </p>
                            {note.actionItems.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground">
                                No action items.
                              </p>
                            ) : (
                              <ul className="space-y-1">
                                {note.actionItems.map((item) => (
                                  <li
                                    key={item.id}
                                    className="group flex items-center gap-2 rounded-md bg-background px-2 py-1.5 text-xs"
                                  >
                                    <CheckSquare
                                      className={`size-3.5 ${
                                        item.taskId
                                          ? "text-status-done"
                                          : "text-muted-foreground"
                                      }`}
                                    />
                                    <span className="flex-1">{item.body}</span>
                                    {item.assigneeId && (
                                      <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[9px]">
                                        {users.find((u) => u.id === item.assigneeId)?.fullName ?? "?"}
                                      </span>
                                    )}
                                    {!item.taskId ? (
                                      <button
                                        onClick={() => {
                                          const id = convert(note.id, item.id);
                                          if (id) toast.success("Action → task created");
                                          else toast.error("Couldn't convert (no project linked)");
                                        }}
                                        className="opacity-0 transition-opacity group-hover:opacity-100"
                                        title="Convert to task"
                                      >
                                        <ArrowRight className="size-3 text-primary" />
                                      </button>
                                    ) : (
                                      <span className="rounded-pill bg-status-done/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-status-done">
                                        Task
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="mt-1.5 flex gap-1.5">
                              <Input
                                value={actionDrafts[note.id] ?? ""}
                                onChange={(e) =>
                                  setActionDrafts((d) => ({
                                    ...d,
                                    [note.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const body = actionDrafts[note.id]?.trim();
                                    if (!body) return;
                                    addItem(note.id, { body });
                                    setActionDrafts((d) => ({ ...d, [note.id]: "" }));
                                  }
                                }}
                                placeholder="Add an action item…"
                                className="h-7 text-xs"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const body = actionDrafts[note.id]?.trim();
                                  if (!body) return;
                                  addItem(note.id, { body });
                                  setActionDrafts((d) => ({ ...d, [note.id]: "" }));
                                }}
                                disabled={!actionDrafts[note.id]?.trim()}
                              >
                                <Plus className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New meeting note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Weekly standup · Apr 30"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">When</Label>
              <Input
                type="datetime-local"
                value={draft.meetingAt}
                onChange={(e) => setDraft((d) => ({ ...d, meetingAt: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Agenda (optional)</Label>
              <textarea
                value={draft.agenda}
                onChange={(e) => setDraft((d) => ({ ...d, agenda: e.target.value }))}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                rows={5}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Decisions, discussion points, callouts…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Save note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
