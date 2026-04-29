"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  RefreshCw,
  Code2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Camera,
  ThumbsUp,
  ThumbsDown,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/db/store";
import { useIntegrationsStore } from "@/lib/integrations/store";
import { parseFigmaUrl, buildFigmaUrl } from "@/lib/integrations/providers/figma/client";
import { devModeUrlFor } from "@/lib/integrations/providers/figma/sync";
import type { IntegrationLink, Task } from "@/types/domain";
import { toast } from "sonner";

interface Props {
  task: Task;
}

interface ThumbnailResponse {
  ok: boolean;
  url?: string;
  fetchedAt: string;
  fromCache: boolean;
  message?: string;
}

/**
 * The deep-Figma block on a task: paste a URL, see a live thumbnail,
 * jump to dev mode, or approve / request revisions which mirrors back
 * to Figma as a comment and triggers a milestone version snapshot.
 */
export function FigmaFrameLink({ task }: Props) {
  const orgId = useStore((s) => s.organization.id);
  const meId = useStore((s) => s.currentUserId);
  const moveTask = useStore((s) => s.moveTask);
  const updateTask = useStore((s) => s.updateTask);

  const credentials = useIntegrationsStore((s) => s.credentials);
  const links = useIntegrationsStore((s) => s.links);
  const addLink = useIntegrationsStore((s) => s.addLink);
  const removeLink = useIntegrationsStore((s) => s.removeLink);
  const readSecret = useIntegrationsStore((s) => s.readSecret);

  const figmaCred = useMemo(
    () => credentials.find((c) => c.organizationId === orgId && c.provider === "figma"),
    [credentials, orgId],
  );
  const figmaLinks = useMemo(
    () => links.filter((l) => l.entityType === "task" && l.entityId === task.id && l.provider === "figma"),
    [links, task.id],
  );

  const [pasteUrl, setPasteUrl] = useState("");

  function attach() {
    const ref = parseFigmaUrl(pasteUrl);
    if (!ref) {
      toast.error("Couldn't parse Figma URL");
      return;
    }
    const externalId = ref.nodeId ? `${ref.fileKey}:${ref.nodeId}` : ref.fileKey;
    addLink({
      organizationId: orgId,
      provider: "figma",
      entityType: "task",
      entityId: task.id,
      externalKind: ref.nodeId ? "figma_frame" : "figma_file",
      externalId,
      externalUrl: buildFigmaUrl(ref),
      metadata: { file_key: ref.fileKey, node_id: ref.nodeId },
      createdBy: meId,
    });
    if (!task.figmaUrl) {
      updateTask(task.id, { figmaUrl: buildFigmaUrl(ref) });
    }
    toast.success(ref.nodeId ? "Frame attached" : "File attached");
    setPasteUrl("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <ImageIcon className="size-3" />
        Figma frames
        {!figmaCred && (
          <span className="ml-auto text-[10px] font-normal normal-case text-muted-foreground/70">
            Settings → Integrations to connect
          </span>
        )}
      </div>

      {figmaLinks.map((link) => (
        <FigmaFrameCard
          key={link.id}
          link={link}
          task={task}
          fileKey={(link.metadata as { file_key?: string }).file_key ?? link.externalId}
          token={figmaCred ? readSecret(figmaCred.vaultSecretId) : null}
          onApproveOrRevise={(action, comment) => {
            const next = action === "approve" ? "done" : "revisions";
            moveTask(task.id, next, task.position);
            if (comment && figmaCred) {
              const fileKey =
                (link.metadata as { file_key?: string }).file_key ??
                link.externalId.split(":")[0];
              const secret = readSecret(figmaCred.vaultSecretId);
              if (fileKey && secret) {
                void fetch("/api/integrations/figma/comment", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    fileKey,
                    secret,
                    message: comment,
                    nodeId: (link.metadata as { node_id?: string }).node_id,
                  }),
                }).then(() =>
                  toast.success(
                    action === "approve" ? "Approved + comment posted" : "Revisions requested",
                  ),
                );
              }
            }
          }}
          onRemove={() => {
            removeLink(link.id);
            toast.success("Frame unlinked");
          }}
        />
      ))}

      {/* Legacy figmaUrl field — auto-upgrade prompt */}
      {task.figmaUrl && figmaLinks.length === 0 && (
        <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Stored URL: <span className="font-mono">{task.figmaUrl}</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPasteUrl(task.figmaUrl ?? "");
                queueMicrotask(() => attach());
              }}
            >
              <Plus className="mr-1 size-3" />
              Activate
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Paste Figma frame URL…"
          value={pasteUrl}
          onChange={(e) => setPasteUrl(e.target.value)}
          className="font-mono text-xs"
        />
        <Button size="sm" onClick={attach} disabled={!pasteUrl.trim()}>
          <Plus className="mr-1 size-3.5" />
          Attach
        </Button>
      </div>
    </div>
  );
}

