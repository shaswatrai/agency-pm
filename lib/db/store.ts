"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  AUTOMATIONS,
  BASE_CURRENCY,
  BUDGET_CHANGES,
  CLIENTS,
  COMMENTS,
  CURRENT_USER_ID,
  FILES,
  FX_RATES,
  INVOICES,
  ORG,
  PHASES,
  PROJECTS,
  QUOTES,
  SKILLS,
  TASKS,
  TIMESHEET_SUBMISSIONS,
  TIME_ENTRIES,
  TIME_TRACKING_CONFIG,
  USER_SKILLS,
  USERS,
} from "@/lib/db/seed";
import type {
  ActivityEvent,
  AutomationRule,
  AutomationRun,
  BudgetChangeRequest,
  BudgetChangeStatus,
  Client,
  Comment,
  CustomReport,
  DependencyType,
  FxRate,
  Invoice,
  InvoiceStatus,
  Phase,
  Project,
  ProjectFile,
  Quote,
  QuoteStatus,
  RecurringTaskRule,
  SlaPolicy,
  Task,
  TaskDependency,
  TimeEntry,
  TimeTrackingConfig,
  TimesheetStatus,
  TimesheetSubmission,
  User,
  UserSkill,
} from "@/types/domain";
import type { TaskStatus } from "@/lib/design/tokens";

interface Store {
  organization: typeof ORG;
  currentUserId: string;
  users: User[];
  clients: Client[];
  projects: Project[];
  phases: Phase[];
  tasks: Task[];
  comments: Comment[];
  timeEntries: TimeEntry[];
  files: ProjectFile[];
  taskDependencies: TaskDependency[];
  recurringRules: RecurringTaskRule[];
  slaPolicies: SlaPolicy[];
  customReports: CustomReport[];
  invoices: Invoice[];
  automations: AutomationRule[];
  automationRuns: AutomationRun[];
  activityEvents: ActivityEvent[];
  quotes: Quote[];
  timesheetSubmissions: TimesheetSubmission[];
  skills: string[];
  userSkills: UserSkill[];
  baseCurrency: string;
  fxRates: FxRate[];
  budgetChanges: BudgetChangeRequest[];
  timeTrackingConfig: TimeTrackingConfig;

  // task ops
  moveTask: (taskId: string, status: TaskStatus, position: number) => void;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  addTask: (
    task: Omit<
      Task,
      | "id"
      | "code"
      | "organizationId"
      | "createdAt"
      | "updatedAt"
      | "position"
      | "subtasks"
    > & { subtasks?: Task["subtasks"] },
  ) => Task;
  removeTask: (taskId: string) => void;
  duplicateTask: (taskId: string) => Task | null;
  // dependency ops
  addTaskDependency: (
    taskId: string,
    dependsOnTaskId: string,
    type?: DependencyType,
  ) => TaskDependency | null;
  removeTaskDependency: (taskId: string, dependsOnTaskId: string) => void;
  // recurring task rule ops
  addRecurringRule: (
    rule: Omit<
      RecurringTaskRule,
      "id" | "organizationId" | "createdAt" | "lastRunAt"
    >,
  ) => RecurringTaskRule;
  toggleRecurringRule: (id: string) => void;
  removeRecurringRule: (id: string) => void;
  markRecurringRuleRun: (id: string, runAt: string) => void;
  // SLA ops
  addSlaPolicy: (
    policy: Omit<SlaPolicy, "id" | "organizationId" | "createdAt">,
  ) => SlaPolicy;
  updateSlaPolicy: (id: string, patch: Partial<SlaPolicy>) => void;
  removeSlaPolicy: (id: string) => void;
  // custom reports
  addCustomReport: (
    report: Omit<CustomReport, "id" | "organizationId" | "createdAt">,
  ) => CustomReport;
  updateCustomReport: (
    id: string,
    patch: Partial<CustomReport>,
  ) => void;
  removeCustomReport: (id: string) => void;
  // client ops
  addClient: (client: Omit<Client, "id" | "organizationId" | "code" | "createdAt">) => Client;
  updateClient: (clientId: string, patch: Partial<Client>) => void;
  // project ops
  addProject: (project: Omit<Project, "id" | "organizationId" | "code" | "createdAt" | "progress" | "taskCounts" | "health">) => Project;
  updateProject: (projectId: string, patch: Partial<Project>) => void;
  // time ops
  addTimeEntry: (entry: Omit<TimeEntry, "id">) => TimeEntry;
  // comment ops
  addComment: (taskId: string, body: string) => Comment;
  // invoice ops
  addInvoice: (
    invoice: Omit<Invoice, "id" | "organizationId" | "subtotal" | "taxAmount" | "total">,
  ) => Invoice;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  // automation ops
  toggleAutomation: (id: string) => void;
  addAutomation: (
    rule: Omit<
      AutomationRule,
      "id" | "organizationId" | "runCount" | "lastRunAt" | "createdAt"
    >,
  ) => AutomationRule;
  updateAutomation: (id: string, patch: Partial<AutomationRule>) => void;
  removeAutomation: (id: string) => void;
  // quote ops
  updateQuoteStatus: (quoteId: string, status: QuoteStatus) => void;
  setCurrentQuoteVersion: (quoteId: string, versionId: string) => void;
  addQuoteVersion: (
    quoteId: string,
    version: Quote["versions"][number],
  ) => void;
  addQuote: (
    quote: Omit<Quote, "id" | "organizationId" | "createdAt">,
  ) => Quote;
  convertQuoteToProject: (quoteId: string) => Project | null;
  // timesheet ops
  setTimesheetStatus: (
    id: string,
    status: TimesheetStatus,
    review?: { reviewerId?: string; rejectionReason?: string },
  ) => void;
  // skills
  setUserSkill: (userId: string, skill: string, proficiency: 0 | 1 | 2 | 3 | 4) => void;
  // FX
  setBaseCurrency: (currency: string) => void;
  setFxRate: (currency: string, rateToBase: number) => void;
  // budget change requests
  addBudgetChange: (
    req: Omit<
      BudgetChangeRequest,
      "id" | "organizationId" | "status" | "createdAt"
    >,
  ) => BudgetChangeRequest;
  reviewBudgetChange: (
    id: string,
    status: BudgetChangeStatus,
    reviewerId: string,
    reviewNote?: string,
  ) => void;
  // time tracking config
  setTimeTrackingConfig: (patch: Partial<TimeTrackingConfig>) => void;
  toggleLockedWeek: (weekStart: string) => void;
}

