"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Palette,
  Type,
  FileText,
  Layers,
  Camera,
  Plus,
  Trash2,
  Copy,
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
import type { BrandAssetKind } from "@/types/domain";

interface Props {
  clientId: string;
}

const KIND_META: Record<
  BrandAssetKind,
  { label: string; icon: typeof ImageIcon }
> = {
  logo: { label: "Logo", icon: ImageIcon },
  color: { label: "Color", icon: Palette },
  font: { label: "Font", icon: Type },
  guideline: { label: "Brand guidelines", icon: FileText },
  template: { label: "Template", icon: Layers },
  imagery: { label: "Imagery", icon: Camera },
};

/**
 * Brand asset library per client (PRD §5.7). Logos, brand colors, fonts,
 * guideline PDFs, templates, and imagery — accessible across every project
 * for that client. Logos render as image previews; colors as swatches with
 * copyable hex; fonts as styled name + weight chips.
 */
export function BrandAssetsPanel({ clientId }: Props) {
  const me = useCurrentUser();
  const assets = useStore((s) => s.brandAssets).filter(
    (a) => a.clientId === clientId,
  );
  const addAsset = useStore((s) => s.addBrandAsset);
  const removeAsset = useStore((s) => s.removeBrandAsset);

  const [adding, setAdding] = useState<BrandAssetKind | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    url: "",
    hex: "#0066ff",
    swatchType: "primary" as "primary" | "secondary" | "accent",
    family: "",
    weights: "400, 600",
    variant: "primary" as "primary" | "mono" | "wordmark",
  });

  function reset() {
    setAdding(null);
    setDraft({
      name: "",
      description: "",
      url: "",
      hex: "#0066ff",
      swatchType: "primary",
      family: "",
      weights: "400, 600",
      variant: "primary",
    });
  }

  function submit() {
    if (!adding) return;
    if (!draft.name.trim()) {
      toast.error("Name the asset");
      return;
    }
    let metadata: Record<string, unknown> = {};
    switch (adding) {
      case "logo":
        if (!draft.url.trim()) return toast.error("Logo URL required");
        metadata = { url: draft.url.trim(), variant: draft.variant };
        break;
      case "color":
        metadata = { hex: draft.hex, swatchType: draft.swatchType };
        break;
      case "font":
        metadata = {
          family: draft.family.trim() || draft.name.trim(),
          weights: draft.weights
            .split(",")
            .map((w) => w.trim())
            .filter(Boolean),
        };
        break;
      case "guideline":
      case "template":
      case "imagery":
        metadata = { url: draft.url.trim() };
        break;
    }
    addAsset({
      clientId,
      kind: adding,
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      metadata,
      uploadedBy: me.id,
    });
    toast.success(`${KIND_META[adding].label} added`);
    reset();
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Layers className="size-4 text-primary" /> Brand asset library
        </h3>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(KIND_META) as BrandAssetKind[]).map((k) => {
            const Icon = KIND_META[k].icon;
            return (
              <Button
                key={k}
                size="sm"
                variant="outline"
                onClick={() => setAdding(k)}
                className="text-[11px]"
              >
                <Plus className="size-3" />
                <Icon className="size-3" />
                {KIND_META[k].label}
              </Button>
            );
          })}
        </div>
      </div>

      {assets.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          No brand assets yet. Add a logo, brand color, or font to get started.
        </p>
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {assets.map((a) => {
              const Icon = KIND_META[a.kind].icon;
              const m = a.metadata as Record<string, unknown>;
              return (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative rounded-md border bg-card p-3"
                >
                  <button
                    onClick={() => {
                      removeAsset(a.id);
                      toast.success("Asset removed");
                    }}
                    className="absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent"
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </button>

                  {a.kind === "logo" && typeof m.url === "string" && (
                    <div className="mb-2 grid h-20 place-items-center rounded-md bg-muted/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={a.name} className="max-h-16 max-w-full object-contain" />
                    </div>
                  )}
                  {a.kind === "color" && typeof m.hex === "string" && (
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(String(m.hex));
                        toast.success(`${m.hex} copied`);
                      }}
                      className="mb-2 grid h-20 w-full place-items-center rounded-md text-white"
                      style={{ background: String(m.hex) }}
                    >
                      <span className="font-mono text-xs">{String(m.hex)}</span>
                    </button>
                  )}
                  {a.kind === "font" && (
                    <div
                      className="mb-2 grid h-20 place-items-center rounded-md bg-muted/30 text-2xl"
                      style={{ fontFamily: String(m.family ?? a.name) }}
                    >
                      Aa
                    </div>
                  )}
                  {(a.kind === "guideline" || a.kind === "template" || a.kind === "imagery") && typeof m.url === "string" && (
                    <a
                      href={String(m.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-2 grid h-20 place-items-center rounded-md bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    >
                      <Icon className="size-7" />
                    </a>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Icon className="size-3 text-muted-foreground" />
                    <p className="truncate text-sm font-medium">{a.name}</p>
                  </div>
                  {a.description && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                      {a.description}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {KIND_META[a.kind].label}
                    {a.kind === "color" && m.swatchType ? ` · ${String(m.swatchType)}` : ""}
                    {a.kind === "font" && Array.isArray(m.weights)
                      ? ` · ${(m.weights as string[]).join(", ")}`
                      : ""}
                    {a.kind === "logo" && m.variant ? ` · ${String(m.variant)}` : ""}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={adding !== null} onOpenChange={(o) => !o && reset()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add {adding ? KIND_META[adding].label.toLowerCase() : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Input
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>

            {adding === "logo" && (
              <>
                <div>
                  <Label className="text-xs">Logo URL</Label>
                  <Input
                    value={draft.url}
                    onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                    placeholder="https://…/logo.svg"
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Variant</Label>
                  <select
                    value={draft.variant}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        variant: e.target.value as typeof d.variant,
                      }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="primary">Primary</option>
                    <option value="mono">Monochrome</option>
                    <option value="wordmark">Wordmark</option>
                  </select>
                </div>
              </>
            )}

            {adding === "color" && (
              <>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={draft.hex}
                    onChange={(e) => setDraft((d) => ({ ...d, hex: e.target.value }))}
                    className="size-12 cursor-pointer p-1"
                  />
                  <Input
                    value={draft.hex}
                    onChange={(e) => setDraft((d) => ({ ...d, hex: e.target.value }))}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">Swatch type</Label>
                  <select
                    value={draft.swatchType}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        swatchType: e.target.value as typeof d.swatchType,
                      }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="accent">Accent</option>
                  </select>
                </div>
              </>
            )}

            {adding === "font" && (
              <>
                <div>
                  <Label className="text-xs">CSS font-family</Label>
                  <Input
                    value={draft.family}
                    onChange={(e) => setDraft((d) => ({ ...d, family: e.target.value }))}
                    placeholder="Inter, sans-serif"
                  />
                </div>
                <div>
                  <Label className="text-xs">Weights (comma-separated)</Label>
                  <Input
                    value={draft.weights}
                    onChange={(e) => setDraft((d) => ({ ...d, weights: e.target.value }))}
                    placeholder="400, 600, 800"
                  />
                </div>
              </>
            )}

            {(adding === "guideline" ||
              adding === "template" ||
              adding === "imagery") && (
              <div>
                <Label className="text-xs">URL</Label>
                <Input
                  value={draft.url}
                  onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                  placeholder="https://…"
                  className="font-mono text-xs"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button onClick={submit}>Add asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
