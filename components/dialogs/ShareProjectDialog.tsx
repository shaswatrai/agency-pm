"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Copy,
  Eye,
  Globe,
  Link as LinkIcon,
  Lock,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ShareProjectDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Generate a stable share token derived from the project id (so the same
// project produces the same URL across reloads in this demo).
function tokenFor(projectId: string) {
  let hash = 0;
  for (const char of projectId) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return `s_${Math.abs(hash).toString(36)}_${projectId.slice(-4)}`;
}

export function ShareProjectDialog({
  projectId,
  open,
  onOpenChange,
}: ShareProjectDialogProps) {
  const project = useStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );

  const [publicEnabled, setPublicEnabled] = useState(true);
  const [allowComments, setAllowComments] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tokenSeed, setTokenSeed] = useState(0);

  const token = useMemo(
    () => tokenFor(projectId) + (tokenSeed ? `_${tokenSeed}` : ""),
    [projectId, tokenSeed],
  );

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${token}`
      : `https://atelier.app/share/${token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — long-press the URL to copy manually");
    }
  };

  const regenerate = () => {
    setTokenSeed((n) => n + 1);
    toast.info("Old link revoked, new link generated");
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="border-b bg-gradient-to-br from-primary/5 to-transparent px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
              <LinkIcon className="size-4" />
            </span>
            Share project
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Give external stakeholders a read-only view of{" "}
            {project?.name ?? "this project"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-md border bg-card p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "grid size-9 place-items-center rounded-md transition-colors",
                    publicEnabled
                      ? "bg-status-done/15 text-status-done"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {publicEnabled ? (
                    <Globe className="size-4" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {publicEnabled ? "Anyone with the link" : "Link disabled"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {publicEnabled
                      ? "Read-only access to the project overview"
                      : "Only team members can view"}
                  </p>
                </div>
              </div>
              <Switch
                checked={publicEnabled}
                onCheckedChange={setPublicEnabled}
              />
            </div>
          </div>

          <AnimatePresence>
            {publicEnabled ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                  <span className="truncate font-mono text-xs">{url}</span>
                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={regenerate}
                      title="Regenerate link"
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                    <Button size="sm" onClick={copy} className="min-w-[90px]">
                      {copied ? (
                        <>
                          <Check className="size-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" /> Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md border bg-card px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-2">
                      <Eye className="size-4 text-muted-foreground" />
                      <span>Allow comments</span>
                    </span>
                    <Switch
                      checked={allowComments}
                      onCheckedChange={setAllowComments}
                    />
                  </label>
                  <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-2">
                      <Lock className="size-4 text-muted-foreground" />
                      <span>Hide budget</span>
                    </span>
                    <Switch defaultChecked />
                  </div>
                </div>

                <div className="rounded-md border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground">
                  <p className="font-medium text-foreground">What viewers see</p>
                  <p className="mt-1">
                    Project name, description, status, phases, public tasks,
                    progress, and target dates. Internal team rates, time logs,
                    and unannounced tasks stay hidden.
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
