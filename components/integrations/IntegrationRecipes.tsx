"use client";

import { useState } from "react";
import { Sparkles, Link2, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/db/store";
import { useIntegrationsStore } from "@/lib/integrations/store";
import { RECIPES, type IntegrationRecipe } from "@/lib/integrations/recipes";
import { ProviderIcon } from "./ProviderIcon";
import { toast } from "sonner";

/**
 * One-click recipes: pre-built webhook subscriptions for QuickBooks /
 * Xero / FreshBooks / Zapier / Make. The recipe declares which events
 * to subscribe to; the user only needs to paste their target URL and
 * a signing secret.
 */
export function IntegrationRecipes() {
  const [active, setActive] = useState<IntegrationRecipe | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-primary" />
        <p className="text-sm font-medium">One-click recipes</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Pre-configured event subscriptions for the most common downstream
        systems. Each recipe creates a signed outbound webhook subscription
        with the right event filter for the target tool.
      </p>

      <div className="grid gap-2 md:grid-cols-2">
        {RECIPES.map((recipe) => (
          <button
            key={recipe.id}
            onClick={() => setActive(recipe)}
            className="group flex items-start gap-3 rounded-md border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
          >
            <ProviderIcon kind={recipe.provider} className="size-9 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{recipe.displayName}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                {recipe.description}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {recipe.events.slice(0, 3).map((e) => (
                  <span
                    key={e}
                    className="rounded-pill bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                  >
                    {e}
                  </span>
                ))}
                {recipe.events.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{recipe.events.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <ApplyRecipeDialog
        recipe={active}
        onClose={() => setActive(null)}
      />
    </div>
  );
}

function ApplyRecipeDialog({
  recipe,
  onClose,
}: {
  recipe: IntegrationRecipe | null;
  onClose: () => void;
}) {
  const orgId = useStore((s) => s.organization.id);
  const meId = useStore((s) => s.currentUserId);
  const createSub = useIntegrationsStore((s) => s.createSubscription);

  const [targetUrl, setTargetUrl] = useState("");
  const [secret, setSecret] = useState("");

  if (!recipe) return null;

  function handleApply() {
    if (!recipe) return;
    if (!targetUrl.trim() || !secret.trim()) {
      toast.error("URL and secret required");
      return;
    }
    createSub({
      organizationId: orgId,
      createdBy: meId,
      name: recipe.displayName,
      description: recipe.description,
      targetUrl: targetUrl.trim(),
      secret: secret.trim(),
      eventFilter: recipe.events,
    });
    toast.success(`${recipe.displayName} subscribed`);
    setTargetUrl("");
    setSecret("");
    onClose();
  }

  return (
    <Dialog open={recipe !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ProviderIcon kind={recipe.provider} className="size-7 rounded-md" />
            {recipe.displayName}
          </DialogTitle>
          <DialogDescription>{recipe.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              This recipe subscribes to {recipe.events.length} events
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {recipe.events.map((e) => (
                <span
                  key={e}
                  className="rounded-pill bg-background px-1.5 py-0.5 font-mono text-[10px]"
                >
                  {e}
                </span>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Target URL</Label>
            <Input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder={recipe.targetUrlPlaceholder}
              className="font-mono text-xs"
            />
          </div>

          <div>
            <Label className="text-xs">Signing secret</Label>
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="any random ≥ 32 char string"
              className="font-mono text-xs"
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Used to HMAC-sign every delivery so {recipe.displayName} can verify it came from Atelier.
            </p>
          </div>

          {recipe.documentationUrl && (
            <a
              href={recipe.documentationUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              How to set up the receiver
              <ExternalLink className="size-3" />
            </a>
          )}

          <details className="rounded-md border">
            <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Sample payload
            </summary>
            <pre className="overflow-auto border-t px-3 py-2 font-mono text-[10px]">
              {JSON.stringify(recipe.samplePayload, null, 2)}
            </pre>
          </details>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            <Link2 className="mr-1.5 size-3.5" />
            Subscribe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
