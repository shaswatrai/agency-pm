"use client";

import { useMemo, useState } from "react";
import {
  Lock,
  Plus,
  ExternalLink,
  Copy,
  Trash2,
  Power,
  CheckCircle2,
  AlertCircle,
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
import { useStore } from "@/lib/db/store";
import {
  SSO_VENDORS,
  spUrls,
  validateProviderConfig,
} from "@/lib/security/sso";
import type { OrgRole, SsoProvider } from "@/types/domain";
import { toast } from "sonner";

const ROLE_LABELS: Record<OrgRole, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  pm: "Project manager",
  member: "Team member",
  finance: "Finance",
  qa: "QA",
  client: "Client",
};

/**
 * SSO providers panel (PRD §7). Connect Google Workspace / Microsoft
 * Entra / Okta / generic OIDC. Vendor presets show:
 *   - the SP-side URLs the admin pastes into the IdP
 *   - the IdP-side fields we need to POST against (with metadata-URL
 *     fallback for SAML vendors)
 *   - a JIT-provisioning domain allowlist + default role
 */
export function SsoProvidersPanel() {
  const orgId = useStore((s) => s.organization.id);
  const providers = useStore((s) => s.ssoProviders);
  const settings = useStore((s) => s.securitySettings);
  const updateSettings = useStore((s) => s.updateSecuritySettings);
  const addProvider = useStore((s) => s.addSsoProvider);
  const updateProvider = useStore((s) => s.updateSsoProvider);
  const removeProvider = useStore((s) => s.removeSsoProvider);

  const [adding, setAdding] = useState<SsoProvider["vendor"] | null>(null);
  const [draft, setDraft] = useState<{
    displayName: string;
    config: Record<string, string>;
    defaultRole: OrgRole;
  }>({
    displayName: "",
    config: {},
    defaultRole: "member",
  });
  const [domainInput, setDomainInput] = useState("");

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://your-deploy.atelier.studio";
  const sp = useMemo(() => spUrls(orgId, baseUrl), [orgId, baseUrl]);

  function reset() {
    setAdding(null);
    setDraft({ displayName: "", config: {}, defaultRole: "member" });
  }

  function submit() {
    if (!adding) return;
    const preset = SSO_VENDORS[adding];
    if (!draft.displayName.trim()) {
      toast.error("Name the connection");
      return;
    }
    const missing = validateProviderConfig(adding, draft.config);
    if (missing.length > 0) {
      toast.error(`Missing: ${missing.join(", ")}`);
      return;
    }
    addProvider({
      protocol: preset.protocol,
      vendor: adding,
      displayName: draft.displayName.trim(),
      config: draft.config,
      defaultRole: draft.defaultRole,
      isActive: true,
    });
    toast.success(`${preset.displayName} configured`);
    reset();
  }

  function addDomain() {
    const d = domainInput.trim().toLowerCase();
    if (!d) return;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) {
      toast.error("Enter a valid domain (e.g. acme.com)");
      return;
    }
    const existing = settings.jitProvisioningDomains ?? [];
    updateSettings({
      jitProvisioningDomains: [...existing.filter((x) => x !== d), d],
    });
    setDomainInput("");
  }

  function removeDomain(d: string) {
    updateSettings({
      jitProvisioningDomains: (settings.jitProvisioningDomains ?? []).filter(
        (x) => x !== d,
      ),
    });
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2">
        <Lock className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Single sign-on</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Federate logins via SAML 2.0 or OIDC. Multiple providers can be
        active — Atelier picks based on the user's email domain.
      </p>

      {/* Service-provider URLs */}
      <div className="mt-4 rounded-md border bg-muted/30 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Atelier service-provider URLs (paste into your IdP)
        </p>
        <ul className="mt-2 space-y-1 text-[11px]">
          {[
            { label: "ACS / Redirect URL", url: sp.acsUrl },
            { label: "SP Entity ID / Metadata", url: sp.spEntityId },
            { label: "Single logout URL", url: sp.sloUrl },
          ].map((r) => (
            <li key={r.label} className="flex items-center gap-2">
              <span className="w-44 shrink-0 text-muted-foreground">
                {r.label}
              </span>
              <code className="flex-1 truncate font-mono text-[10px]">
                {r.url}
              </code>
              <button
                onClick={() => copy(r.url)}
                className="rounded-md p-1 hover:bg-accent"
              >
                <Copy className="size-3 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Existing providers */}
      {providers.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Active providers
          </p>
          <ul className="mt-2 space-y-2">
            {providers.map((p) => {
              const preset = SSO_VENDORS[p.vendor];
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-md border bg-background px-3 py-2.5"
                >
                  <div className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
                    <Lock className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.displayName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {preset.displayName} ·{" "}
                      <span className="font-mono">{p.protocol.toUpperCase()}</span>{" "}
                      · default role {ROLE_LABELS[p.defaultRole]}
                    </p>
                  </div>
                  {p.isActive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-status-done">
                      <CheckCircle2 className="size-2.5" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <AlertCircle className="size-2.5" />
                      Disabled
                    </span>
                  )}
                  <Switch
                    checked={p.isActive}
                    onCheckedChange={(v) => updateProvider(p.id, { isActive: v })}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      removeProvider(p.id);
                      toast.success("Provider removed");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Add a vendor preset */}
      <div className="mt-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Add provider
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {(Object.keys(SSO_VENDORS) as SsoProvider["vendor"][]).map((v) => {
            const preset = SSO_VENDORS[v];
            return (
              <button
                key={v}
                onClick={() => {
                  setAdding(v);
                  setDraft((d) => ({ ...d, displayName: preset.displayName }));
                }}
                className="flex items-start gap-2 rounded-md border bg-background p-3 text-left hover:border-primary/40"
              >
                <Lock className="mt-0.5 size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{preset.displayName}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {preset.protocol.toUpperCase()}
                  </p>
                </div>
                <Plus className="size-3.5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>

      {/* JIT provisioning */}
      <div className="mt-5 rounded-md border bg-muted/30 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          JIT provisioning domains
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Federated users with email at these domains auto-provision on first
          login with each provider's default role.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(settings.jitProvisioningDomains ?? []).map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1 rounded-pill bg-background px-2 py-0.5 text-[11px] font-mono"
            >
              {d}
              <button
                onClick={() => removeDomain(d)}
                className="text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDomain();
              }
            }}
            placeholder="acme.com"
            className="font-mono text-xs"
          />
          <Button size="sm" variant="outline" onClick={addDomain}>
            <Plus className="size-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Vendor preset config dialog */}
      <Dialog open={adding !== null} onOpenChange={(o) => !o && reset()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="size-4" />
              Configure {adding ? SSO_VENDORS[adding].displayName : ""}
            </DialogTitle>
            {adding && (
              <DialogDescription>
                <a
                  href={SSO_VENDORS[adding].setupGuideUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Setup guide on{" "}
                  {SSO_VENDORS[adding].displayName}
                  <ExternalLink className="size-3" />
                </a>
              </DialogDescription>
            )}
          </DialogHeader>

          {adding && (
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Connection name</Label>
                <Input
                  value={draft.displayName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, displayName: e.target.value }))
                  }
                />
              </div>
              {SSO_VENDORS[adding].configFields.map((f) => (
                <div key={f.key}>
                  <Label className="text-xs">
                    {f.label}
                    {f.required && <span className="text-destructive">*</span>}
                  </Label>
                  {f.inputType === "textarea" ? (
                    <textarea
                      value={draft.config[f.key] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          config: { ...d.config, [f.key]: e.target.value },
                        }))
                      }
                      placeholder={f.placeholder}
                      rows={4}
                      className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <Input
                      type={f.secret ? "password" : "text"}
                      value={draft.config[f.key] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          config: { ...d.config, [f.key]: e.target.value },
                        }))
                      }
                      placeholder={f.placeholder}
                      className={
                        f.inputType === "url" || f.secret
                          ? "font-mono text-xs"
                          : ""
                      }
                    />
                  )}
                  {f.helpText && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {f.helpText}
                    </p>
                  )}
                </div>
              ))}
              <div>
                <Label className="text-xs">
                  Default role for new federated users
                </Label>
                <select
                  value={draft.defaultRole}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      defaultRole: e.target.value as OrgRole,
                    }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  {(["member", "pm", "admin", "qa", "finance"] as OrgRole[]).map(
                    (r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button onClick={submit}>
              <Power className="mr-1 size-3.5" /> Save & enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