let counter = 1000;
const nextId = (prefix: string) => `${prefix}_${++counter}`;

/**
 * Generate a UUID for entities that get persisted to Postgres.
 * Falls back to the legacy `prefix_<n>` format for SSR or browsers
 * without crypto.randomUUID.
 */
function uuidOrFallback(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return nextId(prefix);
}

export const useStore = create<Store>((set, get) => ({
  organization: ORG,
  currentUserId: CURRENT_USER_ID,
  users: USERS,
  clients: CLIENTS,
  projects: PROJECTS,
  phases: PHASES,
  tasks: TASKS,
  comments: COMMENTS,
  timeEntries: TIME_ENTRIES,
  files: FILES,
  taskDependencies: [],
  recurringRules: [],
  slaPolicies: [],
  customReports: [],
  invoices: INVOICES,
  automations: AUTOMATIONS,
  automationRuns: [],
  activityEvents: [],
  quotes: QUOTES,
  timesheetSubmissions: TIMESHEET_SUBMISSIONS,
  skills: SKILLS,
  userSkills: USER_SKILLS,
  baseCurrency: BASE_CURRENCY,
  fxRates: FX_RATES,
  budgetChanges: BUDGET_CHANGES,
  timeTrackingConfig: TIME_TRACKING_CONFIG,

  moveTask: (taskId, status, position) => {
    const prev = get().tasks.find((t) => t.id === taskId);
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status, position, updatedAt: new Date().toISOString() }
          : t,
      ),
    }));
    void import("@/lib/db/taskSync").then(({ syncTaskUpdate }) =>
      syncTaskUpdate(taskId, { status, position }),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "task",
        entityId: taskId,
        action:
          status === "done"
            ? "completed"
            : status === "in_review"
              ? "moved_to_review"
              : "status_changed",
        metadata: { status },
      }),
    );
    // Outbound webhook fan-out (Pass 6)
    if (prev && prev.status !== status) {
      const orgId = get().organization.id;
      void import("@/lib/integrations/events").then(({ emit }) => {
        emit({
          organizationId: orgId,
          eventType: "task.status_changed",
          payload: { taskId, from: prev.status, to: status },
        });
        if (status === "done") {
          emit({
            organizationId: orgId,
            eventType: "task.completed",
            payload: { taskId, projectId: prev.projectId },
          });
        }
      });
    }
    // Deliverable-approved email when a client-visible task flips to done
    if (status === "done" && prev && prev.status !== "done") {
      const updated = get().tasks.find((t) => t.id === taskId);
      if (updated?.clientVisible) {
        void import("@/lib/db/notify").then(({ notifyDeliverableApproved }) =>
          notifyDeliverableApproved(updated),
        );
      }
    }
  },

  updateTask: (taskId, patch) => {
    const prevTask = get().tasks.find((t) => t.id === taskId);
    const prevAssignees = prevTask?.assigneeIds ?? [];
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, ...patch, updatedAt: new Date().toISOString() }
          : t,
      ),
    }));
    void import("@/lib/db/taskSync").then(({ syncTaskUpdate }) =>
      syncTaskUpdate(taskId, patch),
    );
    // Direct task-assignment email (independent of automation engine)
    if (patch.assigneeIds !== undefined) {
      const updated = get().tasks.find((t) => t.id === taskId);
      if (updated) {
        void import("@/lib/db/notify").then(({ notifyTaskAssignment }) =>
          notifyTaskAssignment(updated, prevAssignees, patch.assigneeIds!),
        );
      }
    }
    // Deliverable-approved email when client-visible task is moved to done
    if (
      patch.status === "done" &&
      prevTask &&
      prevTask.status !== "done"
    ) {
      const updated = get().tasks.find((t) => t.id === taskId);
      if (updated?.clientVisible) {
        void import("@/lib/db/notify").then(({ notifyDeliverableApproved }) =>
          notifyDeliverableApproved(updated),
        );
      }
    }
    const interestingKeys = [
      "title",
      "status",
      "priority",
      "dueDate",
      "assigneeIds",
    ] as const;
    const changed = interestingKeys.find(
      (k) => (patch as Partial<Task>)[k] !== undefined,
    );
    if (changed) {
      const meta: Record<string, unknown> = {};
      if (patch.title !== undefined) meta.title = patch.title;
      if (patch.status !== undefined) meta.status = patch.status;
      if (patch.priority !== undefined) meta.priority = patch.priority;
      if (patch.dueDate !== undefined) meta.dueDate = patch.dueDate;
      if (patch.assigneeIds !== undefined)
        meta.assigneeCount = patch.assigneeIds.length;
      void import("@/lib/db/activitySync").then(({ logActivity }) =>
        logActivity({
          entityType: "task",
          entityId: taskId,
          action: `${changed}_changed`,
          metadata: meta,
        }),
      );
    }
  },

  addTask: (task) => {
    const project = get().projects.find((p) => p.id === task.projectId);
    const seq = get().tasks.filter((t) => t.projectId === task.projectId).length + 1;
    const taskId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : nextId("t");
    const newTask: Task = {
      ...task,
      id: taskId,
      code: `${project?.code ?? "TASK"}-T${String(seq).padStart(3, "0")}`,
      organizationId: get().organization.id,
      position: seq * 1000,
      subtasks: task.subtasks ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ tasks: [...state.tasks, newTask] }));
    void import("@/lib/db/taskSync").then(({ syncTaskInsert }) =>
      syncTaskInsert(newTask),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "task",
        entityId: newTask.id,
        action: "created",
        metadata: { title: newTask.title, projectId: newTask.projectId },
      }),
    );
    // Email any teammates assigned at creation time
    if (newTask.assigneeIds.length > 0) {
      void import("@/lib/db/notify").then(({ notifyTaskAssignment }) =>
        notifyTaskAssignment(newTask, [], newTask.assigneeIds),
      );
    }
    {
      const orgId = get().organization.id;
      void import("@/lib/integrations/events").then(({ emit }) =>
        emit({
          organizationId: orgId,
          eventType: "task.created",
          payload: {
            taskId: newTask.id,
            code: newTask.code,
            title: newTask.title,
            projectId: newTask.projectId,
            assigneeIds: newTask.assigneeIds,
          },
        }),
      );
    }
    return newTask;
  },

  removeTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      comments: state.comments.filter((c) => c.taskId !== taskId),
      timeEntries: state.timeEntries.filter((e) => e.taskId !== taskId),
    }));
    void import("@/lib/db/taskSync").then(({ syncTaskDelete }) =>
      syncTaskDelete(taskId),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "task",
        entityId: taskId,
        action: "deleted",
      }),
    );
  },

  duplicateTask: (taskId) => {
    const original = get().tasks.find((t) => t.id === taskId);
    if (!original) return null;
    const project = get().projects.find((p) => p.id === original.projectId);
    const seq =
      get().tasks.filter((t) => t.projectId === original.projectId).length + 1;
    const newId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : nextId("t");
    const copy: Task = {
      ...original,
      id: newId,
      code: `${project?.code ?? "TASK"}-T${String(seq).padStart(3, "0")}`,
      title: `${original.title} (copy)`,
      status: "todo",
      actualHours: 0,
      commentCount: 0,
      attachmentCount: 0,
      subtasks: original.subtasks.map((s, i) => ({
        ...s,
        id: `${nextId("st")}_${i}`,
        done: false,
      })),
      subtasksDone: 0,
      position: seq * 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ tasks: [...state.tasks, copy] }));
    void import("@/lib/db/taskSync").then(({ syncTaskInsert }) =>
      syncTaskInsert(copy),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "task",
        entityId: copy.id,
        action: "duplicated",
        metadata: { fromTaskId: original.id },
      }),
    );
    return copy;
  },

  addTaskDependency: (taskId, dependsOnTaskId, type = "finish_to_start") => {
    if (taskId === dependsOnTaskId) return null;
    const state = get();
    // Prevent dupes + simple direct-cycle (A→B and B→A)
    const dupe = state.taskDependencies.some(
      (d) => d.taskId === taskId && d.dependsOnTaskId === dependsOnTaskId,
    );
    if (dupe) return null;
    const cycle = state.taskDependencies.some(
      (d) => d.taskId === dependsOnTaskId && d.dependsOnTaskId === taskId,
    );
    if (cycle) return null;
    const dep: TaskDependency = { taskId, dependsOnTaskId, type };
    set((s) => ({ taskDependencies: [...s.taskDependencies, dep] }));
    void import("@/lib/db/recordSync").then(({ syncTaskDependencyInsert }) =>
      syncTaskDependencyInsert(dep),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "task",
        entityId: taskId,
        action: "dependency_added",
        metadata: { dependsOnTaskId, type },
      }),
    );
    return dep;
  },

  removeTaskDependency: (taskId, dependsOnTaskId) => {
    set((s) => ({
      taskDependencies: s.taskDependencies.filter(
        (d) =>
          !(d.taskId === taskId && d.dependsOnTaskId === dependsOnTaskId),
      ),
    }));
    void import("@/lib/db/recordSync").then(({ syncTaskDependencyDelete }) =>
      syncTaskDependencyDelete(taskId, dependsOnTaskId),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "task",
        entityId: taskId,
        action: "dependency_removed",
        metadata: { dependsOnTaskId },
      }),
    );
  },

  addRecurringRule: (rule) => {
    const newRule: RecurringTaskRule = {
      ...rule,
      id: uuidOrFallback("rtr"),
      organizationId: get().organization.id,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ recurringRules: [...s.recurringRules, newRule] }));
    void import("@/lib/db/recordSync").then(({ syncRecurringRuleUpsert }) =>
      syncRecurringRuleUpsert(newRule),
    );
    return newRule;
  },

  toggleRecurringRule: (id) => {
    set((s) => ({
      recurringRules: s.recurringRules.map((r) =>
        r.id === id ? { ...r, isActive: !r.isActive } : r,
      ),
    }));
    const updated = get().recurringRules.find((r) => r.id === id);
    if (updated) {
      void import("@/lib/db/recordSync").then(({ syncRecurringRuleUpsert }) =>
        syncRecurringRuleUpsert(updated),
      );
    }
  },

  removeRecurringRule: (id) => {
    set((s) => ({
      recurringRules: s.recurringRules.filter((r) => r.id !== id),
    }));
    void import("@/lib/db/recordSync").then(({ syncRecurringRuleDelete }) =>
      syncRecurringRuleDelete(id),
    );
  },

  markRecurringRuleRun: (id, runAt) => {
    set((s) => ({
      recurringRules: s.recurringRules.map((r) =>
        r.id === id ? { ...r, lastRunAt: runAt } : r,
      ),
    }));
    const updated = get().recurringRules.find((r) => r.id === id);
    if (updated) {
      void import("@/lib/db/recordSync").then(({ syncRecurringRuleUpsert }) =>
        syncRecurringRuleUpsert(updated),
      );
    }
  },

  addSlaPolicy: (policy) => {
    const newPolicy: SlaPolicy = {
      ...policy,
      id: uuidOrFallback("sla"),
      organizationId: get().organization.id,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ slaPolicies: [...s.slaPolicies, newPolicy] }));
    void import("@/lib/db/recordSync").then(({ syncSlaPolicyUpsert }) =>
      syncSlaPolicyUpsert(newPolicy),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "client",
        entityId: newPolicy.clientId ?? newPolicy.organizationId,
        action: "sla_policy_created",
        metadata: { name: newPolicy.name },
      }),
    );
    return newPolicy;
  },

  updateSlaPolicy: (id, patch) => {
    set((s) => ({
      slaPolicies: s.slaPolicies.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    }));
    const updated = get().slaPolicies.find((p) => p.id === id);
    if (updated) {
      void import("@/lib/db/recordSync").then(({ syncSlaPolicyUpsert }) =>
        syncSlaPolicyUpsert(updated),
      );
    }
  },

  removeSlaPolicy: (id) => {
    set((s) => ({ slaPolicies: s.slaPolicies.filter((p) => p.id !== id) }));
    void import("@/lib/db/recordSync").then(({ syncSlaPolicyDelete }) =>
      syncSlaPolicyDelete(id),
    );
  },

  addCustomReport: (report) => {
    const newReport: CustomReport = {
      ...report,
      id: uuidOrFallback("rpt"),
      organizationId: get().organization.id,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ customReports: [newReport, ...s.customReports] }));
    void import("@/lib/db/recordSync").then(({ syncCustomReportUpsert }) =>
      syncCustomReportUpsert(newReport),
    );
    return newReport;
  },

  updateCustomReport: (id, patch) => {
    set((s) => ({
      customReports: s.customReports.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    }));
    const updated = get().customReports.find((r) => r.id === id);
    if (updated) {
      void import("@/lib/db/recordSync").then(({ syncCustomReportUpsert }) =>
        syncCustomReportUpsert(updated),
      );
    }
  },

  removeCustomReport: (id) => {
    set((s) => ({
      customReports: s.customReports.filter((r) => r.id !== id),
    }));
    void import("@/lib/db/recordSync").then(({ syncCustomReportDelete }) =>
      syncCustomReportDelete(id),
    );
  },

  addClient: (client) => {
    const seq = get().clients.length + 1;
    const id = uuidOrFallback("c");
    const newClient: Client = {
      ...client,
      id,
      organizationId: get().organization.id,
      code: `${client.name.slice(0, 3).toUpperCase()}-${String(seq).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ clients: [...state.clients, newClient] }));
    void import("@/lib/db/recordSync").then(({ syncClientInsert }) =>
      syncClientInsert(newClient),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "client",
        entityId: newClient.id,
        action: "created",
        metadata: { name: newClient.name },
      }),
    );
    return newClient;
  },

  updateClient: (clientId, patch) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, ...patch } : c,
      ),
    }));
    void import("@/lib/db/recordSync").then(({ syncClientUpdate }) =>
      syncClientUpdate(clientId, patch),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "client",
        entityId: clientId,
        action: "updated",
        metadata: { fields: Object.keys(patch) },
      }),
    );
  },

  addProject: (project) => {
    const client = get().clients.find((c) => c.id === project.clientId);
    const seq =
      get().projects.filter((p) => p.clientId === project.clientId).length + 1;
    const typeAbbr = {
      web_dev: "WEB",
      app_dev: "APP",
      digital_marketing: "MKT",
      branding: "BRD",
      maintenance: "MTN",
      other: "PRJ",
    }[project.type];
    const id = uuidOrFallback("p");
    const newProject: Project = {
      ...project,
      id,
      organizationId: get().organization.id,
      code: `${client?.code ?? "CLT"}-${typeAbbr}-${String(seq).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
      progress: 0,
      taskCounts: { total: 0, done: 0 },
      health: "green",
    };
    set((state) => ({ projects: [...state.projects, newProject] }));
    void import("@/lib/db/recordSync").then(({ syncProjectInsert }) =>
      syncProjectInsert(newProject),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "project",
        entityId: newProject.id,
        action: "created",
        metadata: { name: newProject.name, type: newProject.type },
      }),
    );
    return newProject;
  },

  updateProject: (projectId, patch) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, ...patch } : p,
      ),
    }));
    void import("@/lib/db/recordSync").then(({ syncProjectUpdate }) =>
      syncProjectUpdate(projectId, patch),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "project",
        entityId: projectId,
        action: "updated",
        metadata: { fields: Object.keys(patch) },
      }),
    );
  },

  addTimeEntry: (entry) => {
    const newEntry: TimeEntry = {
      ...entry,
      id: uuidOrFallback("te"),
    };
    set((state) => ({ timeEntries: [...state.timeEntries, newEntry] }));
    const orgId = get().organization.id;
    void import("@/lib/db/recordSync").then(({ syncTimeEntryInsert }) =>
      syncTimeEntryInsert(newEntry, orgId),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "task",
        entityId: newEntry.taskId,
        action: "time_logged",
        metadata: {
          minutes: newEntry.durationMinutes,
          billable: newEntry.billable,
        },
      }),
    );
    return newEntry;
  },

  addComment: (taskId, body) => {
    const newComment: Comment = {
      id: uuidOrFallback("cm"),
      taskId,
      authorId: get().currentUserId,
      body,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ comments: [...state.comments, newComment] }));
    const orgId = get().organization.id;
    void import("@/lib/db/recordSync").then(({ syncCommentInsert }) =>
      syncCommentInsert(newComment, orgId),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "comment",
        entityId: newComment.id,
        action: "added",
        metadata: { taskId: newComment.taskId, body: newComment.body.slice(0, 80) },
      }),
    );
    // Mention emails — fire on @handles inside the comment body
    void import("@/lib/db/notify").then(({ notifyMentions }) =>
      notifyMentions(newComment.body, newComment.taskId),
    );
    return newComment;
  },

  addInvoice: (invoice) => {
    const subtotal = invoice.lineItems.reduce((s, li) => s + li.amount, 0);
    const taxAmount = subtotal * invoice.taxRate;
    const total = subtotal + taxAmount;
    const newInvoice: Invoice = {
      ...invoice,
      id: uuidOrFallback("inv"),
      organizationId: get().organization.id,
      subtotal,
      taxAmount,
      total,
    };
    set((state) => ({ invoices: [...state.invoices, newInvoice] }));
    void import("@/lib/db/recordSync").then(({ syncInvoiceInsert }) =>
      syncInvoiceInsert(newInvoice),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "invoice",
        entityId: newInvoice.id,
        action: "created",
        metadata: { number: newInvoice.number, total: newInvoice.total },
      }),
    );
    {
      const orgId = get().organization.id;
      void import("@/lib/integrations/events").then(({ emit }) =>
        emit({
          organizationId: orgId,
          eventType: "invoice.created",
          payload: {
            invoiceId: newInvoice.id,
            number: newInvoice.number,
            total: newInvoice.total,
            currency: newInvoice.currency,
            clientId: newInvoice.clientId,
            projectId: newInvoice.projectId,
            type: newInvoice.type,
          },
        }),
      );
    }
    return newInvoice;
  },

  updateInvoiceStatus: (id, status) => {
    const prev = get().invoices.find((inv) => inv.id === id);
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              status,
              sentAt:
                status === "sent" && !inv.sentAt
                  ? new Date().toISOString()
                  : inv.sentAt,
              paidAt:
                status === "paid" && !inv.paidAt
                  ? new Date().toISOString()
                  : inv.paidAt,
              amountPaid: status === "paid" ? inv.total : inv.amountPaid,
            }
          : inv,
      ),
    }));
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "invoice",
        entityId: id,
        action:
          status === "sent"
            ? "sent"
            : status === "paid"
              ? "paid"
              : `status_${status}`,
      }),
    );
    // Mirror to Postgres
    void import("@/lib/db/recordSync").then(({ syncInvoiceStatus }) =>
      syncInvoiceStatus(id, status),
    );
    // Send the invoice email when it flips to "sent" for the first time
    if (status === "sent" && prev && prev.status !== "sent") {
      const sent = get().invoices.find((inv) => inv.id === id);
      if (sent) {
        void import("@/lib/db/notify").then(({ notifyInvoiceSent }) =>
          notifyInvoiceSent(sent),
        );
      }
    }
    if (prev && prev.status !== status) {
      const sent = get().invoices.find((inv) => inv.id === id);
      if (sent) {
        const orgId = get().organization.id;
        void import("@/lib/integrations/events").then(({ emit }) => {
          if (status === "sent") {
            emit({
              organizationId: orgId,
              eventType: "invoice.sent",
              payload: {
                invoiceId: id,
                number: sent.number,
                total: sent.total,
                clientId: sent.clientId,
              },
            });
          }
          if (status === "paid") {
            emit({
              organizationId: orgId,
              eventType: "invoice.paid",
              payload: {
                invoiceId: id,
                number: sent.number,
                total: sent.total,
                clientId: sent.clientId,
                paidAt: sent.paidAt,
              },
            });
          }
        });
      }
    }
  },

  toggleAutomation: (id) => {
    set((state) => ({
      automations: state.automations.map((a) =>
        a.id === id ? { ...a, isActive: !a.isActive } : a,
      ),
    }));
    const updated = get().automations.find((a) => a.id === id);
    if (updated) {
      void import("@/lib/db/recordSync").then(({ syncAutomationToggle }) =>
        syncAutomationToggle(id, updated.isActive),
      );
    }
  },

  addAutomation: (rule) => {
    const newRule: AutomationRule = {
      ...rule,
      id: uuidOrFallback("aut"),
      organizationId: get().organization.id,
      runCount: 0,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ automations: [newRule, ...state.automations] }));
    void import("@/lib/db/recordSync").then(({ syncAutomationUpsert }) =>
      syncAutomationUpsert(newRule),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "project",
        entityId: newRule.id,
        action: "automation_created",
        metadata: { name: newRule.name, category: newRule.category },
      }),
    );
    return newRule;
  },

  updateAutomation: (id, patch) => {
    set((state) => ({
      automations: state.automations.map((a) =>
        a.id === id ? { ...a, ...patch } : a,
      ),
    }));
    const updated = get().automations.find((a) => a.id === id);
    if (updated) {
      void import("@/lib/db/recordSync").then(({ syncAutomationUpsert }) =>
        syncAutomationUpsert(updated),
      );
    }
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "project",
        entityId: id,
        action: "automation_updated",
        metadata: { fields: Object.keys(patch) },
      }),
    );
  },

  removeAutomation: (id) => {
    set((state) => ({
      automations: state.automations.filter((a) => a.id !== id),
    }));
    void import("@/lib/db/recordSync").then(async ({ syncAutomationDelete }) => {
      await syncAutomationDelete(id);
    });
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "project",
        entityId: id,
        action: "automation_removed",
      }),
    );
  },

  updateQuoteStatus: (quoteId, status) => {
    set((state) => ({
      quotes: state.quotes.map((q) =>
        q.id === quoteId ? { ...q, status } : q,
      ),
    }));
    void import("@/lib/db/recordSync").then(({ syncQuoteStatus }) =>
      syncQuoteStatus(quoteId, status),
    );
  },

  setCurrentQuoteVersion: (quoteId, versionId) => {
    set((state) => ({
      quotes: state.quotes.map((q) =>
        q.id === quoteId ? { ...q, currentVersionId: versionId } : q,
      ),
    }));
    void import("@/lib/db/recordSync").then(({ syncQuoteCurrentVersion }) =>
      syncQuoteCurrentVersion(quoteId, versionId),
    );
  },

  addQuoteVersion: (quoteId, version) => {
    set((state) => ({
      quotes: state.quotes.map((q) =>
        q.id === quoteId
          ? {
              ...q,
              versions: [
                ...q.versions.map((v) =>
                  v.status === "sent" || v.status === "draft"
                    ? { ...v, status: "superseded" as const }
                    : v,
                ),
                version,
              ],
              currentVersionId: version.id,
            }
          : q,
      ),
    }));
    void import("@/lib/db/recordSync").then(
      ({ syncQuoteVersionInsert, syncQuoteCurrentVersion }) =>
        Promise.all([
          syncQuoteVersionInsert(quoteId, version),
          syncQuoteCurrentVersion(quoteId, version.id),
        ]),
    );
  },

  addQuote: (quote) => {
    const newQuote: Quote = {
      ...quote,
      id: uuidOrFallback("q"),
      organizationId: get().organization.id,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ quotes: [...state.quotes, newQuote] }));
    void import("@/lib/db/recordSync").then(({ syncQuoteInsert }) =>
      syncQuoteInsert(newQuote),
    );
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "project",
        entityId: newQuote.id,
        action: "quote_created",
        metadata: { number: newQuote.number, name: newQuote.name },
      }),
    );
    return newQuote;
  },

  convertQuoteToProject: (quoteId) => {
    const state = get();
    const quote = state.quotes.find((q) => q.id === quoteId);
    if (!quote) return null;
    const version = quote.versions.find(
      (v) => v.id === quote.currentVersionId,
    );
    if (!version) return null;
    const client = state.clients.find((c) => c.id === quote.clientId);
    if (!client) return null;

    // Group line items by category → phases
    const categories = Array.from(
      new Set(version.lineItems.map((l) => l.category)),
    );

    const seq =
      state.projects.filter((p) => p.clientId === quote.clientId).length + 1;
    const typeAbbr = {
      web_dev: "WEB",
      app_dev: "APP",
      digital_marketing: "MKT",
      branding: "BRD",
      maintenance: "MTN",
      other: "PRJ",
    }[quote.type];
    const projectId = uuidOrFallback("p");
    const orgId = state.organization.id;
    const project: Project = {
      id: projectId,
      organizationId: orgId,
      clientId: quote.clientId,
      code: `${client.code}-${typeAbbr}-${String(seq).padStart(3, "0")}`,
      name: quote.name,
      type: quote.type,
      status: "active",
      priority: "high",
      projectManagerId: quote.createdBy,
      billingModel:
        version.lineItems.some((l) => l.unit === "hours")
          ? "time_and_materials"
          : "milestone",
      totalBudget: version.total,
      estimatedHours: version.lineItems.reduce(
        (s, l) => s + (l.unit === "hours" ? l.quantity : l.quantity * 40),
        0,
      ),
      description: quote.description,
      health: "green",
      tags: [],
      progress: 0,
      taskCounts: { total: version.lineItems.length, done: 0 },
      createdAt: new Date().toISOString(),
    };

    const phases: Phase[] = categories.map((name, i) => ({
      id: uuidOrFallback("ph"),
      projectId,
      name,
      position: i + 1,
      isComplete: false,
    }));

    const tasks: Task[] = version.lineItems.map((line, i) => {
      const phase = phases.find((p) => p.name === line.category)!;
      return {
        id: uuidOrFallback("t"),
        organizationId: orgId,
        projectId,
        phaseId: phase.id,
        code: `${project.code}-T${String(i + 1).padStart(3, "0")}`,
        title: line.description,
        description: `From quote ${quote.number} v${version.versionNumber}.`,
        status: "todo",
        priority: "medium",
        taskType: line.category,
        estimatedHours:
          line.unit === "hours" ? line.quantity : line.quantity * 40,
        actualHours: 0,
        assigneeIds: [],
        clientVisible: true,
        position: (i + 1) * 1000,
        tags: [line.category],
        subtasks: [],
        commentCount: 0,
        attachmentCount: 0,
        subtaskCount: 0,
        subtasksDone: 0,
        createdBy: quote.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    set((s) => ({
      projects: [...s.projects, project],
      phases: [...s.phases, ...phases],
      tasks: [...s.tasks, ...tasks],
      quotes: s.quotes.map((q) =>
        q.id === quoteId
          ? {
              ...q,
              status: "converted" as const,
              convertedToProjectId: projectId,
            }
          : q,
      ),
    }));

    // Dual-write to Postgres in order: project → phases → tasks
    void (async () => {
      const recordSync = await import("@/lib/db/recordSync");
      await recordSync.syncProjectInsert(project);
      await recordSync.syncPhasesInsert(phases, orgId);
      await recordSync.syncTasksInsert(tasks);
    })();

    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "project",
        entityId: project.id,
        action: "converted_from_quote",
        metadata: {
          quoteNumber: quote.number,
          phaseCount: phases.length,
          taskCount: tasks.length,
        },
      }),
    );

    return project;
  },

  setTimesheetStatus: (id, status, review) => {
    set((state) => ({
      timesheetSubmissions: state.timesheetSubmissions.map((ts) =>
        ts.id === id
          ? {
              ...ts,
              status,
              submittedAt:
                status === "submitted" && !ts.submittedAt
                  ? new Date().toISOString()
                  : ts.submittedAt,
              reviewedAt:
                status === "approved" || status === "rejected"
                  ? new Date().toISOString()
                  : ts.reviewedAt,
              reviewedBy: review?.reviewerId ?? ts.reviewedBy,
              rejectionReason:
                status === "rejected"
                  ? review?.rejectionReason
                  : undefined,
            }
          : ts,
      ),
    }));
    void import("@/lib/db/activitySync").then(({ logActivity }) =>
      logActivity({
        entityType: "task",
        entityId: id,
        action: `timesheet_${status}`,
        metadata: {
          rejectionReason: review?.rejectionReason,
        },
      }),
    );
    void import("@/lib/db/recordSync").then(({ syncTimesheetStatus }) =>
      syncTimesheetStatus(id, status),
    );
  },

  setUserSkill: (userId, skill, proficiency) => {
    set((state) => {
      const existing = state.userSkills.find(
        (us) => us.userId === userId && us.skill === skill,
      );
      if (proficiency === 0) {
        return {
          userSkills: state.userSkills.filter(
            (us) => !(us.userId === userId && us.skill === skill),
          ),
        };
      }
      if (existing) {
        return {
          userSkills: state.userSkills.map((us) =>
            us.userId === userId && us.skill === skill
              ? { ...us, proficiency }
              : us,
          ),
        };
      }
      return {
        userSkills: [...state.userSkills, { userId, skill, proficiency }],
      };
    });
    const orgId = get().organization.id;
    void import("@/lib/db/recordSync").then(({ syncUserSkillUpsert }) =>
      syncUserSkillUpsert(userId, skill, proficiency, orgId),
    );
  },

  setBaseCurrency: (currency) => {
    set({ baseCurrency: currency });
    const orgId = get().organization.id;
    void import("@/lib/db/recordSync").then(({ syncBaseCurrency }) =>
      syncBaseCurrency(currency, orgId),
    );
  },

  setFxRate: (currency, rateToBase) => {
    const updatedAt = new Date().toISOString();
    set((state) => {
      const existing = state.fxRates.find((r) => r.currency === currency);
      if (existing) {
        return {
          fxRates: state.fxRates.map((r) =>
            r.currency === currency
              ? { ...r, rateToBase, updatedAt }
              : r,
          ),
        };
      }
      return {
        fxRates: [
          ...state.fxRates,
          { currency, rateToBase, updatedAt },
        ],
      };
    });
    const orgId = get().organization.id;
    void import("@/lib/db/recordSync").then(({ syncFxRateUpsert }) =>
      syncFxRateUpsert({ currency, rateToBase, updatedAt }, orgId),
    );
  },

  addBudgetChange: (req) => {
    const newReq: BudgetChangeRequest = {
      ...req,
      id: uuidOrFallback("bcr"),
      organizationId: get().organization.id,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ budgetChanges: [...state.budgetChanges, newReq] }));
    void import("@/lib/db/recordSync").then(({ syncBudgetChangeInsert }) =>
      syncBudgetChangeInsert(newReq),
    );
    return newReq;
  },

  reviewBudgetChange: (id, status, reviewerId, reviewNote) => {
    let projectId: string | undefined;
    let delta = 0;
    let newTotalBudget: number | undefined;
    set((state) => {
      const req = state.budgetChanges.find((r) => r.id === id);
      if (!req) return state;
      projectId = req.projectId;
      delta = req.delta;
      const reviewedAt = new Date().toISOString();
      const nextRequests = state.budgetChanges.map((r) =>
        r.id === id
          ? { ...r, status, reviewedAt, reviewedBy: reviewerId, reviewNote }
          : r,
      );
      if (status === "approved") {
        const project = state.projects.find((p) => p.id === req.projectId);
        if (project) {
          newTotalBudget = (project.totalBudget ?? 0) + req.delta;
        }
        return {
          budgetChanges: nextRequests,
          projects: state.projects.map((p) =>
            p.id === req.projectId
              ? { ...p, totalBudget: (p.totalBudget ?? 0) + req.delta }
              : p,
          ),
        };
      }
      return { budgetChanges: nextRequests };
    });
    if (projectId && newTotalBudget !== undefined) {
      // Mirror the bumped budget to Postgres so refreshes / other tabs see it
      void import("@/lib/db/recordSync").then(({ syncProjectUpdate }) =>
        syncProjectUpdate(projectId!, { totalBudget: newTotalBudget }),
      );
    }
    // Always mirror the review status to the budget_change_requests row
    void import("@/lib/db/recordSync").then(({ syncBudgetChangeReview }) =>
      syncBudgetChangeReview(id, status, reviewerId, reviewNote),
    );
    if (projectId) {
      void import("@/lib/db/activitySync").then(({ logActivity }) =>
        logActivity({
          entityType: "project",
          entityId: projectId!,
          action: `budget_change_${status}`,
          metadata: { delta, reviewNote },
        }),
      );
    }
  },

  setTimeTrackingConfig: (patch) => {
    set((state) => ({
      timeTrackingConfig: { ...state.timeTrackingConfig, ...patch },
    }));
    const orgId = get().organization.id;
    const updated = get().timeTrackingConfig;
    void import("@/lib/db/recordSync").then(({ syncTimeTrackingConfig }) =>
      syncTimeTrackingConfig(updated, orgId),
    );
  },

  toggleLockedWeek: (weekStart) => {
    set((state) => {
      const locked = state.timeTrackingConfig.lockedWeeks.includes(weekStart);
      return {
        timeTrackingConfig: {
          ...state.timeTrackingConfig,
          lockedWeeks: locked
            ? state.timeTrackingConfig.lockedWeeks.filter(
                (w) => w !== weekStart,
              )
            : [...state.timeTrackingConfig.lockedWeeks, weekStart],
        },
      };
    });
    const orgId = get().organization.id;
    const updated = get().timeTrackingConfig;
    void import("@/lib/db/recordSync").then(({ syncTimeTrackingConfig }) =>
      syncTimeTrackingConfig(updated, orgId),
    );
  },
}));

export function useUser(userId: string | undefined) {
  return useStore((s) => (userId ? s.users.find((u) => u.id === userId) : undefined));
}

export function useCurrentUser() {
  return useStore((s) => s.users.find((u) => u.id === s.currentUserId)!);
}

/**
 * Derive a filtered/mapped value from the store with shallow equality.
 * Use this for selectors that return new arrays/objects to avoid
 * useSyncExternalStore "result of getSnapshot should be cached" errors.
 */
export function useStoreShallow<T>(selector: (s: ReturnType<typeof useStore.getState>) => T): T {
  return useStore(useShallow(selector));
}
