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
  /** Internal cost rate per hour (used for profitability). */
  costRate?: number;
  /** Default hourly bill rate per hour (sits at the bottom of the
   *  resolution hierarchy: project override > client rate card >
   *  this default; see lib/billing/rate.ts). */
  billRate?: number;
}

/**
 * Per-client per-role rate override. Lookup order in resolveBillingRate:
 *   1. project.hourlyRateOverride
 *   2. client.rateCard entry matching user role
 *   3. user.billRate
 *   4. fallback constant
 */
export interface RateCardEntry {
  role: OrgRole;
  rate: number;
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
  /** Optional per-role rate overrides; sits between project override
   *  and the team member's default rate in the billing-rate hierarchy. */
  rateCard?: RateCardEntry[];
  /** Per-client portal branding (PRD §5.5.1). Falls back to org defaults. */
  portalBranding?: {
    /** HSL hue for primary accent (0..360). */
    accentHue?: number;
    /** Welcome banner shown above the portal dashboard. */
    welcomeMessage?: string;
    /** Override the agency's "Atelier Studio · {client.name} portal" footer. */
    footerOverride?: string;
  };
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
  /** Granular sub-type from the bundled templates (PRD §5.1.2 / §5.11.1).
   *  e.g. "wordpress_standard", "react_custom", "shopify_ecom",
   *  "rn_mobile_app", "native_ios_android", "seo_retainer", "ppc",
   *  "social_media", "brand_identity", "maintenance_retainer". */
  subType?: string;
  /** ID of the template (if any) the project was instantiated from. */
  templateId?: string;
  startDate?: string;
  endDate?: string;
  status: ProjectStatus;
  priority: TaskPriority;
  projectManagerId?: string;
  billingModel: BillingModel;
  totalBudget?: number;
  estimatedHours?: number;
  /** Project-specific hourly bill rate that overrides client + user defaults. */
  hourlyRateOverride?: number;
  /** Project-specific internal cost rate override. Mirrors the bill-rate
   *  override but for profitability calcs (sometimes useful when a project
   *  uses a contractor with a different cost basis than the team default). */
  costRateOverride?: number;
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

// ----------------------------------------------------------------------------
// Task dependencies (PRD §5.2.2)
// ----------------------------------------------------------------------------
export type DependencyType =
  | "finish_to_start" // default — predecessor must finish before this can start
  | "start_to_start"
  | "finish_to_finish"
  | "start_to_finish";

export interface TaskDependency {
  taskId: string;
  dependsOnTaskId: string;
  type: DependencyType;
}

// ----------------------------------------------------------------------------
// Recurring task rules (PRD §5.2.5)
// ----------------------------------------------------------------------------
export type RecurrenceFreq = "daily" | "weekly" | "monthly";

/** Subset of Task that we copy onto each materialised instance. */
export interface RecurringTaskTemplate {
  title: string;
  description?: string;
  priority: TaskPriority;
  taskType?: string;
  estimatedHours?: number;
  storyPoints?: number;
  assigneeIds: string[];
  reviewerId?: string;
  clientVisible: boolean;
  tags: string[];
  /** offset in days from materialisation date — default due is same day */
  dueOffsetDays?: number;
}

// ----------------------------------------------------------------------------
// SLA module (PRD §5.14)
// ----------------------------------------------------------------------------
export type SlaHoursKind = "business_hours" | "calendar";

export interface SlaTier {
  /** Matches Task.priority */
  priority: TaskPriority;
  /** First-response window: createdAt → first move out of `todo` */
  responseHours: number;
  /** Resolution window: createdAt → status === "done" */
  resolutionHours: number;
}

export interface SlaPolicy {
  id: string;
  organizationId: string;
  /** null = org-wide default; otherwise overrides for this client */
  clientId?: string;
  name: string;
  isActive: boolean;
  hoursKind: SlaHoursKind;
  tiers: SlaTier[];
  /** User ids notified on breach */
  escalationUserIds: string[];
  createdAt: string;
}

export type SlaState = "no_policy" | "ok" | "at_risk" | "breached" | "met";

export interface SlaIncidentSnapshot {
  taskId: string;
  policyId: string;
  tier: SlaTier;
  responseDeadline: string; // ISO
  resolutionDeadline: string; // ISO
  responseState: SlaState;
  resolutionState: SlaState;
  /** Hours remaining until next deadline (negative if breached) */
  hoursToNextDeadline: number;
}

// ----------------------------------------------------------------------------
// Custom reports (PRD §5.13)
// ----------------------------------------------------------------------------
export type ReportSource =
  | "tasks"
  | "time_entries"
  | "projects"
  | "invoices"
  | "clients";

export type ReportMeasure =
  | { kind: "count" }
  | { kind: "sum"; field: string }
  | { kind: "avg"; field: string };

export type ReportFilterOp =
  | "eq"
  | "neq"
  | "in"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains";

export interface ReportFilter {
  field: string;
  op: ReportFilterOp;
  /** primitive or array (for `in`); strings/numbers/booleans only */
  value: string | number | boolean | (string | number)[];
}

export type ReportVisual = "table" | "bar" | "kpi";

export interface ReportConfig {
  source: ReportSource;
  /** Field to group rows by — undefined for "kpi" / no-grouping. */
  groupBy?: string;
  measure: ReportMeasure;
  filters: ReportFilter[];
  visual: ReportVisual;
  /** Sort direction on the measure */
  sortDir?: "asc" | "desc";
  /** Cap of rows shown */
  limit?: number;
}

export interface CustomReport {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  config: ReportConfig;
  createdBy?: string;
  createdAt: string;
}

export interface RecurringTaskRule {
  id: string;
  organizationId: string;
  projectId: string;
  phaseId?: string;
  name: string;
  isActive: boolean;
  freq: RecurrenceFreq;
  intervalCount: number;
  /** 0=Sun … 6=Sat — only used when freq === "weekly" */
  dayOfWeek?: number;
  /** 1..28 — only used when freq === "monthly" */
  dayOfMonth?: number;
  taskTemplate: RecurringTaskTemplate;
  startDate: string;
  endDate?: string;
  lastRunAt?: string;
  createdBy?: string;
  createdAt: string;
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
  entityType: "project" | "task" | "comment" | "client" | "file" | "invoice";
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
  /** Storage path inside the `project-files` bucket; undefined for in-memory demo files. */
  storagePath?: string;
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
// Automation runs — log every time a rule fires
// ----------------------------------------------------------------------------
export type AutomationRunStatus = "success" | "skipped" | "error";

export interface AutomationRunActionResult {
  type: AutomationActionType;
  label: string;
  outcome: "ok" | "noop" | "error";
  detail?: string;
}

export interface AutomationRun {
  id: string;
  ruleId: string;
  triggerType: AutomationTriggerType;
  triggerSummary: string;
  /** entity referenced by the trigger event (taskId, projectId, ...) */
  entityType?: string;
  entityId?: string;
  status: AutomationRunStatus;
  actions: AutomationRunActionResult[];
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

// ----------------------------------------------------------------------------
// Integrations framework (Pass 6 — PRD §5.12, §5.15)
// ----------------------------------------------------------------------------
export type IntegrationProviderKind =
  | "figma"
  | "adobe_creative_cloud"
  | "github"
  | "gitlab"
  | "bitbucket"
  | "slack"
  | "microsoft_teams"
  | "google_drive"
  | "dropbox"
  | "onedrive"
  | "sharepoint"
  | "google_ads"
  | "meta_ads"
  | "google_analytics"
  | "google_search_console"
  | "mailchimp"
  | "sendgrid"
  | "hootsuite"
  | "buffer"
  | "quickbooks"
  | "xero"
  | "freshbooks"
  | "hubspot"
  | "salesforce"
  | "google_calendar"
  | "outlook_calendar"
  | "jira_import"
  | "vercel"
  | "netlify"
  | "aws"
  | "zapier"
  | "make"
  | "generic_webhook";

export type IntegrationCategory =
  | "design"
  | "code"
  | "comms"
  | "storage"
  | "marketing"
  | "accounting"
  | "crm"
  | "calendar"
  | "devops"
  | "hosting"
  | "gateway";

export type IntegrationCredentialType =
  | "oauth2"
  | "api_key"
  | "personal_access_token"
  | "basic_auth"
  | "webhook_secret"
  | "service_account";

export type IntegrationConnectionStatus =
  | "pending"
  | "connected"
  | "disconnected"
  | "expired"
  | "error";

export interface IntegrationProvider {
  kind: IntegrationProviderKind;
  displayName: string;
  category: IntegrationCategory;
  supportsOauth: boolean;
  supportsApiKey: boolean;
  supportsPat: boolean;
  supportsWebhookIn: boolean;
  supportsWebhookOut: boolean;
  defaultScopes: string[];
  documentationUrl?: string;
}

/**
 * Credential metadata. The actual secret never lives here — only the
 * Vault id (in real mode) or a placeholder (in demo). Browser code
 * therefore can never access plaintext.
 */
export interface IntegrationCredential {
  id: string;
  organizationId: string;
  provider: IntegrationProviderKind;
  credentialType: IntegrationCredentialType;
  label: string;
  /** UUID of vault.secrets row (real mode) or "demo:<id>" sentinel (demo) */
  vaultSecretId: string;
  /** Non-secret payload (account ids, expiry hint, refresh-token id, ...) */
  payloadMeta: Record<string, unknown>;
  scopes: string[];
  expiresAt?: string;
  isActive: boolean;
  lastValidatedAt?: string;
  lastValidationMessage?: string;
  createdBy?: string;
  createdAt: string;
}

export interface IntegrationConnection {
  id: string;
  organizationId: string;
  credentialId: string;
  provider: IntegrationProviderKind;
  status: IntegrationConnectionStatus;
  externalAccountId?: string;
  externalAccountLabel?: string;
  accountMetadata: Record<string, unknown>;
  lastSyncedAt?: string;
  lastError?: string;
  createdAt: string;
}

export type IntegrationLinkEntityType =
  | "task"
  | "project"
  | "client"
  | "phase"
  | "invoice"
  | "quote"
  | "milestone";

export interface IntegrationLink {
  id: string;
  organizationId: string;
  connectionId?: string;
  provider: IntegrationProviderKind;
  entityType: IntegrationLinkEntityType;
  entityId: string;
  /** Provider-specific resource kind, e.g. "figma_frame", "github_pr". */
  externalKind: string;
  externalId: string;
  externalUrl?: string;
  metadata: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
}

export type WebhookDeliveryStatus =
  | "pending"
  | "in_flight"
  | "delivered"
  | "failed"
  | "exhausted";

export interface WebhookSubscription {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  targetUrl: string;
  vaultSecretId: string;
  /** Glob list. ["*"] = everything. */
  eventFilter: string[];
  customHeaders: Record<string, string>;
  isActive: boolean;
  retryMax: number;
  timeoutMs: number;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: WebhookDeliveryStatus;
  createdBy?: string;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  organizationId: string;
  eventType: string;
  eventId: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  nextAttemptAt: string;
  lastAttemptAt?: string;
  responseStatus?: number;
  responseBody?: string;
  signature?: string;
  createdAt: string;
}

export interface IncomingWebhookEndpoint {
  id: string;
  organizationId: string;
  connectionId?: string;
  provider: IntegrationProviderKind;
  endpointToken: string;
  vaultSecretId?: string;
  isActive: boolean;
  lastReceivedAt?: string;
  createdAt: string;
}

export interface IncomingWebhookEvent {
  id: string;
  endpointId: string;
  organizationId: string;
  receivedAt: string;
  requestHeaders: Record<string, string>;
  payload: Record<string, unknown>;
  signatureVerified: boolean;
  processedAt?: string;
  processError?: string;
}

export type IntegrationJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface IntegrationJob {
  id: string;
  organizationId: string;
  connectionId?: string;
  kind: string;
  status: IntegrationJobStatus;
  payload: Record<string, unknown>;
  runAt: string;
  attempts: number;
  lastError?: string;
  result?: Record<string, unknown>;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// Sprint retros + releases (PRD §5.13)
// ----------------------------------------------------------------------------
export interface RetroNote {
  id: string;
  category: "went_well" | "didnt_go_well" | "action_item";
  body: string;
  authorId?: string;
  /** When category=action_item and converted, the resulting taskId. */
  taskId?: string;
  createdAt: string;
}

export interface SprintRetro {
  id: string;
  organizationId: string;
  projectId: string;
  sprintLabel: string;
  /** Inclusive window for the sprint this retro covers. */
  startDate: string;
  endDate: string;
  notes: RetroNote[];
  createdAt: string;
  createdBy?: string;
}

export type ReleaseStatus =
  | "planning"
  | "in_progress"
  | "code_freeze"
  | "released"
  | "rolled_back";

// ----------------------------------------------------------------------------
// Approval signatures (PRD §5.5.2)
// ----------------------------------------------------------------------------
export interface ApprovalSignature {
  id: string;
  organizationId: string;
  /** Polymorphic — task | quote | invoice | release | milestone */
  entityType: "task" | "quote" | "invoice" | "release" | "milestone";
  entityId: string;
  action: "approved" | "revisions_requested" | "rejected";
  signedName: string;
  signedRole?: string;
  signedAt: string;
  signatureMethod: "checkbox" | "typed_name" | "drawn";
  /** Optional comment captured alongside the signature. */
  comment?: string;
  /** When known — anonymized IP, browser ID. */
  ipAddress?: string;
  userAgent?: string;
}

// ----------------------------------------------------------------------------
// Meeting notes (PRD §5.9)
// ----------------------------------------------------------------------------
export interface MeetingActionItem {
  id: string;
  body: string;
  assigneeId?: string;
  dueDate?: string;
  taskId?: string;
}

export interface MeetingNote {
  id: string;
  organizationId: string;
  projectId?: string;
  clientId?: string;
  title: string;
  /** ISO date-time the meeting occurred. */
  meetingAt: string;
  attendees: string[]; // user ids or arbitrary email strings
  agenda?: string;
  notes: string;
  actionItems: MeetingActionItem[];
  createdAt: string;
  createdBy?: string;
}

// ----------------------------------------------------------------------------
// Support tickets (PRD §5.5.1)
// ----------------------------------------------------------------------------
export type SupportTicketStatus =
  | "new"
  | "in_progress"
  | "waiting_on_client"
  | "resolved"
  | "closed";

export interface SupportTicketResponse {
  id: string;
  authorId?: string;
  authorEmail?: string;
  body: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  organizationId: string;
  clientId: string;
  projectId?: string;
  subject: string;
  body: string;
  status: SupportTicketStatus;
  priority: "low" | "medium" | "high" | "urgent";
  submittedByEmail?: string;
  assigneeId?: string;
  taskId?: string;
  responses: SupportTicketResponse[];
  createdAt: string;
  resolvedAt?: string;
}

// ----------------------------------------------------------------------------
// Security settings (PRD §7)
// ----------------------------------------------------------------------------
export interface IpAllowlistEntry {
  /** CIDR (192.168.1.0/24) or single IP. */
  cidr: string;
  label?: string;
  addedAt: string;
}

export interface MfaEnrollment {
  userId: string;
  method: "totp";
  /** otpauth:// URI shown once at enrollment. Cleared from the store
   *  the next time the user logs in. */
  setupUri?: string;
  /** SHA-256 hex of the shared TOTP secret — never the secret itself. */
  secretHash: string;
  enrolledAt: string;
  /** SHA-256 of each recovery code; comparison is constant-time on use. */
  recoveryCodeHashes: string[];
}

export interface SecuritySettings {
  organizationId: string;
  /** Empty = no restriction. */
  ipAllowlist: IpAllowlistEntry[];
  /** Roles that MUST have MFA enabled before they can log in. */
  mfaRequiredForRoles: OrgRole[];
  /** Soft session timeout in minutes; null = no auto-logout. */
  sessionTimeoutMinutes: number | null;
  /** Days to retain audit data after a churned client; 0 = forever. */
  churnDataRetentionDays: number;
  /** SAML / OIDC SSO provider config (PRD §7). */
  ssoProviders?: SsoProvider[];
  /** Domains that get auto-provisioned via JIT when SSO user signs in. */
  jitProvisioningDomains?: string[];
}

// ----------------------------------------------------------------------------
// SSO providers (PRD §7)
// ----------------------------------------------------------------------------
export type SsoProtocol = "saml" | "oidc";

export interface SsoProvider {
  id: string;
  organizationId: string;
  protocol: SsoProtocol;
  displayName: string;
  /** Vendor preset — "google_workspace" | "microsoft_entra" | "okta" | "generic" */
  vendor: "google_workspace" | "microsoft_entra" | "okta" | "generic";
  isActive: boolean;
  /** SAML: idpEntityId + idpSsoUrl + idpCertificate (PEM)
   *  OIDC: discoveryUrl + clientId + (server-side only) clientSecret */
  config: Record<string, string>;
  /** Default role assigned to new users provisioned via this provider. */
  defaultRole: OrgRole;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// Read receipts (PRD §5.5.3)
// ----------------------------------------------------------------------------
export interface ReadReceipt {
  id: string;
  organizationId: string;
  /** What was viewed. Polymorphic across the same shape used by signatures. */
  entityType: "task" | "file" | "invoice" | "milestone" | "comment";
  entityId: string;
  /** User id (internal) or email (client/external). */
  viewerUserId?: string;
  viewerEmail?: string;
  /** Source — portal | email | direct */
  channel: "portal" | "email" | "direct";
  firstViewedAt: string;
  lastViewedAt: string;
  viewCount: number;
}

// ----------------------------------------------------------------------------
// Email digests (PRD §5.5.3)
// ----------------------------------------------------------------------------
export type DigestCadence = "instant" | "daily" | "weekly" | "off";

export interface EmailDigestPreference {
  userId: string;
  /** Per-event cadence — different for assignments vs. comments etc. */
  events: {
    assignments: DigestCadence;
    mentions: DigestCadence;
    deadlines: DigestCadence;
    statusChanges: DigestCadence;
    approvalsNeeded: DigestCadence;
  };
  /** Local hour-of-day (0..23) for daily digest delivery. */
  dailyDigestHour: number;
  /** Day of week (0=Sun..6=Sat) for weekly digest. */
  weeklyDigestDay: number;
}

// ----------------------------------------------------------------------------
// Email-to-task mapping (PRD §5.9)
// ----------------------------------------------------------------------------
export interface EmailToTaskMapping {
  id: string;
  organizationId: string;
  projectId: string;
  /** Generated unique inbox local-part: "tasks+iris-web-001-a8f3" */
  localPart: string;
  /** Full address inferred from inbox domain config. */
  inboxAddress: string;
  /** Default values applied to created tasks. */
  defaults: {
    status: "todo" | "in_progress";
    priority: "low" | "medium" | "high" | "urgent";
    assigneeId?: string;
    tags: string[];
  };
  /** Senders permitted to create tasks. Empty = anyone. */
  allowlistedSenders: string[];
  isActive: boolean;
  createdAt: string;
  /** When the last successful inbound email landed. */
  lastReceivedAt?: string;
}

export interface Release {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  /** Semver-ish or freeform — "v1.4", "Spring '26", "Q3 marketing push". */
  version?: string;
  status: ReleaseStatus;
  targetDate?: string;
  releasedAt?: string;
  /** IDs of tasks in scope. Generated release notes are derived from this set. */
  taskIds: string[];
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

/**
 * Canonical event names emitted by the central integrations event bus
 * and matched against `WebhookSubscription.eventFilter`. Outbound
 * subscribers (accounting, Zapier, custom) consume these.
 */
export const INTEGRATION_EVENT_TYPES = [
  "task.created",
  "task.updated",
  "task.status_changed",
  "task.completed",
  "comment.created",
  "time_entry.created",
  "time_entry.approved",
  "invoice.created",
  "invoice.sent",
  "invoice.paid",
  "quote.created",
  "quote.accepted",
  "project.created",
  "project.completed",
  "milestone.completed",
  "approval.requested",
  "approval.granted",
  "approval.rejected",
  "client.created",
  "budget.threshold_hit",
  "sla.breached",
] as const;

export type IntegrationEventType = (typeof INTEGRATION_EVENT_TYPES)[number];
