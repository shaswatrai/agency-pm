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
  AutomationRule,
  AutomationRun,
  BudgetChangeRequest,
  BudgetChangeStatus,
  Client,
  Comment,
  FxRate,
  Invoice,
  InvoiceStatus,
  Phase,
  Project,
  Quote,
  QuoteStatus,
  QuoteVersion,
  RecurringTaskRule,
  SkillProficiency,
  Task,
  TaskDependency,
  TimeEntry,
  TimeTrackingConfig,
  TimesheetStatus,
  TimesheetSubmission,
} from "@/types/domain";

import { useStore } from "@/lib/db/store";

function getOrgId(): string {
  return useStore.getState().organization.id;
}

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

// ── Task dependencies ──────────────────────────────────────────────────
export async function syncTaskDependencyInsert(
  dep: TaskDependency,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("task_dependencies").insert({
    task_id: dep.taskId,
    depends_on_task_id: dep.dependsOnTaskId,
    type: dep.type,
  });
  warn("Task dependency persist", error);
}

export async function syncTaskDependencyDelete(
  taskId: string,
  dependsOnTaskId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("task_dependencies")
    .delete()
    .eq("task_id", taskId)
    .eq("depends_on_task_id", dependsOnTaskId);
  warn("Task dependency delete", error);
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

// ── Invoices ───────────────────────────────────────────────────────────
export async function syncInvoiceInsert(invoice: Invoice): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("invoices").insert({
    id: invoice.id,
    organization_id: invoice.organizationId,
    project_id: invoice.projectId,
    client_id: invoice.clientId,
    number: invoice.number,
    type: invoice.type,
    status: invoice.status,
    issue_date: invoice.issueDate,
    due_date: invoice.dueDate,
    currency: invoice.currency,
    notes: invoice.notes ?? null,
    line_items: invoice.lineItems,
    subtotal: invoice.subtotal,
    tax_rate: invoice.taxRate,
    tax_amount: invoice.taxAmount,
    total: invoice.total,
    amount_paid: invoice.amountPaid,
    paid_at: invoice.paidAt ?? null,
    sent_at: invoice.sentAt ?? null,
  });
  warn("Invoice persist", error);
}

export async function syncInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const patch: Record<string, unknown> = { status };
  const inv = useStore.getState().invoices.find((i) => i.id === invoiceId);
  if (status === "sent" && inv?.sentAt) patch.sent_at = inv.sentAt;
  if (status === "paid" && inv) {
    patch.paid_at = inv.paidAt;
    patch.amount_paid = inv.amountPaid;
  }
  const { error } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", invoiceId);
  warn("Invoice status", error);
}

// ── Quotes ─────────────────────────────────────────────────────────────
export async function syncQuoteInsert(quote: Quote): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error: qErr } = await supabase.from("quotes").insert({
    id: quote.id,
    organization_id: quote.organizationId,
    client_id: quote.clientId,
    number: quote.number,
    name: quote.name,
    type: quote.type,
    description: quote.description ?? null,
    status: quote.status,
    currency: quote.currency,
    valid_until: quote.validUntil,
    current_version_id: quote.currentVersionId,
    converted_to_project_id: quote.convertedToProjectId ?? null,
    created_by: quote.createdBy ?? null,
  });
  warn("Quote persist", qErr);
  if (qErr) return;
  if (quote.versions.length === 0) return;
  const { error: vErr } = await supabase.from("quote_versions").insert(
    quote.versions.map((v) =>
      mapVersionToRow(v, quote.id, quote.organizationId),
    ),
  );
  warn("Quote versions", vErr);
}

export async function syncQuoteStatus(
  quoteId: string,
  status: QuoteStatus,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("quotes")
    .update({ status })
    .eq("id", quoteId);
  warn("Quote status", error);
}

export async function syncQuoteCurrentVersion(
  quoteId: string,
  versionId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("quotes")
    .update({ current_version_id: versionId })
    .eq("id", quoteId);
  warn("Quote current version", error);
}

export async function syncQuoteVersionInsert(
  quoteId: string,
  version: QuoteVersion,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const orgId = getOrgId();
  const { error } = await supabase
    .from("quote_versions")
    .insert(mapVersionToRow(version, quoteId, orgId));
  warn("Quote version persist", error);
}

function mapVersionToRow(
  v: QuoteVersion,
  quoteId: string,
  orgId: string,
): Record<string, unknown> {
  return {
    id: v.id,
    organization_id: orgId,
    quote_id: quoteId,
    version_number: v.versionNumber,
    status: v.status,
    notes: v.notes ?? null,
    line_items: v.lineItems,
    subtotal: v.subtotal,
    internal_cost: v.internalCost,
    tax_rate: v.taxRate,
    tax_amount: v.taxAmount,
    total: v.total,
    sent_at: v.sentAt ?? null,
  };
}

// ── Automations ────────────────────────────────────────────────────────
export async function syncAutomationToggle(
  ruleId: string,
  isActive: boolean,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("automations")
    .update({ is_active: isActive })
    .eq("id", ruleId);
  warn("Automation toggle", error);
}

