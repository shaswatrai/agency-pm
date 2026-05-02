"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  File,
  FileImage,
  FileVideo,
  FileText,
  Upload,
  Download,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchFiles } from "@/lib/files/search";
import { StorageQuotaPanel } from "@/components/files/StorageQuotaPanel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/db/store";
import { UserAvatar } from "@/components/UserAvatar";
import { EmptyState } from "@/components/EmptyState";
import {
  uploadProjectFile,
  getSignedDownloadUrl,
} from "@/lib/db/fileSync";
import { useRuntimeConfig } from "@/lib/config/runtime";
import { toast } from "sonner";

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function iconFor(mime?: string) {
  if (!mime) return File;
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.includes("pdf") || mime.startsWith("text/")) return FileText;
  return File;
}

export default function FilesPage() {
  const files = useStore((s) => s.files);
  const projects = useStore((s) => s.projects);
  const users = useStore((s) => s.users);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [filterProject, setFilterProject] = useState<string>("");
  const [filterMime, setFilterMime] = useState<string>("");
  const cfg = useRuntimeConfig();
  const connected = cfg.useSupabase && cfg.supabaseUrl && cfg.supabaseAnonKey;

  const hits = useMemo(
    () =>
      searchFiles(files, {
        query: query.trim() || undefined,
        projectId: filterProject || undefined,
        mimeContains: filterMime || undefined,
      }),
    [files, query, filterProject, filterMime],
  );

  // Project options sorted with active projects first
  const projectOptions = [...projects].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    return a.name.localeCompare(b.name);
  });

  const openChooser = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    if (projects.length === 0) {
      toast.error("Create a project first to attach files");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setPendingFiles(Array.from(fileList));
    const defaultProject =
      projectOptions.find((p) => p.status === "active") ?? projectOptions[0];
    setPendingProjectId(defaultProject?.id ?? "");
  };

  const closeChooser = () => {
    setPendingFiles(null);
    setPendingProjectId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmUpload = async () => {
    if (!pendingFiles || !pendingProjectId) return;
    const targetProject = projects.find((p) => p.id === pendingProjectId);
    if (!targetProject) {
      toast.error("Pick a project to attach to");
      return;
    }
    setUploading(true);
    let okCount = 0;
    let firstError: string | null = null;
    for (const file of pendingFiles) {
      const result = await uploadProjectFile(targetProject.id, file);
      if (result.ok) okCount++;
      else if (!firstError) firstError = result.message;
    }
    setUploading(false);
    closeChooser();
    if (firstError) {
      toast.error(firstError);
    } else {
      toast.success(
        `Uploaded ${okCount} file${okCount === 1 ? "" : "s"} to ${targetProject.name}`,
        connected
          ? undefined
          : { description: "Demo mode — file is in-memory only" },
      );
    }
  };

  const handleDownload = async (storagePath: string | undefined, fileName: string) => {
    if (!storagePath) {
      toast.info("Demo file — no real bytes to download");
      return;
    }
    const url = await getSignedDownloadUrl(storagePath);
    if (!url) {
      toast.error("Couldn't generate signed URL");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Files
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All deliverables across your projects
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={openChooser}
          className="hidden"
        />
      </motion.div>

      {/* Search + filters */}
      <div className="mb-4 grid gap-2 md:grid-cols-[1fr_180px_140px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search file names + OCR text…"
            className="pl-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-accent"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All projects</option>
          {projectOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={filterMime}
          onChange={(e) => setFilterMime(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All types</option>
          <option value="image/">Images</option>
          <option value="video/">Videos</option>
          <option value="pdf">PDFs</option>
          <option value="text/">Text</option>
        </select>
        <span className="grid h-9 place-items-center rounded-md bg-muted px-3 text-xs text-muted-foreground">
          {hits.length} of {files.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/40">
            <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Project</th>
              <th className="px-4 py-2">Uploaded by</th>
              <th className="px-4 py-2">Size</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2 text-right">Version</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {hits.map(({ file: f, snippet }) => {
              const project = projects.find((p) => p.id === f.projectId);
              const user = users.find((u) => u.id === f.uploadedBy);
              const Icon = iconFor(f.mimeType);
              return (
                <tr key={f.id} className="transition-colors hover:bg-accent">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{f.fileName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {f.mimeType ?? "—"}
                        </p>
                        {snippet && (
                          <p className="mt-1 max-w-md rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            …{snippet}…
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {project?.name}
                  </td>
                  <td className="px-4 py-3">
                    {user ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          user={{
                            name: user.fullName,
                            avatarUrl: user.avatarUrl,
                          }}
                          size="xs"
                        />
                        <span className="text-xs">{user.fullName}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {bytes(f.sizeBytes)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {format(parseISO(f.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px] font-medium">
                      v{f.version}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Download"
                      onClick={() => handleDownload(f.storagePath, f.fileName)}
                    >
                      <Download className="size-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {hits.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState
                    icon={Upload}
                    title={
                      files.length === 0
                        ? "No files yet"
                        : "No files match the search"
                    }
                    description={
                      files.length === 0
                        ? "Drop files anywhere on this page or click Upload to add the first one."
                        : "Try clearing the filters or using a different keyword."
                    }
                    variant="inline"
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <StorageQuotaPanel />
      </div>

      {/* Per-upload project chooser */}
      <Dialog
        open={pendingFiles !== null}
        onOpenChange={(open) => {
          if (!open && !uploading) closeChooser();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attach to project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {pendingFiles && pendingFiles.length > 0 ? (
              <div className="rounded-md border bg-muted/40 p-3 text-xs">
                <p className="font-medium">
                  {pendingFiles.length} file
                  {pendingFiles.length === 1 ? "" : "s"} ready to upload
                </p>
                <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
                  {pendingFiles.slice(0, 4).map((f) => (
                    <li key={f.name} className="truncate">
                      • {f.name} ({bytes(f.size)})
                    </li>
                  ))}
                  {pendingFiles.length > 4 ? (
                    <li>… and {pendingFiles.length - 4} more</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
            <div>
              <Label
                htmlFor="upload-project"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                Project
              </Label>
              <select
                id="upload-project"
                value={pendingProjectId}
                onChange={(e) => setPendingProjectId(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={uploading}
              >
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.status !== "active" ? `(${p.status})` : ""}
                  </option>
                ))}
              </select>
              {!connected ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Demo mode — files stay in memory until you connect Supabase.
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeChooser}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUpload}
              disabled={uploading || !pendingProjectId}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
