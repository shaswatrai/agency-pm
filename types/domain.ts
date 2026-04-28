import type {
  TaskStatus,
  TaskPriority,
  ProjectHealth,
} from "@/lib/design/tokens";

export type OrgRole =
  | "super_admin"
  | "admin"
  | "pm"
  | "member"
  | "finance"
  | "qa"
  | "client";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: OrgRole;
}

export type ClientStatus = "prospect" | "active" | "on_hold" | "churned";
export type ContractType = "retainer" | "project" | "hybrid" | "tm";

export interface Client {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  industry?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  currency: string;
  contractType: ContractType;
  status: ClientStatus;
  accountManagerId?: string;
  tags: string[];
  logoUrl?: string;
  portalEnabled: boolean;
  createdAt: string;
}

export type ProjectType =
  | "web_dev"
  | "app_dev"
  | "digital_marketing"
  | "branding"
  | "maintenance"
  | "other";

export type ProjectStatus =
  | "draft"
  | "pending_approval"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled"
  | "archived";

export type BillingModel =
  | "fixed_price"
  | "time_and_materials"
  | "retainer"
  | "milestone";

export interface Project {
  id: string;
  organizationId: string;
  clientId: string;
  code: string;
  name: string;
  type: ProjectType;
  startDate?: string;
  endDate?: string;
  status: ProjectStatus;
  priority: TaskPriority;
  projectManagerId?: string;
  billingModel: BillingModel;
  totalBudget?: number;
  estimatedHours?: number;
  description?: string;
  health: ProjectHealth;
  tags: string[];
  progress: number;
  taskCounts: {
    total: number;
    done: number;
  };
  createdAt: string;
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  position: number;
  isComplete: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  position: number;
}

export interface Task {
  id: string;
  organizationId: string;
  projectId: string;
  phaseId?: string;
  code: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours: number;
  storyPoints?: number;
  assigneeIds: string[];
  reviewerId?: string;
  clientVisible: boolean;
  position: number;
  tags: string[];
  figmaUrl?: string;
  repoUrl?: string;
  subtasks: Subtask[];
  commentCount: number;
  attachmentCount: number;
  subtaskCount: number;
  subtasksDone: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  date: string;
  durationMinutes: number;
  description: string;
  billable: boolean;
}

export interface ActivityEvent {
  id: string;
  actorId?: string;
  entityType: "project" | "task" | "comment" | "client" | "file";
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  parentCommentId?: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  taskId?: string;
  fileName: string;
  mimeType?: string;
  sizeBytes: number;
  version: number;
  uploadedBy?: string;
  clientVisible: boolean;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// Invoicing (Phase 2)
// ----------------------------------------------------------------------------
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled";

export type InvoiceType =
  | "milestone"
  | "time_materials"
  | "retainer"
  | "fixed_installment"
  | "expense";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: "hours" | "fixed" | "milestone" | "month";
  rate: number;
  amount: number;
}

// ----------------------------------------------------------------------------
// Automation engine (Phase 5)
// ----------------------------------------------------------------------------
export type AutomationTriggerType =
  | "task_status_change"
  | "task_created"
  | "task_overdue"
  | "time_logged_threshold"
  | "budget_threshold"
  | "milestone_complete"
  | "comment_added"
  | "approval_received"
  | "schedule_recurring";

export type AutomationActionType =
  | "send_notification"
  | "send_email"
  | "post_slack"
  | "change_status"
  | "assign_user"
  | "create_task"
  | "create_invoice"
  | "update_priority"
  | "webhook";

export interface AutomationStep {
  id: string;
  type: AutomationTriggerType | AutomationActionType;
  label: string;
  description: string;
  meta?: Record<string, string>;
}

export interface AutomationRule {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isActive: boolean;
  category:
    | "status"
    | "assignment"
    | "deadline"
    | "budget"
    | "approval"
    | "recurring";
  trigger: AutomationStep;
  conditions: AutomationStep[];
  actions: AutomationStep[];
  runCount: number;
  lastRunAt?: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// Quotes / estimates (PRD §5.6.1)
// ----------------------------------------------------------------------------
export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted";

export type QuoteVersionStatus =
  | "draft"
  | "sent"
  | "superseded"
  | "accepted"
  | "rejected";

export interface QuoteLineItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: "hours" | "fixed" | "milestone" | "month";
  rate: number;
  costRate: number;
  amount: number;
}

export interface QuoteVersion {
  id: string;
  versionNumber: number;
  status: QuoteVersionStatus;
  notes?: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  internalCost: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  sentAt?: string;
}

export interface Quote {
  id: string;
  organizationId: string;
  number: string;
  clientId: string;
  name: string;
  type: ProjectType;
  description?: string;
  status: QuoteStatus;
  currency: string;
  validUntil: string;
  currentVersionId: string;
  versions: QuoteVersion[];
  convertedToProjectId?: string;
  createdAt: string;
  createdBy?: string;
}

// ----------------------------------------------------------------------------
// Timesheet approval (PRD §5.3.2)
// ----------------------------------------------------------------------------
export type TimesheetStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export interface TimesheetSubmission {
  id: string;
  organizationId: string;
  userId: string;
  weekStart: string;
  status: TimesheetStatus;
  totalMinutes: number;
  billableMinutes: number;
  entryIds: string[];
  notes?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

// ----------------------------------------------------------------------------
// Skill matrix
// ----------------------------------------------------------------------------
export type SkillProficiency = 0 | 1 | 2 | 3 | 4; // none / novice / inter / advanced / expert

export interface UserSkill {
  userId: string;
  skill: string;
  proficiency: SkillProficiency;
}

// ----------------------------------------------------------------------------
// Multi-currency (PRD §5.6.3)
// ----------------------------------------------------------------------------
export interface FxRate {
  /** Foreign currency code, e.g. "EUR" */
  currency: string;
  /** Multiply foreign amount by this to get base currency amount */
  rateToBase: number;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// Budget change requests (PRD §5.5.2)
// ----------------------------------------------------------------------------
export type BudgetChangeStatus = "pending" | "approved" | "rejected";

export interface BudgetChangeRequest {
  id: string;
  organizationId: string;
  projectId: string;
  requestedBy: string;
  delta: number; // positive to increase, negative to decrease (in project currency)
  reason: string;
  status: BudgetChangeStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

// ----------------------------------------------------------------------------
// Time tracking config (PRD §5.3.2)
// ----------------------------------------------------------------------------
export type RoundingRule = "exact" | "5min" | "15min" | "30min";

export interface TimeTrackingConfig {
  rounding: RoundingRule;
  /** ISO date strings of weeks where time can no longer be edited */
  lockedWeeks: string[];
  /** Idle threshold for timer in minutes; 0 disables */
  idleThresholdMinutes: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  projectId: string;
  clientId: string;
  number: string;
  type: InvoiceType;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  notes?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  paidAt?: string;
  sentAt?: string;
}
