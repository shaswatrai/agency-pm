"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer,
  Plus,
  Trash2,
  Globe,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/db/store";
import { DEFAULT_TIERS } from "@/lib/automation/sla";
import { cn } from "@/lib/utils";
import type {
  SlaHoursKind,
  SlaPolicy,
  SlaTier,
} from "@/types/domain";
import type { TaskPriority } from "@/lib/design/tokens";

const PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];

function formatHours(h: number): string {
  if (h < 24) return `${h}h`;
  const d = h / 24;
  return d % 1 === 0 ? `${d}d` : `${d.toFixed(1)}d`;
}

export function SlaPoliciesPanel() {
  const policies = useStore((s) => s.slaPolicies);
  const clients = useStore((s) => s.clients);
  const users = useStore((s) => s.users);
  const addSlaPolicy = useStore((s) => s.addSlaPolicy);
  const updateSlaPolicy = useStore((s) => s.updateSlaPolicy);
  const removeSlaPolicy = useStore((s) => s.removeSlaPolicy);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SlaPolicy | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"org" | "client">("org");
  const [clientId, setClientId] = useState<string>("");
  const [hoursKind, setHoursKind] = useState<SlaHoursKind>("business_hours");
  const [tiers, setTiers] = useState<SlaTier[]>(DEFAULT_TIERS);
  const [escalationUserIds, setEscalationUserIds] = useState<string[]>([]);

  const reset = () => {
    setName("");
    setScope("org");
    setClientId("");
    setHoursKind("business_hours");
    setTiers(DEFAULT_TIERS);
    setEscalationUserIds([]);
    setCreating(false);
    setEditing(null);
  };

  const startEdit = (policy: SlaPolicy) => {
    setEditing(policy);
    setName(policy.name);
    setScope(policy.clientId ? "client" : "org");
    setClientId(policy.clientId ?? "");
    setHoursKind(policy.hoursKind);
    setTiers(policy.tiers);
    setEscalationUserIds(policy.escalationUserIds);
    setCreating(true);
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error("Policy name is required");
      return;
    }
    if (scope === "client" && !clientId) {
      toast.error("Pick a client for the override");
      return;
    }

    const data = {
      name: name.trim(),
      clientId: scope === "client" ? clientId : undefined,
      isActive: true,
      hoursKind,
      tiers,
      escalationUserIds,
    };

    if (editing) {
      updateSlaPolicy(editing.id, data);
      toast.success(`Updated SLA policy "${name}"`);
    } else {
      addSlaPolicy(data);
      toast.success(`Created SLA policy "${name}"`);
    }
    reset();
  };

  const updateTier = (priority: TaskPriority, patch: Partial<SlaTier>) => {
    setTiers((arr) =>
      arr.map((t) => (t.priority === priority ? { ...t, ...patch } : t)),
    );
  };

  const toggleEscalation = (userId: string) => {
    setEscalationUserIds((arr) =>
      arr.includes(userId)
        ? arr.filter((id) => id !== userId)
        : [...arr, userId],
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">SLA policies</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Set first-response and resolution targets per priority. Apply
            org-wide as the default, override per client where contracts
            differ.
          </p>
        </div>
        <Dialog
          open={creating}
          onOpenChange={(o) => (o ? setCreating(true) : reset())}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> New policy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit SLA policy" : "New SLA policy"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Policy name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Default support SLA"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Scope
                </Label>
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setScope("org")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs",
                      scope === "org"
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-card text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <Globe className="size-3.5" /> Org-wide default
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("client")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs",
                      scope === "client"
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-card text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <Building2 className="size-3.5" /> Per-client override
                  </button>
                </div>
                {scope === "client" ? (
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Pick a client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Hours
                </Label>
                <select
                  value={hoursKind}
                  onChange={(e) => setHoursKind(e.target.value as SlaHoursKind)}
                  className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="business_hours">
                    Business hours (Mon–Fri, 9–17)
                  </option>
                  <option value="calendar">Calendar hours (24/7)</option>
                </select>
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Tiers
                </Label>
                <div className="mt-1.5 overflow-hidden rounded-md border">
                  <div className="grid grid-cols-[80px_1fr_1fr] gap-2 border-b bg-muted/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span>Priority</span>
                    <span>First response</span>
                    <span>Resolution</span>
                  </div>
                  {PRIORITIES.map((p) => {
                    const tier = tiers.find((t) => t.priority === p);
                    if (!tier) return null;
                    return (
                      <div
                        key={p}
                        className="grid grid-cols-[80px_1fr_1fr] items-center gap-2 border-b px-3 py-2 text-xs last:border-b-0"
                      >
                        <span className="font-medium capitalize">{p}</span>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={tier.responseHours}
                          onChange={(e) =>
                            updateTier(p, {
                              responseHours: Number(e.target.value),
                            })
                          }
                          className="h-8 text-xs"
                        />
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={tier.resolutionHours}
                          onChange={(e) =>
                            updateTier(p, {
                              resolutionHours: Number(e.target.value),
                            })
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Hours, counted in {hoursKind === "business_hours" ? "business" : "calendar"} hours.
                </p>
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Escalation recipients
                </Label>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  These teammates get an email when a deadline is breached.
                  (Email wiring lands once the engine fires breach events —
                  the user list persists for now.)
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {users.slice(0, 12).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleEscalation(u.id)}
                      className={cn(
                        "rounded-pill border px-2 py-1 text-[11px] transition-colors",
                        escalationUserIds.includes(u.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "bg-card text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {u.fullName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button onClick={submit}>
                {editing ? "Save changes" : "Create policy"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {policies.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
          <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
            <Timer className="size-5" />
          </div>
          <p className="text-sm font-medium">No SLA policies yet</p>
          <p className="text-xs text-muted-foreground">
            Create an org-wide default to put SLAs on every client-visible
            task. Add per-client overrides for premium contracts.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <AnimatePresence initial={false}>
            {policies.map((p) => {
              const client = clients.find((c) => c.id === p.clientId);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-3 border-b p-4 last:border-b-0"
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    {p.clientId ? (
                      <Building2 className="size-4" />
                    ) : (
                      <Globe className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{p.name}</p>
                      <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                        {p.clientId ? client?.name ?? "client" : "default"}
                      </span>
                      <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                        {p.hoursKind === "business_hours" ? "biz hrs" : "24/7"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.tiers.map((t) => (
                        <span
                          key={t.priority}
                          className="inline-flex items-center gap-1.5 rounded-pill border bg-card px-2 py-0.5 text-[11px]"
                        >
                          <span className="font-medium capitalize">
                            {t.priority}
                          </span>
                          <span className="text-muted-foreground">
                            resp {formatHours(t.responseHours)} · res{" "}
                            {formatHours(t.resolutionHours)}
                          </span>
                        </span>
                      ))}
                    </div>
                    {p.escalationUserIds.length > 0 ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Escalates to{" "}
                        {p.escalationUserIds
                          .map(
                            (id) =>
                              users.find((u) => u.id === id)?.fullName ?? "—",
                          )
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={p.isActive}
                      onCheckedChange={() =>
                        updateSlaPolicy(p.id, { isActive: !p.isActive })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(p)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (confirm(`Delete policy "${p.name}"?`)) {
                          removeSlaPolicy(p.id);
                          toast.success("SLA policy removed");
                        }
                      }}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
