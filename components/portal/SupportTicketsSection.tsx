"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  LifeBuoy,
  Plus,
  ChevronRight,
  ChevronDown,
  Send,
  CheckCircle2,
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
import { useStore } from "@/lib/db/store";
import { toast } from "sonner";
import type { SupportTicketStatus } from "@/types/domain";

interface Props {
  clientId: string;
}

const STATUS_META: Record<SupportTicketStatus, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-muted text-muted-foreground" },
  in_progress: { label: "In progress", cls: "bg-status-progress/15 text-status-progress" },
  waiting_on_client: { label: "Awaiting you", cls: "bg-status-revisions/15 text-status-revisions" },
  resolved: { label: "Resolved", cls: "bg-status-done/15 text-status-done" },
  closed: { label: "Closed", cls: "bg-muted text-muted-foreground" },
};

const PRIORITY_META = {
  low: { label: "Low", cls: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", cls: "bg-muted text-muted-foreground" },
  high: { label: "High", cls: "bg-status-revisions/15 text-status-revisions" },
  urgent: { label: "Urgent", cls: "bg-status-blocked/15 text-status-blocked" },
} as const;

/**
 * Client-portal support tickets section (PRD §5.5.1). Clients submit
 * post-launch issues + see status, threaded responses, and converted
 * follow-up tasks.
 */
export function SupportTicketsSection({ clientId }: Props) {
  const tickets = useStore((s) => s.supportTickets);
  const addTicket = useStore((s) => s.addSupportTicket);
  const addResponse = useStore((s) => s.addTicketResponse);

  const clientTickets = useMemo(
    () =>
      tickets
        .filter((t) => t.clientId === clientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [tickets, clientId],
  );

  const [opening, setOpening] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    subject: "",
    body: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    submittedByEmail: "",
  });
  const [responseDraft, setResponseDraft] = useState<Record<string, string>>(
    {},
  );

  function submitTicket() {
    if (!draft.subject.trim() || !draft.body.trim()) {
      toast.error("Subject + body are required");
      return;
    }
    addTicket({
      clientId,
      subject: draft.subject.trim(),
      body: draft.body.trim(),
      priority: draft.priority,
      submittedByEmail: draft.submittedByEmail.trim() || undefined,
    });
    toast.success("Ticket submitted — the team will respond shortly");
    setDraft({ subject: "", body: "", priority: "medium", submittedByEmail: "" });
    setOpening(false);
  }

  function postResponse(ticketId: string) {
    const body = responseDraft[ticketId]?.trim();
    if (!body) return;
    addResponse(ticketId, body, undefined, draft.submittedByEmail || undefined);
    setResponseDraft((d) => ({ ...d, [ticketId]: "" }));
    toast.success("Reply posted");
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <LifeBuoy className="size-4" /> Support tickets
        </h3>
        <Button size="sm" onClick={() => setOpening(true)}>
          <Plus className="size-3.5" /> Open ticket
        </Button>
      </div>

      {clientTickets.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          No tickets yet. Click "Open ticket" if you need post-launch help.
        </p>
      ) : (
        <ul className="divide-y">
          <AnimatePresence initial={false}>
            {clientTickets.map((tic) => {
              const isOpen = expanded === tic.id;
              const meta = STATUS_META[tic.status];
              const pri = PRIORITY_META[tic.priority];
              return (
                <motion.li key={tic.id} layout>
                  <button
                    onClick={() => setExpanded(isOpen ? null : tic.id)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-accent/30"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{tic.subject}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(parseISO(tic.createdAt), "MMM d, yyyy")} ·{" "}
                        {tic.responses.length} repl
                        {tic.responses.length === 1 ? "y" : "ies"}
                      </p>
                    </div>
                    <span
                      className={`rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${pri.cls}`}
                    >
                      {pri.label}
                    </span>
                    <span
                      className={`rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
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
                          <div className="rounded-md border bg-background p-3">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              Original request
                            </p>
                            <p className="mt-1 text-xs leading-relaxed whitespace-pre-wrap">
                              {tic.body}
                            </p>
                            {tic.submittedByEmail && (
                              <p className="mt-2 text-[10px] text-muted-foreground">
                                from {tic.submittedByEmail}
                              </p>
                            )}
                          </div>
                          {tic.responses.length > 0 && (
                            <ul className="space-y-2">
                              {tic.responses.map((r) => (
                                <li
                                  key={r.id}
                                  className="rounded-md border bg-background p-2.5 text-xs"
                                >
                                  <p className="text-[10px] text-muted-foreground">
                                    {r.authorEmail ??
                                      (r.authorId ? "Atelier team" : "Unknown")}{" "}
                                    · {format(parseISO(r.createdAt), "MMM d, h:mm a")}
                                  </p>
                                  <p className="mt-1 leading-relaxed whitespace-pre-wrap">
                                    {r.body}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )}
                          {tic.taskId && (
                            <p className="inline-flex items-center gap-1 rounded-pill bg-status-done/15 px-2 py-0.5 text-[10px] font-medium text-status-done">
                              <CheckCircle2 className="size-2.5" />
                              Linked to task — team is working on it
                            </p>
                          )}
                          {tic.status !== "closed" && tic.status !== "resolved" && (
                            <div className="flex gap-1.5">
                              <Input
                                value={responseDraft[tic.id] ?? ""}
                                onChange={(e) =>
                                  setResponseDraft((d) => ({
                                    ...d,
                                    [tic.id]: e.target.value,
                                  }))
                                }
                                placeholder="Reply to the team…"
                                className="text-xs"
                              />
                              <Button
                                size="sm"
                                onClick={() => postResponse(tic.id)}
                                disabled={!responseDraft[tic.id]?.trim()}
                              >
                                <Send className="size-3.5" />
                              </Button>
                            </div>
                          )}
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

      <Dialog open={opening} onOpenChange={setOpening}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Open a support ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Subject</Label>
              <Input
                value={draft.subject}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, subject: e.target.value }))
                }
                placeholder="What's the issue?"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Details</Label>
              <textarea
                value={draft.body}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, body: e.target.value }))
                }
                rows={5}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Steps to reproduce, screenshots, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Priority</Label>
                <select
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      priority: e.target.value as typeof draft.priority,
                    }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Your email</Label>
                <Input
                  type="email"
                  value={draft.submittedByEmail}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, submittedByEmail: e.target.value }))
                  }
                  placeholder="you@company.com"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpening(false)}>
              Cancel
            </Button>
            <Button onClick={submitTicket}>Submit ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
