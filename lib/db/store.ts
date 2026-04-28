"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  AUTOMATIONS,
  CLIENTS,
  COMMENTS,
  CURRENT_USER_ID,
  FILES,
  INVOICES,
  ORG,
  PHASES,
  PROJECTS,
  QUOTES,
  SKILLS,
  TASKS,
  TIMESHEET_SUBMISSIONS,
  TIME_ENTRIES,
  USER_SKILLS,
  USERS,
} from "@/lib/db/seed";
import type {
  AutomationRule,
  Client,
  Comment,
  Invoice,
  InvoiceStatus,
  Phase,
  Project,
  ProjectFile,
  Quote,
  QuoteStatus,
  Task,
  TimeEntry,
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
  invoices: Invoice[];
  automations: AutomationRule[];
  quotes: Quote[];
  timesheetSubmissions: TimesheetSubmission[];
  skills: string[];
  userSkills: UserSkill[];

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
  // client ops
  addClient: (client: Omit<Client, "id" | "organizationId" | "code" | "createdAt">) => Client;
  // project ops
  addProject: (project: Omit<Project, "id" | "organizationId" | "code" | "createdAt" | "progress" | "taskCounts" | "health">) => Project;
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
}

let counter = 1000;
const nextId = (prefix: string) => `${prefix}_${++counter}`;

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
  invoices: INVOICES,
  automations: AUTOMATIONS,
  quotes: QUOTES,
  timesheetSubmissions: TIMESHEET_SUBMISSIONS,
  skills: SKILLS,
  userSkills: USER_SKILLS,

  moveTask: (taskId, status, position) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status, position, updatedAt: new Date().toISOString() }
          : t,
      ),
    }));
  },

  updateTask: (taskId, patch) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, ...patch, updatedAt: new Date().toISOString() }
          : t,
      ),
    }));
  },

  addTask: (task) => {
    const project = get().projects.find((p) => p.id === task.projectId);
    const seq = get().tasks.filter((t) => t.projectId === task.projectId).length + 1;
    const newTask: Task = {
      ...task,
      id: nextId("t"),
      code: `${project?.code ?? "TASK"}-T${String(seq).padStart(3, "0")}`,
      organizationId: ORG.id,
      position: seq * 1000,
      subtasks: task.subtasks ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ tasks: [...state.tasks, newTask] }));
    return newTask;
  },

  removeTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      comments: state.comments.filter((c) => c.taskId !== taskId),
      timeEntries: state.timeEntries.filter((e) => e.taskId !== taskId),
    }));
  },

  duplicateTask: (taskId) => {
    const original = get().tasks.find((t) => t.id === taskId);
    if (!original) return null;
    const project = get().projects.find((p) => p.id === original.projectId);
    const seq =
      get().tasks.filter((t) => t.projectId === original.projectId).length + 1;
    const copy: Task = {
      ...original,
      id: nextId("t"),
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
    return copy;
  },

  addClient: (client) => {
    const seq = get().clients.length + 1;
    const newClient: Client = {
      ...client,
      id: nextId("c"),
      organizationId: ORG.id,
      code: `${client.name.slice(0, 3).toUpperCase()}-${String(seq).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ clients: [...state.clients, newClient] }));
    return newClient;
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
    const newProject: Project = {
      ...project,
      id: nextId("p"),
      organizationId: ORG.id,
      code: `${client?.code ?? "CLT"}-${typeAbbr}-${String(seq).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
      progress: 0,
      taskCounts: { total: 0, done: 0 },
      health: "green",
    };
    set((state) => ({ projects: [...state.projects, newProject] }));
    return newProject;
  },

  addTimeEntry: (entry) => {
    const newEntry: TimeEntry = { ...entry, id: nextId("te") };
    set((state) => ({ timeEntries: [...state.timeEntries, newEntry] }));
    return newEntry;
  },

  addComment: (taskId, body) => {
    const newComment: Comment = {
      id: nextId("cm"),
      taskId,
      authorId: get().currentUserId,
      body,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ comments: [...state.comments, newComment] }));
    return newComment;
  },

  addInvoice: (invoice) => {
    const subtotal = invoice.lineItems.reduce((s, li) => s + li.amount, 0);
    const taxAmount = subtotal * invoice.taxRate;
    const total = subtotal + taxAmount;
    const newInvoice: Invoice = {
      ...invoice,
      id: nextId("inv"),
      organizationId: ORG.id,
      subtotal,
      taxAmount,
      total,
    };
    set((state) => ({ invoices: [...state.invoices, newInvoice] }));
    return newInvoice;
  },

  updateInvoiceStatus: (id, status) => {
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
  },

  toggleAutomation: (id) => {
    set((state) => ({
      automations: state.automations.map((a) =>
        a.id === id ? { ...a, isActive: !a.isActive } : a,
      ),
    }));
  },

  updateQuoteStatus: (quoteId, status) => {
    set((state) => ({
      quotes: state.quotes.map((q) =>
        q.id === quoteId ? { ...q, status } : q,
      ),
    }));
  },

  setCurrentQuoteVersion: (quoteId, versionId) => {
    set((state) => ({
      quotes: state.quotes.map((q) =>
        q.id === quoteId ? { ...q, currentVersionId: versionId } : q,
      ),
    }));
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
  },

  addQuote: (quote) => {
    const newQuote: Quote = {
      ...quote,
      id: nextId("q"),
      organizationId: ORG.id,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ quotes: [...state.quotes, newQuote] }));
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
    const projectId = nextId("p");
    const project: Project = {
      id: projectId,
      organizationId: ORG.id,
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
      id: `${projectId}_phase_${i + 1}`,
      projectId,
      name,
      position: i + 1,
      isComplete: false,
    }));

    const tasks: Task[] = version.lineItems.map((line, i) => {
      const phase = phases.find((p) => p.name === line.category)!;
      return {
        id: nextId("t"),
        organizationId: ORG.id,
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
