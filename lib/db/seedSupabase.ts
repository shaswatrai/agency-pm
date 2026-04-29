"use client";

/**
 * Seed demo data into a freshly-created Supabase org.
 *
 * Uses the user's authenticated session. RLS allows org members to
 * insert into their own organization_id, so this works for the
 * super_admin who just created the org.
 *
 * Only seeds the slices currently in the migration:
 *   organizations / profiles / organization_members → handled by signup
 *   clients / projects / phases / tasks / task_assignees / time_entries
 *   comments / files / activity_log
 *
 * Other slices (quotes, invoices, automations, etc.) live only in the
 * in-memory store today; they get added to the migration in a follow-up.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLIENTS,
  PROJECTS,
  PHASES,
  TASKS,
  COMMENTS,
  TIME_ENTRIES,
} from "@/lib/db/seed";

const ID_PREFIX_LEN = 8; // map "p_lumiere_site" → unique uuid via Math.random; we store originals as natural keys via codes

function newId() {
  return crypto.randomUUID();
}

export async function seedDemoIntoOrg(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
) {
  // ── Clients ───────────────────────────────────────────────────────────
  const clientIdMap = new Map<string, string>();
  const clientRows = CLIENTS.map((c) => {
    const id = newId();
    clientIdMap.set(c.id, id);
    return {
      id,
      organization_id: orgId,
      code: c.code,
      name: c.name,
      industry: c.industry ?? null,
      primary_contact_name: c.primaryContactName ?? null,
      primary_contact_email: c.primaryContactEmail ?? null,
      currency: c.currency,
      contract_type: c.contractType,
      status: c.status,
      account_manager_id: null, // we'll set this for the current user later
      tags: c.tags,
      portal_enabled: c.portalEnabled,
    };
  });
  const { error: clientErr } = await supabase.from("clients").insert(clientRows);
  if (clientErr) throw new Error(`clients: ${clientErr.message}`);

  // ── Projects ──────────────────────────────────────────────────────────
  const projectIdMap = new Map<string, string>();
  const projectRows = PROJECTS.map((p) => {
    const id = newId();
    projectIdMap.set(p.id, id);
    return {
      id,
      organization_id: orgId,
      client_id: clientIdMap.get(p.clientId)!,
      code: p.code,
      name: p.name,
      type: p.type,
      start_date: p.startDate ?? null,
      end_date: p.endDate ?? null,
      status: p.status,
      priority: p.priority,
      project_manager_id: userId, // current user is PM for all seeded projects
      billing_model: p.billingModel,
      total_budget: p.totalBudget ?? null,
      estimated_hours: p.estimatedHours ?? null,
      description: p.description ?? null,
      health: p.health,
      tags: p.tags,
    };
  });
  const { error: projErr } = await supabase
    .from("projects")
    .insert(projectRows);
  if (projErr) throw new Error(`projects: ${projErr.message}`);

  // ── Phases ────────────────────────────────────────────────────────────
  const phaseIdMap = new Map<string, string>();
  const phaseRows = PHASES.map((ph) => {
    const id = newId();
    phaseIdMap.set(ph.id, id);
    return {
      id,
      organization_id: orgId,
      project_id: projectIdMap.get(ph.projectId)!,
      name: ph.name,
      position: ph.position,
      is_complete: ph.isComplete,
    };
  });
  if (phaseRows.length > 0) {
    const { error: phaseErr } = await supabase
      .from("phases")
      .insert(phaseRows);
    if (phaseErr) throw new Error(`phases: ${phaseErr.message}`);
  }

  // ── Tasks ─────────────────────────────────────────────────────────────
  const taskIdMap = new Map<string, string>();
  const taskRows = TASKS.map((t) => {
    const id = newId();
    taskIdMap.set(t.id, id);
    return {
      id,
      organization_id: orgId,
      project_id: projectIdMap.get(t.projectId)!,
      phase_id: t.phaseId ? phaseIdMap.get(t.phaseId) ?? null : null,
      code: t.code,
      title: t.title,
      description: t.description ?? null,
      status: t.status,
      priority: t.priority,
      task_type: t.taskType ?? null,
      due_date: t.dueDate ?? null,
      estimated_hours: t.estimatedHours ?? null,
      story_points: t.storyPoints ?? null,
      reviewer_id: null,
      client_visible: t.clientVisible,
      position: t.position,
      tags: t.tags,
      figma_url: t.figmaUrl ?? null,
      repo_url: t.repoUrl ?? null,
      created_by: userId,
    };
  });
  if (taskRows.length > 0) {
    const { error: taskErr } = await supabase.from("tasks").insert(taskRows);
    if (taskErr) throw new Error(`tasks: ${taskErr.message}`);
  }

  // ── Task assignees: assign the current user to a few tasks so the
  //    "My tasks" page has something to show ──────────────────────────
  const assigneeRows = TASKS.slice(0, 6).map((t) => ({
    task_id: taskIdMap.get(t.id)!,
    user_id: userId,
  }));
  if (assigneeRows.length > 0) {
    const { error: aErr } = await supabase
      .from("task_assignees")
      .insert(assigneeRows);
    if (aErr) throw new Error(`task_assignees: ${aErr.message}`);
  }

  // ── Comments (only on tasks the seed has comments for, and only
  //    those whose task survived; current user becomes the author) ───
  const commentRows = COMMENTS.filter((c) => taskIdMap.has(c.taskId)).map(
    (c) => ({
      id: newId(),
      organization_id: orgId,
      task_id: taskIdMap.get(c.taskId)!,
      author_id: userId,
      body: c.body,
    }),
  );
  if (commentRows.length > 0) {
    const { error: cErr } = await supabase
      .from("comments")
      .insert(commentRows);
    if (cErr) throw new Error(`comments: ${cErr.message}`);
  }

  // ── Time entries (current user is the worker) ─────────────────────
  const timeRows = TIME_ENTRIES.filter((e) => taskIdMap.has(e.taskId)).map(
    (e) => ({
      id: newId(),
      organization_id: orgId,
      task_id: taskIdMap.get(e.taskId)!,
      user_id: userId,
      entry_date: e.date,
      duration_minutes: e.durationMinutes,
      description: e.description,
      billable: e.billable,
    }),
  );
  if (timeRows.length > 0) {
    const { error: tErr } = await supabase
      .from("time_entries")
      .insert(timeRows);
    if (tErr) throw new Error(`time_entries: ${tErr.message}`);
  }

  return {
    orgId,
    counts: {
      clients: clientRows.length,
      projects: projectRows.length,
      phases: phaseRows.length,
      tasks: taskRows.length,
      comments: commentRows.length,
      time_entries: timeRows.length,
    },
  };
}
