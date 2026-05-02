"use client";

import { useState } from "react";
import { Palette, ExternalLink, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/db/store";
import { toast } from "sonner";

interface Props {
  clientId: string;
}

const ACCENT_OPTIONS = [
  { name: "Indigo", h: 221 },
  { name: "Sky", h: 199 },
  { name: "Teal", h: 175 },
  { name: "Emerald", h: 142 },
  { name: "Amber", h: 38 },
  { name: "Rose", h: 350 },
  { name: "Violet", h: 262 },
];

/**
 * Per-client portal branding editor (PRD §5.5.1). Client logo, accent
 * hue, welcome message, optional footer override. The portal page reads
 * `client.portalBranding` and applies these via inline CSS.
 */
export function PortalBrandingEditor({ clientId }: Props) {
  const clients = useStore((s) => s.clients);
  const updateClient = useStore((s) => s.updateClient);
  const orgSlug = useStore((s) => s.organization.slug);

  const client = clients.find((c) => c.id === clientId);
  const [logoUrl, setLogoUrl] = useState(client?.logoUrl ?? "");
  const [accentHue, setAccentHue] = useState(
    client?.portalBranding?.accentHue ?? 221,
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    client?.portalBranding?.welcomeMessage ?? "",
  );
  const [footerOverride, setFooterOverride] = useState(
    client?.portalBranding?.footerOverride ?? "",
  );
  const [dirty, setDirty] = useState(false);

  if (!client) return null;

  function save() {
    updateClient(clientId, {
      logoUrl: logoUrl.trim() || undefined,
      portalBranding: {
        accentHue,
        welcomeMessage: welcomeMessage.trim() || undefined,
        footerOverride: footerOverride.trim() || undefined,
      },
    });
    toast.success("Portal branding saved");
    setDirty(false);
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2">
        <Palette className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Portal branding</h3>
        <a
          href={`/portal/${clientId}`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          Preview portal
          <ExternalLink className="size-3" />
        </a>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs">Logo URL</Label>
          <Input
            value={logoUrl}
            onChange={(e) => {
              setLogoUrl(e.target.value);
              setDirty(true);
            }}
            placeholder="https://…/logo.png"
            className="font-mono text-xs"
          />
        </div>

        <div>
          <Label className="text-xs">Accent</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ACCENT_OPTIONS.map((a) => (
              <button
                key={a.h}
                onClick={() => {
                  setAccentHue(a.h);
                  setDirty(true);
                }}
                className={`flex flex-col items-center gap-1`}
                title={a.name}
              >
                <span
                  className={`grid size-7 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-background transition-all ${
                    accentHue === a.h ? "ring-foreground" : "ring-transparent"
                  }`}
                  style={{ backgroundColor: `hsl(${a.h}, 80%, 55%)` }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs">Welcome message</Label>
        <textarea
          value={welcomeMessage}
          onChange={(e) => {
            setWelcomeMessage(e.target.value);
            setDirty(true);
          }}
          rows={2}
          placeholder="Optional banner shown above the portal dashboard"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <Label className="text-xs">Footer text</Label>
        <Input
          value={footerOverride}
          onChange={(e) => {
            setFooterOverride(e.target.value);
            setDirty(true);
          }}
          placeholder={`Atelier Studio · ${client.name} portal (default)`}
          className="text-xs"
        />
      </div>

      {/* Live preview strip */}
      <div className="rounded-md border-2 border-dashed bg-muted/30 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Live preview
        </p>
        <div
          className="mt-2 rounded-md p-3"
          style={{
            background: `hsl(${accentHue}, 80%, 97%)`,
            border: `1px solid hsl(${accentHue}, 60%, 85%)`,
            color: `hsl(${accentHue}, 70%, 25%)`,
          }}
        >
          <div className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="logo" className="size-7 rounded object-cover" />
            ) : (
              <span
                className="grid size-7 place-items-center rounded text-white font-semibold text-[10px]"
                style={{
                  background: `linear-gradient(135deg, hsl(${accentHue}, 80%, 60%), hsl(${(accentHue + 40) % 360}, 70%, 50%))`,
                }}
              >
                {client.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="text-xs font-medium">{client.name}</span>
          </div>
          {welcomeMessage && (
            <p className="mt-2 text-xs">{welcomeMessage}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={!dirty}>
          <Save className="mr-1 size-3.5" /> Save branding
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Public portal URL: <code className="font-mono">/portal/{clientId}</code>
      </p>
      {/* keep orgSlug referenced so the share-link convention is visible */}
      <span className="hidden">{orgSlug}</span>
    </div>
  );
}