function FigmaFrameCard({
  link,
  task,
  fileKey,
  token,
  onApproveOrRevise,
  onRemove,
}: {
  link: IntegrationLink;
  task: Task;
  fileKey: string;
  token: string | null;
  onApproveOrRevise: (action: "approve" | "revise", comment?: string) => void;
  onRemove: () => void;
}) {
  const [thumb, setThumb] = useState<ThumbnailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [snapshotResult, setSnapshotResult] = useState<{
    versionId?: string;
    capturedAt: string;
    message?: string;
  } | null>(null);
  const [composing, setComposing] = useState<"approve" | "revise" | null>(null);
  const [composeText, setComposeText] = useState("");

  const devModeUrl = devModeUrlFor(link);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/figma/thumbnail", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ link, secret: token }),
      });
      const json = (await res.json()) as ThumbnailResponse;
      setThumb(json);
    } catch (err) {
      setThumb({
        ok: false,
        fetchedAt: new Date().toISOString(),
        fromCache: false,
        message: err instanceof Error ? err.message : "fetch failed",
      });
    } finally {
      setLoading(false);
    }
  }

  async function snapshot() {
    setSnapshotting(true);
    try {
      const res = await fetch("/api/integrations/figma/versions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          link,
          secret: token,
          reason: `Snapshot from task ${task.code} (${task.status})`,
        }),
      });
      const json = await res.json();
      setSnapshotResult(json);
      if (json.ok) toast.success(`Version ${json.versionId ?? "captured"}`);
    } finally {
      setSnapshotting(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link.id]);

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="relative aspect-video w-full bg-muted">
        {thumb?.ok && thumb.url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={thumb.url} alt="Figma preview" className="h-full w-full object-contain" />
        ) : loading ? (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2 text-center">
              <ImageIcon className="size-6" />
              <p className="max-w-[260px] text-xs">
                {thumb?.message ?? "No preview available"}
              </p>
              {!token && (
                <p className="text-[11px] text-amber-600">
                  Connect Figma in Settings to load live previews
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {fileKey}
            {(link.metadata as { node_id?: string }).node_id
              ? ` · ${(link.metadata as { node_id?: string }).node_id}`
              : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void refresh()}
              disabled={loading}
              title="Refresh thumbnail"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <a
              href={link.externalUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium hover:bg-accent"
            >
              <ExternalLink className="size-3" /> Open
            </a>
            {devModeUrl && (
              <a
                href={devModeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/15"
                title="Opens Figma Dev Mode for handoff"
              >
                <Code2 className="size-3" /> Dev mode
              </a>
            )}
          </div>
        </div>

        {composing === null ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
              onClick={() => {
                setComposing("approve");
                setComposeText(`Approved · ${task.code}`);
              }}
            >
              <ThumbsUp className="mr-1.5 size-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
              onClick={() => {
                setComposing("revise");
                setComposeText("");
              }}
            >
              <ThumbsDown className="mr-1.5 size-3.5" />
              Request changes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void snapshot()}
              disabled={snapshotting}
              title="Capture current Figma version"
            >
              <Camera className="size-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onRemove} title="Unlink">
              <AlertCircle className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              rows={3}
              placeholder={
                composing === "approve"
                  ? "Optional approval note (will be posted to Figma)"
                  : "What needs to change?"
              }
              className="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setComposing(null);
                  setComposeText("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={composing === "revise" && !composeText.trim()}
                onClick={() => {
                  onApproveOrRevise(composing!, composeText.trim() || undefined);
                  setComposing(null);
                  setComposeText("");
                }}
              >
                {composing === "approve" ? (
                  <>
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                    Confirm approval
                  </>
                ) : (
                  <>
                    <AlertCircle className="mr-1.5 size-3.5" />
                    Send revision request
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {snapshotResult && (
          <div className="flex items-center gap-1.5 rounded border bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground">
            <Camera className="size-3" />
            Snapshot: {snapshotResult.versionId ?? "—"}
            {snapshotResult.message ? ` · ${snapshotResult.message}` : ""}
          </div>
        )}

        {thumb && !thumb.ok && (
          <div className="rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[10px] text-amber-700 dark:text-amber-400">
            {thumb.message}
          </div>
        )}
      </div>
    </div>
  );
}
