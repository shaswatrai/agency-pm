"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Send,
  Power,
  Activity,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useIntegrationsStore } from "@/lib/integrations/store";
import { useStore } from "@/lib/db/store";
import { flushDueDeliveries } from "@/lib/integrations/webhooks/worker";
import { INTEGRATION_EVENT_TYPES } from "@/types/domain";
import { IntegrationRecipes } from "@/components/integrations/IntegrationRecipes";
import { toast } from "sonner";

export function WebhookSubscriptionsPanel() {
  const orgId = useStore((s) => s.organization.id);
  const meId = useStore((s) => s.currentUserId);
  const subs = useIntegrationsStore((s) => s.webhookSubscriptions);
  const deliveries = useIntegrationsStore((s) => s.webhookDeliveries);
  const createSub = useIntegrationsStore((s) => s.createSubscription);
  const updateSub = useIntegrationsStore((s) => s.updateSubscription);
  const deleteSub = useIntegrationsStore((s) => s.deleteSubscription);

  const [adding, setAdding] = useState(false);
  const [flushing, setFlushing] = useState(false);

  const orgSubs = useMemo(
    () => subs.filter((s) => s.organizationId === orgId),
    [subs, orgId],
  );
  const orgDeliveries = useMemo(
    () => deliveries.filter((d) => d.organizationId === orgId).slice(0, 20),
    [deliveries, orgId],
  );

  async function handleFlush() {
    setFlushing(true);
    const result = await flushDueDeliveries();
    setFlushing(false);
    if (result.picked === 0) {
      toast.message("No deliveries due");
    } else {
      toast.success(
        `${result.delivered} delivered · ${result.failed} retried · ${result.exhausted} exhausted (of ${result.picked})`,
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Outbound webhook subscriptions</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Forward Atelier events to QuickBooks, Xero, FreshBooks, Zapier,
            or any custom endpoint. HMAC-signed, with retry &amp; backoff.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleFlush()}
            disabled={flushing}
          >
            {flushing ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Flushing
              </>
            ) : (
              <>
                <Activity className="mr-1.5 size-3.5" />
                Flush queue
              </>
            )}
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1 size-3.5" />
            New subscription
          </Button>
        </div>
      </div>

      <IntegrationRecipes />

      {orgSubs.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/20 px-4 py-8 text-center">
          <p className="text-sm font-medium">No subscriptions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick a recipe above or add a custom target URL.
          </p>
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <ul className="divide-y">
            {orgSubs.map((s) => (
              <li key={s.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {s.eventFilter.length === 1 && s.eventFilter[0] === "*"
                          ? "all events"
                          : `${s.eventFilter.length} filter${s.eventFilter.length === 1 ? "" : "s"}`}
                      </Badge>
                      {s.lastDeliveryStatus === "delivered" && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
                        >
                          <CheckCircle2 className="mr-0.5 size-2.5" />
                          OK
                        </Badge>
                      )}
                      {(s.lastDeliveryStatus === "failed" ||
                        s.lastDeliveryStatus === "exhausted") && (
                        <Badge
                          variant="outline"
                          className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
                        >
                          <AlertCircle className="mr-0.5 size-2.5" />
                          {s.lastDeliveryStatus}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {s.targetUrl}
                    </p>
                  </div>
                  <Switch
                    checked={s.isActive}
                    onCheckedChange={(v) => updateSub(s.id, { isActive: v })}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      deleteSub(s.id);
                      toast.success("Subscription removed");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {orgDeliveries.length > 0 && (
        <div className="rounded-md border bg-card">
          <div className="border-b px-4 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent deliveries
            </h3>
          </div>
          <ul className="divide-y">
            {orgDeliveries.map((d) => (
              <li
                key={d.id}
                className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-2 text-xs"
              >
                <Badge
                  variant="outline"
                  className={
                    d.status === "delivered"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : d.status === "exhausted"
                        ? "border-destructive/30 bg-destructive/5 text-destructive"
                        : ""
                  }
                >
                  {d.status}
                </Badge>
                <span className="truncate font-mono">{d.eventType}</span>
                <span className="text-muted-foreground">
                  {d.attemptCount} attempt{d.attemptCount === 1 ? "" : "s"}
                </span>
                <span className="text-muted-foreground">
                  {d.responseStatus ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <NewSubscriptionDialog
        open={adding}
        onOpenChange={setAdding}
        onCreate={(input) => {
          createSub({
            organizationId: orgId,
            createdBy: meId,
            ...input,
          });
          toast.success("Subscription saved");
        }}
      />
    </div>
  );
}

function NewSubscriptionDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (input: {
    name: string;
    targetUrl: string;
    secret: string;
    eventFilter: string[];
    description?: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "selected">("all");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    | { ok: boolean; message?: string; status?: number; responseBody?: string }
    | null
  >(null);

  function reset() {
    setName("");
    setTargetUrl("");
    setSecret("");
    setFilterMode("all");
    setSelectedEvents([]);
    setTestResult(null);
  }

  async function handleTest() {
    if (!targetUrl || !secret) {
      toast.error("URL and secret required");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/integrations/webhooks/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUrl, secret }),
      });
      const json = await res.json();
      setTestResult(json);
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setTesting(false);
    }
  }

  function handleSubmit() {
    if (!name.trim() || !targetUrl.trim() || !secret.trim()) {
      toast.error("Name, URL, and secret are required");
      return;
    }
    onCreate({
      name: name.trim(),
      targetUrl: targetUrl.trim(),
      secret: secret.trim(),
      eventFilter:
        filterMode === "all" || selectedEvents.length === 0
          ? ["*"]
          : selectedEvents,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New webhook subscription</DialogTitle>
          <DialogDescription>
            Atelier signs each delivery with HMAC-SHA256 and retries with
            exponential backoff (30s · 1m · 5m · 15m · 1h · 6h).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sync invoices to Xero"
            />
          </div>
          <div>
            <Label className="text-xs">Target URL</Label>
            <Input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://hooks.example.com/atelier"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Signing secret</Label>
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="font-mono text-xs"
              placeholder="random string ≥ 32 chars"
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Receivers compute{" "}
              <code className="font-mono">HMAC_SHA256(ts.body)</code> and
              compare against <code className="font-mono">X-Atelier-Signature</code>.
            </p>
          </div>

          <div>
            <Label className="text-xs">Event filter</Label>
            <div className="mt-1 flex gap-1">
              <button
                onClick={() => setFilterMode("all")}
                className={`rounded-md border px-3 py-1 text-[11px] font-medium ${
                  filterMode === "all"
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                All events
              </button>
              <button
                onClick={() => setFilterMode("selected")}
                className={`rounded-md border px-3 py-1 text-[11px] font-medium ${
                  filterMode === "selected"
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                Selected
              </button>
            </div>
            {filterMode === "selected" && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-2">
                <div className="grid grid-cols-2 gap-1">
                  {INTEGRATION_EVENT_TYPES.map((evt) => {
                    const checked = selectedEvents.includes(evt);
                    return (
                      <label
                        key={evt}
                        className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-[11px] hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedEvents((prev) =>
                              e.target.checked
                                ? [...prev, evt]
                                : prev.filter((x) => x !== evt),
                            )
                          }
                          className="size-3"
                        />
                        <span className="font-mono">{evt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {testResult && (
            <div
              className={`rounded-md border px-3 py-2 text-xs ${
                testResult.ok
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              }`}
            >
              {testResult.ok ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" />
                  OK · {testResult.status}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <AlertCircle className="size-3.5" />
                  {testResult.message ?? `Failed${testResult.status ? ` (${testResult.status})` : ""}`}
                </span>
              )}
              {testResult.responseBody && (
                <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] opacity-80">
                  {testResult.responseBody.slice(0, 800)}
                </pre>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !targetUrl || !secret}
          >
            {testing ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Sending ping
              </>
            ) : (
              <>
                <Send className="mr-1.5 size-3.5" />
                Test fire
              </>
            )}
          </Button>
          <Button onClick={handleSubmit}>Create subscription</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
