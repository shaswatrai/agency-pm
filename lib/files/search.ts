import type { ProjectFile } from "@/types/domain";

/**
 * Full-text file search (PRD §5.7). Matches across:
 *   - file name
 *   - mime type
 *   - extracted OCR text (when populated)
 *   - uploader id (lets PMs filter by team member)
 *
 * Real mode swaps in Postgres FTS via to_tsvector; demo mode is in-memory.
 */

export interface FileSearchOptions {
  query?: string;
  projectId?: string;
  uploadedBy?: string;
  mimeContains?: string;
  /** Min/max date — ISO strings. */
  from?: string;
  to?: string;
  /** Only client-visible files. */
  clientVisibleOnly?: boolean;
}

export interface FileSearchHit {
  file: ProjectFile;
  matchScore: number;
  /** Highlighted snippet from OCR text when query hit it. */
  snippet?: string;
}

export function searchFiles(
  files: ProjectFile[],
  opts: FileSearchOptions,
): FileSearchHit[] {
  const q = opts.query?.toLowerCase().trim() ?? "";
  const hits: FileSearchHit[] = [];

  for (const f of files) {
    if (opts.projectId && f.projectId !== opts.projectId) continue;
    if (opts.uploadedBy && f.uploadedBy !== opts.uploadedBy) continue;
    if (opts.mimeContains && !f.mimeType?.includes(opts.mimeContains)) continue;
    if (opts.from && f.createdAt < opts.from) continue;
    if (opts.to && f.createdAt > opts.to) continue;
    if (opts.clientVisibleOnly && !f.clientVisible) continue;

    if (!q) {
      hits.push({ file: f, matchScore: 1 });
      continue;
    }

    let score = 0;
    let snippet: string | undefined;

    if (f.fileName.toLowerCase().includes(q)) score += 5;
    if (f.mimeType?.toLowerCase().includes(q)) score += 1;
    const text = f.extractedText?.toLowerCase();
    if (text && text.includes(q)) {
      score += 3;
      const idx = text.indexOf(q);
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + q.length + 60);
      snippet =
        (start > 0 ? "…" : "") +
        f.extractedText!.slice(start, end) +
        (end < text.length ? "…" : "");
    }

    if (score > 0) hits.push({ file: f, matchScore: score, snippet });
  }

  return hits.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Total bytes used across files (for quota indicators).
 */
export function totalStorageUsed(files: ProjectFile[]): number {
  return files.reduce((s, f) => s + f.sizeBytes, 0);
}

/**
 * Per-project breakdown for the storage panel.
 */
export function storageByProject(
  files: ProjectFile[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of files) {
    out[f.projectId] = (out[f.projectId] ?? 0) + f.sizeBytes;
  }
  return out;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}
