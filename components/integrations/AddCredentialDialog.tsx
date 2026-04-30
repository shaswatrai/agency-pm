"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ExternalLink, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIntegrationsStore } from "@/lib/integrations/store";
import { getProvider } from "@/lib/integrations/registry";
import type {
  IntegrationCredentialType,
  IntegrationProviderKind,
} from "@/types/domain";
import { useStore } from "@/lib/db/store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: IntegrationProviderKind | null;
}

export function AddCredentialDialog({ open, onOpenChange, provider }: Props) {
  const orgId = useStore((s) => s.organization.id);
  const meId = useStore((s) => s.currentUserId);
  const createCredential = useIntegrationsStore((s) => s.createCredential);
  const upsertConnection = useIntegrationsStore((s) => s.upsertConnection);
  const markValidated = useIntegrationsStore((s) => s.markCredentialValidated);

  const meta = provider ? getProvider(provider) : null;

  const credentialType = useMemo<IntegrationCredentialType | null>(() => {
    if (!meta) return null;
    if (meta.supportsApiKey) return "api_key";
    if (meta.supportsPat) return "personal_access_token";
    if (meta.supportsOauth) return "oauth2";
    return "api_key";
  }, [meta]);

  const [label, setLabel] = useState("");
  const [secret, setSecret] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    | { ok: boolean; message: string; account?: { id: string; label: string } }
    | null
  >(null);

  useEffect(() => {
    if (!open) {
      setLabel("");
      setSecret("");
      setTestResult(null);
      setTesting(false);
    } else if (meta) {
      setLabel(`${meta.displayName} — main`);
    }
  }, [open, meta]);

  if (!meta || !provider || !credentialType) return null;

  const showSecretField =
    credentialType === "api_key" ||
    credentialType === "personal_access_token" ||
    credentialType === "basic_auth";

  async function handleTest() {
    if (!provider || !meta) return;
    setTesting(true);
    setTestResult(null);
    const tempCred = {
      id: "preview",
      organizationId: orgId,
      provider,
      credentialType: credentialType!,
      label,
      vaultSecretId: "preview",
      payloadMeta: {},
      scopes: meta.defaultScopes,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, credential: tempCred, secret }),
      });
      const json = await res.json();
      setTestResult(json);
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Test failed",
      });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    if (!provider || !meta || !label.trim()) {
      toast.error("Label is required");
      return;
    }
    if (showSecretField && !secret.trim()) {
      toast.error("Secret is required");
      return;
    }
    const cred = createCredential({
      organizationId: orgId,
      provider,
      credentialType: credentialType!,
      label: label.trim(),
      secret: secret.trim() || `oauth-pending-${Date.now()}`,
      scopes: meta.defaultScopes,
      createdBy: meId,
    });
    if (testResult?.ok) {
      markValidated(cred.id, true, testResult.message);
    }
    upsertConnection({
      organizationId: orgId,
      credentialId: cred.id,
      provider,
      status: testResult?.ok ? "connected" : "pending",
      externalAccountId: testResult?.account?.id,
      externalAccountLabel: testResult?.account?.label ?? label.trim(),
      accountMetadata: {},
    });
    toast.success(`${meta.displayName} connection saved`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {meta.displayName}</DialogTitle>
          <DialogDescription>
            {credentialType === "oauth2"
              ? "OAuth flow will open in a new tab. After authorising, paste the issued token below or rely on the callback handler."
              : credentialType === "personal_access_token"
                ? "Generate a personal access token with the scopes listed below and paste it here."
                : "Paste your API key for this provider."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`${meta.displayName} — main`}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              How this credential appears in the connections list.
            </p>
          </div>

          {showSecretField && (
            <div>
              <Label className="text-xs">
                {credentialType === "api_key" ? "API key" : "Token"}
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="pl-9 font-mono text-xs"
                  placeholder="paste here"
                  autoComplete="off"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Stored in Supabase Vault when connected; never visible to
                browser code after save.
              </p>
            </div>
          )}

          {meta.defaultScopes.length > 0 && (
            <div className="rounded-md border bg-muted/40 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Required scopes
              </p>
              <p className="mt-1 font-mono text-[11px]">
                {meta.defaultScopes.join(" · ")}
              </p>
            </div>
          )}

          {meta.documentationUrl && (
            <a
              href={meta.documentationUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              How to obtain this credential
              <ExternalLink className="size-3" />
            </a>
          )}

          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
                testResult.ok
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || (showSecretField && !secret.trim())}
          >
            {testing ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Testing
              </>
            ) : (
              "Test connection"
            )}
          </Button>
          <Button onClick={handleSave}>Save credential</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
