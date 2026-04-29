"use client";

/**
 * Hydrate the in-memory store from Supabase.
 *
 * Called once when Connected mode is on AND a session exists. Replaces
 * the seeded slices with Postgres data so the UI shows the user's real
 * workspace.
 *
 * Hydrated slices:
 *   organization (with base_currency), users (org members + profiles),
 *   clients, projects, phases, tasks (with assignees), comments,
 *   time_entries, quotes (+ versions), invoices, automations + runs,
 *   timesheet_submissions, fx_rates, budget_change_requests,
 *   user_skills, time_tracking_configs.
 *
 * Files are hydrated separately by lib/db/fileSync.ts#hydrateFiles.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { useStore } from "@/lib/db/store";
import type {
  AutomationRule,
  AutomationRun,
  AutomationStep,
  AutomationTriggerType,
  AutomationRunActionResult,
  AutomationRunStatus,
  BudgetChangeRequest,
  BudgetChangeStatus,
  Client,
  Comment,
  FxRate,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  InvoiceType,
  Phase,
  Project,
  Quote,
  QuoteLineItem,
  QuoteStatus,
  QuoteVersion,
  QuoteVersionStatus,
  ProjectType,
  RecurrenceFreq,
  RecurringTaskRule,
  RecurringTaskTemplate,
  SlaHoursKind,
  SlaPolicy,
  SlaTier,
  RoundingRule,
  SkillProficiency,
  Task,
  TaskDependency,
  DependencyType,
  TimeEntry,
  TimeTrackingConfig,
  TimesheetStatus,
  TimesheetSubmission,
  User,
  UserSkill,
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

  // 9. Quotes (header) + versions
  const { data: quotesRaw } = await supabase
    .from("quotes")
    .select("*")
    .eq("organization_id", orgId);
  const { data: versionsRaw } = await supabase
    .from("quote_versions")
    .select("*")
    .eq("organization_id", orgId)
    .order("version_number", { ascending: true });

  // 10. Invoices
  const { data: invoicesRaw } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", orgId);

  // 11. Automations + runs
  const { data: automationsRaw } = await supabase
    .from("automations")
    .select("*")
    .eq("organization_id", orgId);
  const { data: automationRunsRaw } = await supabase
    .from("automation_runs")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  // 12. Timesheet submissions
  const { data: timesheetsRaw } = await supabase
    .from("timesheet_submissions")
    .select("*")
    .eq("organization_id", orgId);

  // 13. FX rates + base currency (already on org row)
  const { data: fxRaw } = await supabase
    .from("fx_rates")
    .select("*")
    .eq("organization_id", orgId);
  const { data: orgWithBase } = await supabase
    .from("organizations")
    .select("base_currency")
    .eq("id", orgId)
    .single();

  // 14. Budget change requests
  const { data: budgetChangesRaw } = await supabase
    .from("budget_change_requests")
    .select("*")
    .eq("organization_id", orgId);

  // 15. User skills
  const { data: userSkillsRaw } = await supabase
    .from("user_skills")
    .select("*")
    .eq("organization_id", orgId);

  // 16c. SLA policies
  const { data: slaRaw } = await supabase
    .from("sla_policies")
    .select("*")
    .eq("organization_id", orgId);
  type DbSlaPolicy = {
    id: string;
    organization_id: string;
    client_id: string | null;
    name: string;
    is_active: boolean;
    hours_kind: SlaHoursKind;
    tiers: SlaTier[];
    escalation_user_ids: string[];
    created_at: string;
  };
  const slaPolicies: SlaPolicy[] = ((slaRaw ?? []) as DbSlaPolicy[]).map(
    (p) => ({
      id: p.id,
      organizationId: p.organization_id,
      clientId: p.client_id ?? undefined,
      name: p.name,
      isActive: p.is_active,
      hoursKind: p.hours_kind,
      tiers: p.tiers ?? [],
      escalationUserIds: p.escalation_user_ids ?? [],
      createdAt: p.created_at,
    }),
  );

  // 16b. Recurring task rules
  const { data: recurringRaw } = await supabase
    .from("recurring_task_rules")
    .select("*")
    .eq("organization_id", orgId);
  type DbRecurring = {
    id: string;
    organization_id: string;
    project_id: string;
    phase_id: string | null;
    name: string;
    is_active: boolean;
    freq: RecurrenceFreq;
    interval_count: number;
    day_of_week: number | null;
    day_of_month: number | null;
    task_template: RecurringTaskTemplate;
    start_date: string;
    end_date: string | null;
    last_run_at: string | null;
    created_by: string | null;
    created_at: string;
  };
  const recurringRules: RecurringTaskRule[] = (
    (recurringRaw ?? []) as DbRecurring[]
  ).map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    projectId: r.project_id,
    phaseId: r.phase_id ?? undefined,
    name: r.name,
    isActive: r.is_active,
    freq: r.freq,
    intervalCount: r.interval_count,
    dayOfWeek: r.day_of_week ?? undefined,
    dayOfMonth: r.day_of_month ?? undefined,
    taskTemplate: r.task_template,
    startDate: r.start_date,
    endDate: r.end_date ?? undefined,
    lastRunAt: r.last_run_at ?? undefined,
    createdBy: r.created_by ?? undefined,
    createdAt: r.created_at,
  }));

  // 16a. Task dependencies (joined to tasks for org scoping)
  const dbTaskIds = ((tasksRaw ?? []) as DbTask[]).map((t) => t.id);
  let depsRaw: { task_id: string; depends_on_task_id: string; type: string }[] = [];
  if (dbTaskIds.length > 0) {
    const { data } = await supabase
      .from("task_dependencies")
      .select("task_id, depends_on_task_id, type")
      .in("task_id", dbTaskIds);
    depsRaw = data ?? [];
  }
  const taskDependencies: TaskDependency[] = depsRaw.map((d) => ({
    taskId: d.task_id,
    dependsOnTaskId: d.depends_on_task_id,
    type: d.type as DependencyType,
  }));

  // 16. Time tracking config (one row per org; may be missing)
  const { data: ttcRaw } = await supabase
    .from("time_tracking_configs")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();

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

  // ── Quotes ────────────────────────────────────────────────────────
  const versionsByQuote = new Map<string, QuoteVersion[]>();
  type DbVersion = {
    id: string;
    quote_id: string;
    version_number: number;
    status: QuoteVersionStatus;
    notes: string | null;
    line_items: QuoteLineItem[];
    subtotal: number;
    internal_cost: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    created_at: string;
    sent_at: string | null;
  };
  for (const v of (versionsRaw ?? []) as DbVersion[]) {
    const arr = versionsByQuote.get(v.quote_id) ?? [];
    arr.push({
      id: v.id,
      versionNumber: v.version_number,
      status: v.status,
      notes: v.notes ?? undefined,
      lineItems: v.line_items ?? [],
      subtotal: Number(v.subtotal),
      internalCost: Number(v.internal_cost),
      taxRate: Number(v.tax_rate),
      taxAmount: Number(v.tax_amount),
      total: Number(v.total),
      createdAt: v.created_at,
      sentAt: v.sent_at ?? undefined,
    });
    versionsByQuote.set(v.quote_id, arr);
  }
  type DbQuote = {
    id: string;
    organization_id: string;
    client_id: string;
    number: string;
    name: string;
    type: ProjectType;
    description: string | null;
    status: QuoteStatus;
    currency: string;
    valid_until: string;
    current_version_id: string;
    converted_to_project_id: string | null;
    created_by: string | null;
    created_at: string;
  };
  const quotes: Quote[] = ((quotesRaw ?? []) as DbQuote[]).map((q) => ({
    id: q.id,
    organizationId: q.organization_id,
    number: q.number,
    clientId: q.client_id,
    name: q.name,
    type: q.type,
    description: q.description ?? undefined,
    status: q.status,
    currency: q.currency,
    validUntil: q.valid_until,
    currentVersionId: q.current_version_id,
    versions: versionsByQuote.get(q.id) ?? [],
    convertedToProjectId: q.converted_to_project_id ?? undefined,
    createdAt: q.created_at,
    createdBy: q.created_by ?? undefined,
  }));

  // ── Invoices ──────────────────────────────────────────────────────
  type DbInvoice = {
    id: string;
    organization_id: string;
    project_id: string;
    client_id: string;
    number: string;
    type: InvoiceType;
    status: InvoiceStatus;
    issue_date: string;
    due_date: string;
    currency: string;
    notes: string | null;
    line_items: InvoiceLineItem[];
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    amount_paid: number;
    paid_at: string | null;
    sent_at: string | null;
  };
  const invoices: Invoice[] = ((invoicesRaw ?? []) as DbInvoice[]).map(
    (i) => ({
      id: i.id,
      organizationId: i.organization_id,
      projectId: i.project_id,
      clientId: i.client_id,
      number: i.number,
      type: i.type,
      status: i.status,
      issueDate: i.issue_date,
      dueDate: i.due_date,
      currency: i.currency,
      notes: i.notes ?? undefined,
      lineItems: i.line_items ?? [],
      subtotal: Number(i.subtotal),
      taxRate: Number(i.tax_rate),
      taxAmount: Number(i.tax_amount),
      total: Number(i.total),
      amountPaid: Number(i.amount_paid),
      paidAt: i.paid_at ?? undefined,
      sentAt: i.sent_at ?? undefined,
    }),
  );

  // ── Automations + runs ────────────────────────────────────────────
  type DbAutomation = {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    category: AutomationRule["category"];
    trigger: AutomationStep;
    conditions: AutomationStep[];
    actions: AutomationStep[];
    run_count: number;
    last_run_at: string | null;
    created_at: string;
  };
  const automations: AutomationRule[] = (
    (automationsRaw ?? []) as DbAutomation[]
  ).map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    name: r.name,
    description: r.description ?? undefined,
    isActive: r.is_active,
    category: r.category,
    trigger: r.trigger,
    conditions: r.conditions ?? [],
    actions: r.actions ?? [],
    runCount: r.run_count,
    lastRunAt: r.last_run_at ?? undefined,
    createdAt: r.created_at,
  }));

  type DbAutomationRun = {
    id: string;
    rule_id: string;
    trigger_type: AutomationTriggerType;
    trigger_summary: string;
    entity_type: string | null;
    entity_id: string | null;
    status: AutomationRunStatus;
    actions: AutomationRunActionResult[];
    created_at: string;
  };
  const automationRuns: AutomationRun[] = (
    (automationRunsRaw ?? []) as DbAutomationRun[]
  ).map((r) => ({
    id: r.id,
    ruleId: r.rule_id,
    triggerType: r.trigger_type,
    triggerSummary: r.trigger_summary,
    entityType: r.entity_type ?? undefined,
    entityId: r.entity_id ?? undefined,
    status: r.status,
    actions: r.actions ?? [],
    createdAt: r.created_at,
  }));

  // ── Timesheets ────────────────────────────────────────────────────
  type DbTimesheet = {
    id: string;
    organization_id: string;
    user_id: string;
    week_start: string;
    status: TimesheetStatus;
    total_minutes: number;
    billable_minutes: number;
    entry_ids: string[];
    notes: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    reviewed_by: string | null;
    rejection_reason: string | null;
  };
  const timesheetSubmissions: TimesheetSubmission[] = (
    (timesheetsRaw ?? []) as DbTimesheet[]
  ).map((t) => ({
    id: t.id,
    organizationId: t.organization_id,
    userId: t.user_id,
    weekStart: t.week_start,
    status: t.status,
    totalMinutes: t.total_minutes,
    billableMinutes: t.billable_minutes,
    entryIds: t.entry_ids ?? [],
    notes: t.notes ?? undefined,
    submittedAt: t.submitted_at ?? undefined,
    reviewedAt: t.reviewed_at ?? undefined,
    reviewedBy: t.reviewed_by ?? undefined,
    rejectionReason: t.rejection_reason ?? undefined,
  }));

  // ── FX + base currency ────────────────────────────────────────────
  type DbFx = {
    currency: string;
    rate_to_base: number;
    updated_at: string;
  };
  const fxRates: FxRate[] = ((fxRaw ?? []) as DbFx[]).map((r) => ({
    currency: r.currency,
    rateToBase: Number(r.rate_to_base),
    updatedAt: r.updated_at,
  }));
  const baseCurrency =
    (orgWithBase as { base_currency?: string } | null)?.base_currency ?? "USD";

  // ── Budget changes ────────────────────────────────────────────────
  type DbBudgetChange = {
    id: string;
    organization_id: string;
    project_id: string;
    requested_by: string;
    delta: number;
    reason: string;
    status: BudgetChangeStatus;
    reviewed_at: string | null;
    reviewed_by: string | null;
    review_note: string | null;
    created_at: string;
  };
  const budgetChanges: BudgetChangeRequest[] = (
    (budgetChangesRaw ?? []) as DbBudgetChange[]
  ).map((b) => ({
    id: b.id,
    organizationId: b.organization_id,
    projectId: b.project_id,
    requestedBy: b.requested_by,
    delta: Number(b.delta),
    reason: b.reason,
    status: b.status,
    createdAt: b.created_at,
    reviewedAt: b.reviewed_at ?? undefined,
    reviewedBy: b.reviewed_by ?? undefined,
    reviewNote: b.review_note ?? undefined,
  }));

  // ── User skills ───────────────────────────────────────────────────
  type DbUserSkill = {
    user_id: string;
    skill: string;
    proficiency: SkillProficiency;
  };
  const userSkills: UserSkill[] = (
    (userSkillsRaw ?? []) as DbUserSkill[]
  ).map((s) => ({
    userId: s.user_id,
    skill: s.skill,
    proficiency: s.proficiency,
  }));

  // ── Time tracking config (with defaults) ──────────────────────────
  type DbTtc = {
    rounding: RoundingRule;
    locked_weeks: string[];
    idle_threshold_minutes: number;
  };
  const ttc = ttcRaw as DbTtc | null;
  const timeTrackingConfig: TimeTrackingConfig = ttc
    ? {
        rounding: ttc.rounding,
        lockedWeeks: ttc.locked_weeks ?? [],
        idleThresholdMinutes: ttc.idle_threshold_minutes,
      }
    : useStore.getState().timeTrackingConfig;

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
    quotes: quotes.length > 0 ? quotes : state.quotes,
    invoices: invoices.length > 0 ? invoices : state.invoices,
    automations: automations.length > 0 ? automations : state.automations,
    automationRuns,
    timesheetSubmissions,
    fxRates,
    baseCurrency,
    budgetChanges,
    userSkills,
    timeTrackingConfig,
    taskDependencies,
    recurringRules,
    slaPolicies,
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
      quotes: quotes.length,
      invoices: invoices.length,
      automations: automations.length,
      timesheets: timesheetSubmissions.length,
      fxRates: fxRates.length,
      budgetChanges: budgetChanges.length,
      userSkills: userSkills.length,
      taskDependencies: taskDependencies.length,
      recurringRules: recurringRules.length,
      slaPolicies: slaPolicies.length,
    },
  };
}
