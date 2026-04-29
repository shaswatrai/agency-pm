"use client";

/**
 * Hydrate the in-memory store from Supabase.
 *
 * Called once when Connected mode is on AND a session exists. Replaces
 * the seeded slices with Postgres data so the UI shows the user's real
 * workspace.
 *
 * Slices currently hydrated:
 *   organization, users (org members + their profiles), clients,
 *   projects, phases, tasks (with assignees)
 *
 * Other slices (quotes, invoices, automations, timesheet, fx, budget
 * changes, skills) live only in the in-memory store today and aren't
 * in the migration yet — they get added in subsequent Pass 2 chunks.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { useStore } from "@/lib/db/store";
import type {
  Client,
  Comment,
  Phase,
  Project,
  Task,
  TimeEntry,
  User,
  OrgRole,
} from "@/types/domain";

interface HydrateResult {
  ok: boolean;
  message: string;
  counts?: Record<string, number>;
}

interface DbProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface DbMember {
  user_id: string;
  role: OrgRole;
  profiles: DbProfile;
}

interface DbClient {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  industry: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  currency: string;
  contract_type: Client["contractType"];
  status: Client["status"];
  account_manager_id: string | null;
  tags: string[] | null;
  portal_enabled: boolean;
  created_at: string;
}

interface DbProject {
  id: string;
  organization_id: string;
  client_id: string;
  code: string;
  name: string;
  type: Project["type"];
  start_date: string | null;
  end_date: string | null;
  status: Project["status"];
  priority: Project["priority"];
  project_manager_id: string | null;
  billing_model: Project["billingModel"];
  total_budget: number | null;
  estimated_hours: number | null;
  description: string | null;
  health: Project["health"];
  tags: string[] | null;
  created_at: string;
}

interface DbPhase {
  id: string;
  project_id: string;
  name: string;
  position: number;
  is_complete: boolean;
}

interface DbTask {
  id: string;
  organization_id: string;
  project_id: string;
  phase_id: string | null;
  code: string;
  title: string;
  description: string | null;
  status: Task["status"];
  priority: Task["priority"];
  task_type: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  story_points: number | null;
  client_visible: boolean;
  position: number;
  tags: string[] | null;
  figma_url: string | null;
  repo_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  task_assignees?: { user_id: string }[];
}

export async function hydrateFromSupabase(
  supabase: SupabaseClient,
  orgId: string,
  currentUserId: string,
): Promise<HydrateResult> {
  // 1. Org row
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, slug, name, logo_url")
    .eq("id", orgId)
    .single();
  if (orgErr || !org) {
    return { ok: false, message: `org: ${orgErr?.message ?? "missing"}` };
  }

  // 2. Members (joined to profiles)
  const { data: membersRaw, error: memErr } = await supabase
    .from("organization_members")
    .select("user_id, role, profiles!inner(id, full_name, avatar_url)")
    .eq("organization_id", orgId);
  if (memErr) {
    return { ok: false, message: `members: ${memErr.message}` };
  }
  const members = (membersRaw ?? []) as unknown as DbMember[];

  // 3. Clients
  const { data: clientsRaw, error: cliErr } = await supabase
    .from("clients")
    .select("*")
    .eq("organization_id", orgId);
  if (cliErr) return { ok: false, message: `clients: ${cliErr.message}` };

  // 4. Projects
  const { data: projectsRaw, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", orgId);
  if (projErr) return { ok: false, message: `projects: ${projErr.message}` };

  // 5. Phases
  const { data: phasesRaw, error: phaseErr } = await supabase
    .from("phases")
    .select("*")
    .eq("organization_id", orgId);
  if (phaseErr) return { ok: false, message: `phases: ${phaseErr.message}` };

  // 6. Tasks + assignees
  const { data: tasksRaw, error: taskErr } = await supabase
    .from("tasks")
    .select("*, task_assignees(user_id)")
    .eq("organization_id", orgId);
  if (taskErr) return { ok: false, message: `tasks: ${taskErr.message}` };

  // 7. Comments
  const { data: commentsRaw, error: comErr } = await supabase
    .from("comments")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });
  if (comErr) return { ok: false, message: `comments: ${comErr.message}` };

  // 8. Time entries
  const { data: timeRaw, error: timeErr } = await supabase
    .from("time_entries")
    .select("*")
    .eq("organization_id", orgId);
  if (timeErr) return { ok: false, message: `time_entries: ${timeErr.message}` };

  // ── Map DB rows → in-memory shapes ────────────────────────────────
  const users: User[] = members.map((m) => ({
    id: m.user_id,
    fullName: m.profiles.full_name,
    email: "", // Auth users table not exposed; can fetch via auth admin if needed
    role: m.role,
    avatarUrl: m.profiles.avatar_url ?? undefined,
  }));

  const dbClients = (clientsRaw ?? []) as DbClient[];
  const clients: Client[] = dbClients.map((c) => ({
    id: c.id,
    organizationId: c.organization_id,
    code: c.code,
    name: c.name,
    industry: c.industry ?? undefined,
    primaryContactName: c.primary_contact_name ?? undefined,
    primaryContactEmail: c.primary_contact_email ?? undefined,
    currency: c.currency,
    contractType: c.contract_type,
    status: c.status,
    accountManagerId: c.account_manager_id ?? undefined,
    tags: c.tags ?? [],
    portalEnabled: c.portal_enabled,
    createdAt: c.created_at,
  }));

  const dbProjects = (projectsRaw ?? []) as DbProject[];
  const projects: Project[] = dbProjects.map((p) => ({
    id: p.id,
    organizationId: p.organization_id,
    clientId: p.client_id,
    code: p.code,
    name: p.name,
    type: p.type,
    startDate: p.start_date ?? undefined,
    endDate: p.end_date ?? undefined,
    status: p.status,
    priority: p.priority,
    projectManagerId: p.project_manager_id ?? undefined,
    billingModel: p.billing_model,
    totalBudget: p.total_budget ?? undefined,
    estimatedHours: p.estimated_hours ?? undefined,
    description: p.description ?? undefined,
    health: p.health,
    tags: p.tags ?? [],
    progress: 0,
    taskCounts: { total: 0, done: 0 },
    createdAt: p.created_at,
  }));

  const dbPhases = (phasesRaw ?? []) as DbPhase[];
  const phases: Phase[] = dbPhases.map((p) => ({
    id: p.id,
    projectId: p.project_id,
    name: p.name,
    position: p.position,
    isComplete: p.is_complete,
  }));

  const dbTasks = (tasksRaw ?? []) as DbTask[];
  const tasks: Task[] = dbTasks.map((t) => ({
    id: t.id,
    organizationId: t.organization_id,
    projectId: t.project_id,
    phaseId: t.phase_id ?? undefined,
    code: t.code,
    title: t.title,
    description: t.description ?? undefined,
    status: t.status,
    priority: t.priority,
    taskType: t.task_type ?? undefined,
    dueDate: t.due_date ?? undefined,
    estimatedHours: t.estimated_hours ?? undefined,
    actualHours: 0,
    storyPoints: t.story_points ?? undefined,
    assigneeIds: (t.task_assignees ?? []).map((a) => a.user_id),
    reviewerId: undefined,
    clientVisible: t.client_visible,
    position: t.position,
    tags: t.tags ?? [],
    figmaUrl: t.figma_url ?? undefined,
    repoUrl: t.repo_url ?? undefined,
    subtasks: [],
    commentCount: 0,
    attachmentCount: 0,
    subtaskCount: 0,
    subtasksDone: 0,
    createdBy: t.created_by ?? undefined,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));

  // Compute project task counts + progress from real tasks
  const enrichedProjects = projects.map((p) => {
    const projectTasks = tasks.filter((t) => t.projectId === p.id);
    const done = projectTasks.filter((t) => t.status === "done").length;
    return {
      ...p,
      taskCounts: { total: projectTasks.length, done },
      progress:
        projectTasks.length === 0 ? 0 : done / projectTasks.length,
    };
  });

  // Comments
  const dbComments = (commentsRaw ?? []) as Array<{
    id: string;
    task_id: string;
    parent_comment_id: string | null;
    author_id: string;
    body: string;
    created_at: string;
  }>;
  const comments: Comment[] = dbComments.map((c) => ({
    id: c.id,
    taskId: c.task_id,
    parentCommentId: c.parent_comment_id ?? undefined,
    authorId: c.author_id,
    body: c.body,
    createdAt: c.created_at,
  }));

  // Time entries
  const dbTimes = (timeRaw ?? []) as Array<{
    id: string;
    task_id: string;
    user_id: string;
    entry_date: string;
    duration_minutes: number;
    description: string | null;
    billable: boolean;
  }>;
  const timeEntries: TimeEntry[] = dbTimes.map((e) => ({
    id: e.id,
    taskId: e.task_id,
    userId: e.user_id,
    date: e.entry_date,
    durationMinutes: e.duration_minutes,
    description: e.description ?? "",
    billable: e.billable,
  }));

  // Recompute comment + attachment counts on tasks from real data
  const taskCommentCount = new Map<string, number>();
  for (const c of comments) {
    taskCommentCount.set(c.taskId, (taskCommentCount.get(c.taskId) ?? 0) + 1);
  }
  const enrichedTasks = tasks.map((t) => ({
    ...t,
    commentCount: taskCommentCount.get(t.id) ?? 0,
    actualHours:
      timeEntries
        .filter((e) => e.taskId === t.id)
        .reduce((s, e) => s + e.durationMinutes, 0) / 60,
  }));

  useStore.setState((state) => ({
    organization: { id: org.id, slug: org.slug, name: org.name },
    currentUserId,
    users: users.length > 0 ? users : state.users,
    clients,
    projects: enrichedProjects,
    phases,
    tasks: enrichedTasks,
    comments,
    timeEntries,
    files: [],
  }));

  return {
    ok: true,
    message: "Hydrated from Supabase",
    counts: {
      users: users.length,
      clients: clients.length,
      projects: projects.length,
      phases: phases.length,
      tasks: tasks.length,
      comments: comments.length,
      timeEntries: timeEntries.length,
    },
  };
}
