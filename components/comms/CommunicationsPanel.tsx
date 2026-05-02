"use client";

import { useMemo, useState } from "react";
import {
  Mail,
  Inbox,
  Plus,
  Trash2,
  Copy,
  Power,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore, useCurrentUser } from "@/lib/db/store";
import { toast } from "sonner";
import type { DigestCadence } from "@/types/domain";

const CADENCE_OPTIONS: { id: DigestCadence; label: string }[] = [
  { id: "instant", label: "Instant" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "off", label: "Off" },
];

const EVENT_LABELS: Record<
  "assignments" | "mentions" | "deadlines" | "statusChanges" | "approvalsNeeded",
  string
> = {
  assignments: "Task assignments",
  mentions: "@mentions",
  deadlines: "Approaching deadlines",
  statusChanges: "Status changes on my tasks",
  approvalsNeeded: "Approvals waiting on me",
};

const DOWS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Combined Communications panel (PRD §5.5.3 + §5.9):
 *   1. Email digest preferences for the current user — per-event
 *      cadence + daily delivery hour + weekly day.
 *   2. Email-to-task mappings per project — generates a unique inbox
 *      address whose inbound mail becomes a task.
 */
export function CommunicationsPanel() {
  const me = useCurrentUser();
  const projects = useStore((s) => s.projects);
  const users = useStore((s) => s.users);
  const prefs = useStore((s) => s.emailDigestPrefs);
  const setPref = useStore((s) => s.setDigestPreference);
  const mappings = useStore((s) => s.emailToTaskMappings);
  const createMapping = useStore((s) => s.createEmailToTaskMapping);
  const toggleMapping = useStore((s) => s.toggleEmailToTaskMapping);
  const removeMapping = useStore((s) => s.removeEmailToTaskMapping);

  const myPref = useMemo(
    () => prefs.find((p) => p.userId === me.id),
    [prefs, me.id],
  );
  const events = myPref?.events ?? {
    assignments: "instant",
    mentions: "instant",
    deadlines: "daily",
    statusChanges: "daily",
    approvalsNeeded: "instant",
  };
  const dailyHour = myPref?.dailyDigestHour ?? 9;
  const weeklyDay = myPref?.weeklyDigestDay ?? 1;

  const [adding, setAdding] = useState(false);
  const [newMapping, setNewMapping] = useState({
    projectId: projects[0]?.id ?? "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    assigneeId: "",
  });

  function submitMapping() {
    if (!newMapping.projectId) {
      toast.error("Pick a project");
      return;
    }
    const m = createMapping({
      projectId: newMapping.projectId,
      defaults: {
        status: "todo",
        priority: newMapping.priority,
        assigneeId: newMapping.assigneeId || undefined,
        tags: ["email"],
      },
      allowlistedSenders: [],
      isActive: true,
    });
    toast.success(`Inbox created · ${m.inboxAddress}`);
    setAdding(false);
  }

  return (
    <div className="space-y-5">
      {/* Email digest */}
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Email digest preferences</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick cadence per event type. "Instant" sends an email per event;
          "Daily" / "Weekly" batch into a single digest.
        </p>

        <div className="mt-3 space-y-2">
          {(Object.keys(EVENT_LABELS) as (keyof typeof EVENT_LABELS)[]).map((key) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
            >
              <span className="text-sm">{EVENT_LABELS[key]}</span>
              <div className="flex gap-1">
                {CADENCE_OPTIONS.map((opt) => {
                  const active = events[key] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setPref(me.id, { [key]: opt.id })}
                      className={`rounded-pill px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Daily digest delivery time</Label>
            <select
              value={dailyHour}
              onChange={(e) =>
                setPref(me.id, { dailyDigestHour: Number(e.target.value) })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, "0")}:00 (your local time)
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Weekly digest day</Label>
            <select
              value={weeklyDay}
              onChange={(e) =>
                setPref(me.id, { weeklyDigestDay: Number(e.target.value) })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              {DOWS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Email-to-task */}
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Inbox className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Email-to-task</h3>
          </div>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" /> New inbox
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Forward an email to the inbox address — it becomes a task in the
          linked project. Subject → task title; body → description; attachments
          carry over.
        </p>

        {mappings.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
            No inbox mappings yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {mappings.map((m) => {
              const project = projects.find((p) => p.id === m.projectId);
              const assignee = users.find((u) => u.id === m.defaults.assigneeId);
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
                >
                  <Inbox className="size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs">{m.inboxAddress}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {project?.code ?? "?"} · {m.defaults.priority}
                      {assignee && ` · ${assignee.fullName}`}
                      {m.lastReceivedAt && (
                        <span> · last hit {m.lastReceivedAt.slice(0, 10)}</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(m.inboxAddress);
                      toast.success("Copied");
                    }}
                    className="rounded-md p-1 hover:bg-accent"
                    title="Copy inbox address"
                  >
                    <Copy className="size-3.5 text-muted-foreground" />
                  </button>
                  <Switch
                    checked={m.isActive}
                    onCheckedChange={() => toggleMapping(m.id)}
                  />
                  <button
                    onClick={() => {
                      removeMapping(m.id);
                      toast.success("Inbox removed");
                    }}
                    className="rounded-md p-1 hover:bg-accent"
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-3 rounded-md border bg-muted/30 p-3 text-[11px] text-muted-foreground">
          <p className="font-medium">Inbound API endpoint</p>
          <p className="mt-1">
            Set up your email provider (Postmark / SendGrid Inbound Parse) to
            POST to <code className="font-mono">/api/integrations/inbound-email</code>.
            Includes a sample handler for the standard Postmark JSON shape.
          </p>
        </div>
      </section>

      {/* New inbox dialog */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New email-to-task inbox</DialogTitle>
            <DialogDescription>
              Generates a unique inbox address that creates tasks in the
              linked project on every inbound message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Project</Label>
              <select
                value={newMapping.projectId}
                onChange={(e) =>
                  setNewMapping((m) => ({ ...m, projectId: e.target.value }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Default priority</Label>
                <select
                  value={newMapping.priority}
                  onChange={(e) =>
                    setNewMapping((m) => ({
                      ...m,
                      priority: e.target.value as typeof m.priority,
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
                <Label className="text-xs">Default assignee</Label>
                <select
                  value={newMapping.assigneeId}
                  onChange={(e) =>
                    setNewMapping((m) => ({ ...m, assigneeId: e.target.value }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  <option value="">— Triage queue —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button onClick={submitMapping}>Create inbox</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
