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
  TASKS,
  TIME_ENTRIES,
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
  Task,
  TimeEntry,
  User,
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
