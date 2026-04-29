"use client";

/**
 * Best-effort dual-write of task mutations to Supabase.
 *
 * Components keep calling the existing Zustand actions (addTask /
 * updateTask / removeTask) for instant UI. After each call we mirror
 * the mutation to Postgres if Connected mode is on. Failures toast a
 * warning but don't block the UX.
 *
 * This is the first slice. Subsequent passes generalize the pattern to
 * projects / clients / comments / time entries / etc.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRuntimeConfig } from "@/lib/config/runtime";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Task } from "@/types/domain";

function shouldSync(): SupabaseClient | null {
  const cfg = useRuntimeConfig.getState();
  if (!cfg.useSupabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
  return getSupabaseBrowser();
}

export async function syncTaskInsert(task: Task): Promise<void> {
  const supabase = shouldSync();
  if (!supabase) return;
  const { error } = await supabase.from("tasks").insert({
    id: task.id,
    organization_id: task.organizationId,
    project_id: task.projectId,
    phase_id: task.phaseId ?? null,
    code: task.code,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    task_type: task.taskType ?? null,
    due_date: task.dueDate ?? null,
    estimated_hours: task.estimatedHours ?? null,
    story_points: task.storyPoints ?? null,
    client_visible: task.clientVisible,
    position: task.position,
    tags: task.tags,
    figma_url: task.figmaUrl ?? null,
    repo_url: task.repoUrl ?? null,
    created_by: task.createdBy ?? null,
  });
  if (error) {
    toast.error(`Couldn't persist task: ${error.message}`);
  }
}

export async function syncTaskUpdate(
  taskId: string,
  patch: Partial<Task>,
): Promise<void> {
  const supabase = shouldSync();
  if (!supabase) return;
  // Convert camelCase patch keys to snake_case where they differ.
  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.priority !== undefined) dbPatch.priority = patch.priority;
  if (patch.taskType !== undefined) dbPatch.task_type = patch.taskType;
  if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate;
  if (patch.estimatedHours !== undefined)
    dbPatch.estimated_hours = patch.estimatedHours;
  if (patch.storyPoints !== undefined)
    dbPatch.story_points = patch.storyPoints;
  if (patch.clientVisible !== undefined)
    dbPatch.client_visible = patch.clientVisible;
  if (patch.position !== undefined) dbPatch.position = patch.position;
  if (patch.tags !== undefined) dbPatch.tags = patch.tags;
  if (patch.figmaUrl !== undefined) dbPatch.figma_url = patch.figmaUrl;
  if (patch.repoUrl !== undefined) dbPatch.repo_url = patch.repoUrl;
  if (patch.phaseId !== undefined) dbPatch.phase_id = patch.phaseId;

  if (Object.keys(dbPatch).length === 0) return; // nothing to sync (e.g. only subtasks changed)

  const { error } = await supabase
    .from("tasks")
    .update(dbPatch)
    .eq("id", taskId);
  if (error) toast.error(`Couldn't update task: ${error.message}`);

  // If assignees changed, mirror task_assignees rows
  if (patch.assigneeIds !== undefined) {
    await supabase.from("task_assignees").delete().eq("task_id", taskId);
    if (patch.assigneeIds.length > 0) {
      await supabase
        .from("task_assignees")
        .insert(
          patch.assigneeIds.map((uid) => ({
            task_id: taskId,
            user_id: uid,
          })),
        );
    }
  }
}

export async function syncTaskDelete(taskId: string): Promise<void> {
  const supabase = shouldSync();
  if (!supabase) return;
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) toast.error(`Couldn't delete task: ${error.message}`);
}
