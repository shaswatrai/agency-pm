"use client";

/**
 * Supabase Storage uploads for project files.
 *
 * Bucket layout:   <bucket="project-files">/<orgId>/<projectId>/<fileId>-<sanitised>
 * One bucket holds all project files; RLS policies on the `files` table
 * gate visibility, and signed URLs gate downloads.
 */
import { useRuntimeConfig } from "@/lib/config/runtime";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useStore } from "@/lib/db/store";
import { logActivity } from "@/lib/db/activitySync";
import type { ProjectFile } from "@/types/domain";

const BUCKET = "project-files";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function sanitise(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

export interface UploadedFile {
  ok: boolean;
  message: string;
  file?: ProjectFile;
}

export async function uploadProjectFile(
  projectId: string,
  file: File,
  options: { taskId?: string; clientVisible?: boolean } = {},
): Promise<UploadedFile> {
  const cfg = useRuntimeConfig.getState();
  const orgId = useStore.getState().organization.id;
  const userId = useStore.getState().currentUserId;

  const fileId = uuid();
  const safeName = sanitise(file.name);
  const path = `${orgId}/${projectId}/${fileId}-${safeName}`;

  const newRecord: ProjectFile = {
    id: fileId,
    projectId,
    taskId: options.taskId,
    fileName: file.name,
    mimeType: file.type || undefined,
    sizeBytes: file.size,
    version: 1,
    uploadedBy: userId,
    clientVisible: options.clientVisible ?? false,
    createdAt: new Date().toISOString(),
    storagePath: cfg.useSupabase && cfg.supabaseUrl ? path : undefined,
  };

  // Always update the in-memory store so the UI is instant
  useStore.setState((state) => ({
    files: [...state.files, newRecord],
  }));

  void logActivity({
    entityType: "file",
    entityId: fileId,
    action: "uploaded",
    metadata: {
      projectId,
      taskId: options.taskId,
      fileName: file.name,
      sizeBytes: file.size,
    },
  });

  // If not Connected, we're done — file is in memory only.
  if (!cfg.useSupabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    return {
      ok: true,
      message: "Saved (demo mode — file is in-memory only)",
      file: newRecord,
    };
  }

  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { ok: false, message: "Supabase client unavailable" };
  }

  // 1. Upload bytes to Storage
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
  if (uploadErr) {
    return { ok: false, message: `Storage: ${uploadErr.message}`, file: newRecord };
  }

  // 2. Insert metadata row
  const { error: insertErr } = await supabase.from("files").insert({
    id: fileId,
    organization_id: orgId,
    project_id: projectId,
    task_id: options.taskId ?? null,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    version: 1,
    uploaded_by: userId,
    client_visible: options.clientVisible ?? false,
  });
  if (insertErr) {
    return {
      ok: false,
      message: `files row: ${insertErr.message}`,
      file: newRecord,
    };
  }

  return { ok: true, message: "Uploaded", file: newRecord };
}

/**
 * Returns a 60-minute signed URL for a stored file.
 */
export async function getSignedDownloadUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Hydration: pull the org's file rows from Postgres. */
export async function hydrateFiles(): Promise<void> {
  const cfg = useRuntimeConfig.getState();
  if (!cfg.useSupabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  const orgId = useStore.getState().organization.id;
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error || !data) return;
  const files: ProjectFile[] = data.map((row) => ({
    id: row.id as string,
    projectId: row.project_id as string,
    taskId: (row.task_id as string | null) ?? undefined,
    fileName: row.file_name as string,
    mimeType: (row.mime_type as string | null) ?? undefined,
    sizeBytes: row.size_bytes as number,
    version: row.version as number,
    uploadedBy: (row.uploaded_by as string | null) ?? undefined,
    clientVisible: row.client_visible as boolean,
    createdAt: row.created_at as string,
    storagePath: row.storage_path as string,
  }));
  useStore.setState({ files });
}
