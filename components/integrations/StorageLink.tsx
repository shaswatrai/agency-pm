"use client";

import { useMemo, useState } from "react";
import {
  Cloud,
  FileText,
  FileSpreadsheet,
  Folder,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/db/store";
import { useIntegrationsStore } from "@/lib/integrations/store";
import { parseDriveUrl } from "@/lib/integrations/providers/google_drive/client";
import { parseDropboxUrl } from "@/lib/integrations/providers/dropbox/client";
import { parseOneDriveUrl } from "@/lib/integrations/providers/onedrive/client";
import type {
  IntegrationLinkEntityType,
  IntegrationProviderKind,
} from "@/types/domain";
import { toast } from "sonner";

interface Props {
  entityType: IntegrationLinkEntityType;
  entityId: string;
}

const KIND_ICON: Record<string, typeof FileText> = {
  doc: FileText,
  sheet: FileSpreadsheet,
  slide: FileText,
  form: FileText,
  file: FileText,
  folder: Folder,
};

/**
 * Multi-provider storage links for any entity (task, project, client).
 * Auto-detects Google Drive / Dropbox / OneDrive / SharePoint URLs and
 * normalizes them as integration_link rows.
 */
export function StorageLink({ entityType, entityId }: Props) {
  const orgId = useStore((s) => s.organization.id);
  const meId = useStore((s) => s.currentUserId);
  const links = useIntegrationsStore((s) => s.links);
  const addLink = useIntegrationsStore((s) => s.addLink);
  const removeLink = useIntegrationsStore((s) => s.removeLink);

  const storageLinks = useMemo(
    () =>
      links.filter(
        (l) =>
          l.entityType === entityType &&
          l.entityId === entityId &&
          (
            ["google_drive", "dropbox", "onedrive", "sharepoint"] as IntegrationProviderKind[]
          ).includes(l.provider),
      ),
    [links, entityType, entityId],
  );

  const [pasteUrl, setPasteUrl] = useState("");

  function attach() {
    const trimmed = pasteUrl.trim();
    if (!trimmed) return;

    const drive = parseDriveUrl(trimmed);
    if (drive) {
      addLink({
        organizationId: orgId,
        provider: "google_drive",
        entityType,
        entityId,
        externalKind: `drive_${drive.kind}`,
        externalId: drive.id,
        externalUrl: trimmed,
        metadata: { kind: drive.kind, id: drive.id },
        createdBy: meId,
      });
      toast.success(`Drive ${drive.kind} linked`);
      setPasteUrl("");
      return;
    }

    const dbx = parseDropboxUrl(trimmed);
    if (dbx) {
      addLink({
        organizationId: orgId,
        provider: "dropbox",
        entityType,
        entityId,
        externalKind: `dropbox_${dbx.kind}`,
        externalId: dbx.sharedKey,
        externalUrl: trimmed,
        metadata: { kind: dbx.kind, sharedKey: dbx.sharedKey },
        createdBy: meId,
      });
      toast.success(`Dropbox ${dbx.kind} linked`);
      setPasteUrl("");
      return;
    }

    const od = parseOneDriveUrl(trimmed);
    if (od) {
      addLink({
        organizationId: orgId,
        provider: trimmed.includes("sharepoint.com") ? "sharepoint" : "onedrive",
        entityType,
        entityId,
        externalKind: `${od.kind}`,
        externalId: trimmed,
        externalUrl: trimmed,
        metadata: { kind: od.kind },
        createdBy: meId,
      });
      toast.success("OneDrive/SharePoint link added");
      setPasteUrl("");
      return;
    }

    toast.error("Couldn't parse — paste a Drive, Dropbox, OneDrive, or SharePoint URL");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Cloud className="size-3" />
        Cloud storage
      </div>

      {storageLinks.map((link) => {
        const m = link.metadata as { kind?: string };
        const Icon = KIND_ICON[m.kind ?? "file"] ?? FileText;
        return (
          <div
            key={link.id}
            className="flex items-center gap-2 rounded-md border bg-card px-3 py-2"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{link.externalId}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {link.provider} · {m.kind ?? "file"}
              </p>
            </div>
            <a
              href={link.externalUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium hover:bg-accent"
            >
              <ExternalLink className="size-3" /> Open
            </a>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                removeLink(link.id);
                toast.success("Unlinked");
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        );
      })}

      <div className="flex gap-2">
        <Input
          placeholder="Paste Drive / Dropbox / OneDrive URL…"
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
