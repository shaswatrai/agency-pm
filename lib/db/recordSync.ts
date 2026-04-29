"use client";

/**
 * Generic per-slice dual-write helpers. Pattern follows taskSync.ts:
 * after the in-memory store mutates, fire-and-forget a Postgres mirror
 * if Connected mode is on. Failures toast a warning but don't block UX.
 *
 * Slices covered: clients, projects, phases, comments, time entries.
 * Tasks have their own taskSync.ts (added in chunk 1).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRuntimeConfig } from "@/lib/config/runtime";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type {
  Client,
  Comment,
  Phase,
  Project,
  Task,
  TimeEntry,
} from "@/types/domain";

function getClient(): SupabaseClient | null {
  const cfg = useRuntimeConfig.getState();
  if (!cfg.useSupabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
  return getSupabaseBrowser();
}

function warn(label: string, error: { message: string } | null | undefined) {
  if (error) toast.error(`${label}: ${error.message}`);
}

// ── Clients ────────────────────────────────────────────────────────────
export async function syncClientInsert(client: Client): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("clients").insert({
    id: client.id,
    organization_id: client.organizationId,
    code: client.code,
    name: client.name,
    industry: client.industry ?? null,
    primary_contact_name: client.primaryContactName ?? null,
    primary_contact_email: client.primaryContactEmail ?? null,
    currency: client.currency,
    contract_type: client.contractType,
    status: client.status,
    account_manager_id: client.accountManagerId ?? null,
    tags: client.tags,
    portal_enabled: client.portalEnabled,
  });
  warn("Client persist", error);
}

export async function syncClientUpdate(
  clientId: string,
  patch: Partial<Client>,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.industry !== undefined) dbPatch.industry = patch.industry;
  if (patch.primaryContactName !== undefined)
    dbPatch.primary_contact_name = patch.primaryContactName;
  if (patch.primaryContactEmail !== undefined)
    dbPatch.primary_contact_email = patch.primaryContactEmail;
  if (patch.currency !== undefined) dbPatch.currency = patch.currency;
  if (patch.contractType !== undefined)
    dbPatch.contract_type = patch.contractType;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.accountManagerId !== undefined)
    dbPatch.account_manager_id = patch.accountManagerId;
  if (patch.tags !== undefined) dbPatch.tags = patch.tags;
  if (patch.portalEnabled !== undefined)
    dbPatch.portal_enabled = patch.portalEnabled;
  if (Object.keys(dbPatch).length === 0) return;
  const { error } = await supabase
    .from("clients")
    .update(dbPatch)
    .eq("id", clientId);
  warn("Client update", error);
}

// ── Projects ───────────────────────────────────────────────────────────
export async function syncProjectInsert(project: Project): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("projects").insert({
    id: project.id,
    organization_id: project.organizationId,
    client_id: project.clientId,
    code: project.code,
    name: project.name,
    type: project.type,
    start_date: project.startDate ?? null,
    end_date: project.endDate ?? null,
    status: project.status,
    priority: project.priority,
    project_manager_id: project.projectManagerId ?? null,
    billing_model: project.billingModel,
    total_budget: project.totalBudget ?? null,
    estimated_hours: project.estimatedHours ?? null,
    description: project.description ?? null,
    health: project.health,
    tags: project.tags,
  });
  warn("Project persist", error);
}

export async function syncProjectUpdate(
  projectId: string,
  patch: Partial<Project>,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.startDate !== undefined) dbPatch.start_date = patch.startDate;
  if (patch.endDate !== undefined) dbPatch.end_date = patch.endDate;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.priority !== undefined) dbPatch.priority = patch.priority;
  if (patch.projectManagerId !== undefined)
    dbPatch.project_manager_id = patch.projectManagerId;
  if (patch.billingModel !== undefined)
    dbPatch.billing_model = patch.billingModel;
  if (patch.totalBudget !== undefined) dbPatch.total_budget = patch.totalBudget;
  if (patch.estimatedHours !== undefined)
    dbPatch.estimated_hours = patch.estimatedHours;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.health !== undefined) dbPatch.health = patch.health;
  if (patch.tags !== undefined) dbPatch.tags = patch.tags;
  if (Object.keys(dbPatch).length === 0) return;
  const { error } = await supabase
    .from("projects")
    .update(dbPatch)
    .eq("id", projectId);
  warn("Project update", error);
}

// ── Phases ─────────────────────────────────────────────────────────────
export async function syncPhasesInsert(
  phases: Phase[],
  organizationId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase || phases.length === 0) return;
  const { error } = await supabase.from("phases").insert(
    phases.map((p) => ({
      id: p.id,
      organization_id: organizationId,
      project_id: p.projectId,
      name: p.name,
      position: p.position,
      is_complete: p.isComplete,
    })),
  );
  warn("Phases persist", error);
}

// ── Comments ───────────────────────────────────────────────────────────
export async function syncCommentInsert(
  comment: Comment,
  organizationId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("comments").insert({
    id: comment.id,
    organization_id: organizationId,
    task_id: comment.taskId,
    parent_comment_id: comment.parentCommentId ?? null,
    author_id: comment.authorId,
    body: comment.body,
  });
  warn("Comment persist", error);
}

// ── Time entries ───────────────────────────────────────────────────────
export async function syncTimeEntryInsert(
  entry: TimeEntry,
  organizationId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("time_entries").insert({
    id: entry.id,
    organization_id: organizationId,
    task_id: entry.taskId,
    user_id: entry.userId,
    entry_date: entry.date,
    duration_minutes: entry.durationMinutes,
    description: entry.description,
    billable: entry.billable,
  });
  warn("Time entry persist", error);
}

// ── Tasks bulk insert (for quote→project conversion) ──────────────────
export async function syncTasksInsert(tasks: Task[]): Promise<void> {
  const supabase = getClient();
  if (!supabase || tasks.length === 0) return;
  const { error } = await supabase.from("tasks").insert(
    tasks.map((t) => ({
      id: t.id,
      organization_id: t.organizationId,
      project_id: t.projectId,
      phase_id: t.phaseId ?? null,
      code: t.code,
      title: t.title,
      description: t.description ?? null,
      status: t.status,
      priority: t.priority,
      task_type: t.taskType ?? null,
      due_date: t.dueDate ?? null,
      estimated_hours: t.estimatedHours ?? null,
      story_points: t.storyPoints ?? null,
      client_visible: t.clientVisible,
      position: t.position,
      tags: t.tags,
      figma_url: t.figmaUrl ?? null,
      repo_url: t.repoUrl ?? null,
      created_by: t.createdBy ?? null,
    })),
  );
  warn("Tasks persist", error);
}