export async function syncAutomationUpsert(rule: AutomationRule): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("automations").upsert({
    id: rule.id,
    organization_id: rule.organizationId,
    name: rule.name,
    description: rule.description ?? null,
    is_active: rule.isActive,
    category: rule.category,
    trigger: rule.trigger,
    conditions: rule.conditions,
    actions: rule.actions,
    run_count: rule.runCount,
    last_run_at: rule.lastRunAt ?? null,
  });
  warn("Automation upsert", error);
}

export async function syncAutomationRunInsert(
  run: AutomationRun,
  organizationId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("automation_runs").insert({
    id: run.id,
    organization_id: organizationId,
    rule_id: run.ruleId,
    trigger_type: run.triggerType,
    trigger_summary: run.triggerSummary,
    entity_type: run.entityType ?? null,
    entity_id: run.entityId ?? null,
    status: run.status,
    actions: run.actions,
  });
  warn("Automation run", error);
}

// ── Timesheet submissions ──────────────────────────────────────────────
export async function syncTimesheetUpsert(
  submission: TimesheetSubmission,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("timesheet_submissions").upsert({
    id: submission.id,
    organization_id: submission.organizationId,
    user_id: submission.userId,
    week_start: submission.weekStart,
    status: submission.status,
    total_minutes: submission.totalMinutes,
    billable_minutes: submission.billableMinutes,
    entry_ids: submission.entryIds,
    notes: submission.notes ?? null,
    submitted_at: submission.submittedAt ?? null,
    reviewed_at: submission.reviewedAt ?? null,
    reviewed_by: submission.reviewedBy ?? null,
    rejection_reason: submission.rejectionReason ?? null,
  });
  warn("Timesheet upsert", error);
}

export async function syncTimesheetStatus(
  id: string,
  status: TimesheetStatus,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const sub = useStore.getState().timesheetSubmissions.find((s) => s.id === id);
  if (!sub) return;
  const { error } = await supabase
    .from("timesheet_submissions")
    .update({
      status,
      submitted_at: sub.submittedAt ?? null,
      reviewed_at: sub.reviewedAt ?? null,
      reviewed_by: sub.reviewedBy ?? null,
      rejection_reason: sub.rejectionReason ?? null,
    })
    .eq("id", id);
  warn("Timesheet status", error);
}

// ── FX rates + base currency ───────────────────────────────────────────
export async function syncFxRateUpsert(
  rate: FxRate,
  organizationId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("fx_rates").upsert({
    organization_id: organizationId,
    currency: rate.currency,
    rate_to_base: rate.rateToBase,
    updated_at: rate.updatedAt,
  });
  warn("FX upsert", error);
}

export async function syncBaseCurrency(
  currency: string,
  organizationId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("organizations")
    .update({ base_currency: currency })
    .eq("id", organizationId);
  warn("Base currency", error);
}

// ── User skills ────────────────────────────────────────────────────────
export async function syncUserSkillUpsert(
  userId: string,
  skill: string,
  proficiency: SkillProficiency,
  organizationId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  if (proficiency === 0) {
    const { error } = await supabase
      .from("user_skills")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("skill", skill);
    warn("User skill clear", error);
    return;
  }
  const { error } = await supabase.from("user_skills").upsert({
    organization_id: organizationId,
    user_id: userId,
    skill,
    proficiency,
  });
  warn("User skill", error);
}

// ── Time tracking config ───────────────────────────────────────────────
export async function syncTimeTrackingConfig(
  config: TimeTrackingConfig,
  organizationId: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("time_tracking_configs").upsert({
    organization_id: organizationId,
    rounding: config.rounding,
    locked_weeks: config.lockedWeeks,
    idle_threshold_minutes: config.idleThresholdMinutes,
  });
  warn("Time tracking config", error);
}

// ── Budget change requests ─────────────────────────────────────────────
export async function syncBudgetChangeInsert(
  request: BudgetChangeRequest,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("budget_change_requests").insert({
    id: request.id,
    organization_id: request.organizationId,
    project_id: request.projectId,
    requested_by: request.requestedBy,
    delta: request.delta,
    reason: request.reason,
    status: request.status,
  });
  warn("Budget change persist", error);
}

export async function syncBudgetChangeReview(
  id: string,
  status: BudgetChangeStatus,
  reviewerId: string,
  reviewNote?: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("budget_change_requests")
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote ?? null,
    })
    .eq("id", id);
  warn("Budget change review", error);
}

// ── Recurring task rules ───────────────────────────────────────────────
export async function syncRecurringRuleUpsert(
  rule: RecurringTaskRule,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("recurring_task_rules").upsert({
    id: rule.id,
    organization_id: rule.organizationId,
    project_id: rule.projectId,
    phase_id: rule.phaseId ?? null,
    name: rule.name,
    is_active: rule.isActive,
    freq: rule.freq,
    interval_count: rule.intervalCount,
    day_of_week: rule.dayOfWeek ?? null,
    day_of_month: rule.dayOfMonth ?? null,
    task_template: rule.taskTemplate,
    start_date: rule.startDate,
    end_date: rule.endDate ?? null,
    last_run_at: rule.lastRunAt ?? null,
    created_by: rule.createdBy ?? null,
  });
  warn("Recurring rule upsert", error);
}

export async function syncRecurringRuleDelete(id: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("recurring_task_rules")
    .delete()
    .eq("id", id);
  warn("Recurring rule delete", error);
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
