"use client";

import { useState } from "react";
import { Plus, Trash2, Receipt, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/db/store";
import {
  DEFAULT_BILL_RATE,
  resolveBillingRate,
} from "@/lib/billing/rate";
import type { OrgRole, RateCardEntry } from "@/types/domain";
import { toast } from "sonner";

interface Props {
  clientId: string;
}

const ROLE_LABELS: Record<OrgRole, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  pm: "Project manager",
  member: "Team member",
  finance: "Finance",
  qa: "QA",
  client: "Client",
};

const RATEABLE_ROLES: OrgRole[] = ["pm", "member", "qa", "finance"];

/**
 * Inline rate-card editor for a client. The hierarchy in the resolver:
 *   project override → client rate card → user default → fallback,
 * so this UI surfaces the middle tier.
 */
export function RateCardEditor({ clientId }: Props) {
  const clients = useStore((s) => s.clients);
  const updateClient = useStore((s) => s.updateClient);
  const users = useStore((s) => s.users);

  const client = clients.find((c) => c.id === clientId);
  const [draft, setDraft] = useState<RateCardEntry[]>(
    client?.rateCard ?? [],
  );
  const [dirty, setDirty] = useState(false);

  if (!client) return null;

  function setEntry(i: number, patch: Partial<RateCardEntry>) {
    const next = draft.slice();
    next[i] = { ...next[i], ...patch };
    setDraft(next);
    setDirty(true);
  }

  function addEntry() {
    const taken = new Set(draft.map((d) => d.role));
    const role = RATEABLE_ROLES.find((r) => !taken.has(r)) ?? "member";
    setDraft([...draft, { role, rate: DEFAULT_BILL_RATE }]);
    setDirty(true);
  }

  function removeEntry(i: number) {
    setDraft(draft.filter((_, j) => j !== i));
    setDirty(true);
  }

  function save() {
    const cleaned = draft
      .filter((e) => e.rate > 0)
      .reduce<RateCardEntry[]>((acc, e) => {
        if (acc.find((x) => x.role === e.role)) return acc;
        return [...acc, e];
      }, []);
    updateClient(clientId, { rateCard: cleaned });
    toast.success(`Rate card saved · ${cleaned.length} role${cleaned.length === 1 ? "" : "s"}`);
    setDirty(false);
  }

  // Preview the resolved rate for each team member (sample)
  const sampleUsers = users.slice(0, 3);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2">
        <Receipt className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Rate card</h3>
        <span className="text-[11px] text-muted-foreground">
          Per-role hourly rates that apply to projects for this client
        </span>
      </div>

      {draft.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center">
          <p className="text-sm font-medium">No rate card configured</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Without a rate card, billing falls back to each team member's default rate.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {draft.map((entry, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_140px_auto] items-center gap-2"
            >
              <select
                value={entry.role}
                onChange={(e) => setEntry(i, { role: e.target.value as OrgRole })}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                {RATEABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {client.currency}
                </span>
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={entry.rate}
                  onChange={(e) => setEntry(i, { rate: Number(e.target.value) || 0 })}
                  className="pl-12 text-right font-mono text-sm"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEntry(i)}
                title="Remove"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addEntry}>
          <Plus className="size-3.5" /> Add role rate
        </Button>
        <Button size="sm" onClick={save} disabled={!dirty}>
          Save rate card
        </Button>
      </div>

      <div className="rounded-md border bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Info className="size-3" />
          Live resolver preview · projects for this client
        </div>
        <ul className="space-y-1 text-[11px]">
          {sampleUsers.map((u) => {
            const resolved = resolveBillingRate({
              user: u,
              project: undefined,
              client: { rateCard: draft },
            });
            return (
              <li key={u.id} className="flex items-center justify-between">
                <span>
                  <span className="font-medium">{u.fullName}</span>
                  <span className="ml-1 text-muted-foreground">· {ROLE_LABELS[u.role]}</span>
                </span>
                <span className="font-mono">
                  ${resolved.rate}/h{" "}
                  <span className="text-muted-foreground">({resolved.source.replace(/_/g, " ")})</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
