"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Webhook,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIntegrationsStore } from "@/lib/integrations/store";
import {
  CATEGORY_LABELS,
  PROVIDERS,
  providersByCategory,
  getProvider,
} from "@/lib/integrations/registry";
import type {
  IntegrationCategory,
  IntegrationProviderKind,
} from "@/types/domain";
import { useStore } from "@/lib/db/store";
import { AddCredentialDialog } from "./AddCredentialDialog";
import { WebhookSubscriptionsPanel } from "./WebhookSubscriptionsPanel";
import { ProviderIcon } from "./ProviderIcon";
import { toast } from "sonner";

const CATEGORIES: IntegrationCategory[] = [
  "design",
  "code",
  "comms",
  "storage",
  "marketing",
  "accounting",
  "crm",
  "calendar",
  "devops",
  "hosting",
  "gateway",
];

export function IntegrationsPanel() {
  const orgId = useStore((s) => s.organization.id);
  const credentials = useIntegrationsStore((s) => s.credentials);
  const connections = useIntegrationsStore((s) => s.connections);
  const deleteCredential = useIntegrationsStore((s) => s.deleteCredential);

  const [tab, setTab] = useState<"providers" | "webhooks">("providers");
  const [activeCategory, setActiveCategory] =
    useState<IntegrationCategory>("design");
  const [adding, setAdding] = useState<IntegrationProviderKind | null>(null);

  const byCategory = useMemo(() => providersByCategory(), []);
  const orgCredentials = useMemo(
    () => credentials.filter((c) => c.organizationId === orgId),
    [credentials, orgId],
  );

  const connectionsByProvider = useMemo(() => {
    const map = new Map<IntegrationProviderKind, number>();
    for (const c of connections) {
      if (c.organizationId !== orgId) continue;
      map.set(c.provider, (map.get(c.provider) ?? 0) + 1);
    }
    return map;
  }, [connections, orgId]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
        <button
          onClick={() => setTab("providers")}
          className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "providers"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Providers
        </button>
        <button
          onClick={() => setTab("webhooks")}
          className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "webhooks"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Webhook className="size-3" />
            Outbound webhooks
          </span>
        </button>
      </div>

      {tab === "providers" && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const count = byCategory[cat]?.length ?? 0;
              const connected = byCategory[cat]?.reduce(
                (n, p) => n + (connectionsByProvider.get(p.kind) ?? 0),
                0,
              );
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-md border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    activeCategory === cat
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                  <span className="ml-1.5 opacity-60">
                    {connected ? `${connected}/${count}` : count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {byCategory[activeCategory]?.map((p) => {
              const cred = orgCredentials.find((c) => c.provider === p.kind);
              const conn = connections.find(
                (c) => c.organizationId === orgId && c.provider === p.kind,
              );
              const isConnected =
                conn?.status === "connected" ||
                cred?.lastValidatedAt !== undefined;
              const supportsLabel =
                [
                  p.supportsOauth && "OAuth",
                  p.supportsPat && "PAT",
                  p.supportsApiKey && "API key",
                  p.supportsWebhookOut && "Webhooks out",
                ]
                  .filter(Boolean)
                  .join(" · ") || "Inbound only";
              return (
                <div
                  key={p.kind}
                  className="flex items-center gap-3 rounded-md border bg-card px-4 py-3"
                >
                  <ProviderIcon kind={p.kind} className="size-9 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {p.displayName}
                      </p>
                      {isConnected ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
                        >
                          <CheckCircle2 className="mr-1 size-2.5" />
                          Connected
                        </Badge>
                      ) : conn?.status === "pending" ? (
                        <Badge
                          variant="outline"
                          className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
                        >
                          <Clock className="mr-1 size-2.5" />
                          Pending
                        </Badge>
                      ) : conn?.status === "error" ? (
                        <Badge
                          variant="outline"
                          className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
                        >
                          <AlertCircle className="mr-1 size-2.5" />
                          Error
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {cred?.label ?? supportsLabel}
                    </p>
                  </div>
                  {cred ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        deleteCredential(cred.id);
                        toast.success(`${p.displayName} disconnected`);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAdding(p.kind)}
                    >
                      <Plus className="mr-1 size-3.5" />
                      Connect
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <ConnectionsList />
        </>
      )}

      {tab === "webhooks" && <WebhookSubscriptionsPanel />}

      <AddCredentialDialog
        open={adding !== null}
        onOpenChange={(o) => !o && setAdding(null)}
        provider={adding}
      />
    </div>
  );
}

function ConnectionsList() {
  const orgId = useStore((s) => s.organization.id);
  const connections = useIntegrationsStore((s) => s.connections);
  const credentials = useIntegrationsStore((s) => s.credentials);
  const setStatus = useIntegrationsStore((s) => s.setConnectionStatus);
  const remove = useIntegrationsStore((s) => s.removeConnection);
  const markValidated = useIntegrationsStore((s) => s.markCredentialValidated);
  const readSecret = useIntegrationsStore((s) => s.readSecret);

  const list = connections.filter((c) => c.organizationId === orgId);
  if (!list.length) return null;

  async function revalidate(connectionId: string) {
    const conn = connections.find((c) => c.id === connectionId);
    if (!conn) return;
    const cred = credentials.find((c) => c.id === conn.credentialId);
    if (!cred) return;
    const secret = readSecret(cred.vaultSecretId);
    if (!secret) {
      toast.error("Secret not available in this session");
      return;
    }
    setStatus(conn.id, "pending");
    const res = await fetch("/api/integrations/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: conn.provider, credential: cred, secret }),
    });
    const json = (await res.json()) as { ok: boolean; message: string };
    markValidated(cred.id, json.ok, json.message);
    setStatus(conn.id, json.ok ? "connected" : "error", json.ok ? undefined : json.message);
    if (json.ok) toast.success(`${getProvider(conn.provider).displayName}: ${json.message}`);
    else toast.error(`${getProvider(conn.provider).displayName}: ${json.message}`);
  }

  return (
    <div className="rounded-md border bg-card">
      <div className="border-b px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Active connections ({list.length})
        </h3>
      </div>
      <ul className="divide-y">
        {list.map((conn) => {
          const cred = credentials.find((c) => c.id === conn.credentialId);
          const meta = getProvider(conn.provider);
          return (
            <li key={conn.id} className="flex items-center gap-3 px-4 py-3">
              <ProviderIcon kind={conn.provider} className="size-8 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {meta.displayName} ·{" "}
                  <span className="text-muted-foreground">
                    {conn.externalAccountLabel ?? cred?.label ?? "untitled"}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Status: {conn.status}
                  {cred?.lastValidatedAt
                    ? ` · validated ${timeAgo(cred.lastValidatedAt)}`
                    : ""}
                  {conn.lastError ? ` · ${conn.lastError}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void revalidate(conn.id)}
              >
                <RotateCw className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  remove(conn.id);
                  toast.success(`${meta.displayName} connection removed`);
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
              <ChevronRight className="size-3.5 text-muted-foreground/50" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
