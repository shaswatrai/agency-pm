"use client";

import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { File, FileImage, FileVideo, FileText, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/db/store";
import { UserAvatar } from "@/components/UserAvatar";
import { EmptyState } from "@/components/EmptyState";

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
        <Button>
          <Upload className="size-4" /> Upload
        </Button>
      </motion.div>

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
            {files.map((f) => {
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
                    <Button variant="ghost" size="icon" aria-label="Download">
                      <Download className="size-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {files.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState
                    icon={Upload}
                    title="No files yet"
                    description="Drop files anywhere on this page or click Upload to add the first one."
                    variant="inline"
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
