export type TaskStatus =
  | "todo"
  | "in_progress"
  | "in_review"
  | "revisions"
  | "done"
  | "blocked";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type ProjectHealth = "green" | "yellow" | "red";

export const STATUS_META: Record<
  TaskStatus,
  { label: string; dot: string; pill: string; ring: string }
> = {
  todo: {
    label: "To Do",
    dot: "bg-status-todo",
    pill: "bg-status-todo/12 text-status-todo dark:bg-status-todo/20",
    ring: "ring-status-todo/30",
  },
  in_progress: {
    label: "In Progress",
    dot: "bg-status-progress",
    pill: "bg-status-progress/12 text-status-progress dark:bg-status-progress/25",
    ring: "ring-status-progress/30",
  },
  in_review: {
    label: "In Review",
    dot: "bg-status-review",
    pill: "bg-status-review/12 text-status-review dark:bg-status-review/25",
    ring: "ring-status-review/30",
  },
  revisions: {
    label: "Revisions",
    dot: "bg-status-revisions",
    pill: "bg-status-revisions/15 text-status-revisions dark:bg-status-revisions/30",
    ring: "ring-status-revisions/30",
  },
  done: {
    label: "Done",
    dot: "bg-status-done",
    pill: "bg-status-done/12 text-status-done dark:bg-status-done/25",
    ring: "ring-status-done/30",
  },
  blocked: {
    label: "Blocked",
    dot: "bg-status-blocked",
    pill: "bg-status-blocked/12 text-status-blocked dark:bg-status-blocked/25",
    ring: "ring-status-blocked/30",
  },
};

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; dot: string; pill: string }
> = {
  low: {
    label: "Low",
    dot: "bg-priority-low",
    pill: "bg-priority-low/12 text-priority-low dark:bg-priority-low/25",
  },
  medium: {
    label: "Medium",
    dot: "bg-priority-medium",
    pill: "bg-priority-medium/12 text-priority-medium dark:bg-priority-medium/25",
  },
  high: {
    label: "High",
    dot: "bg-priority-high",
    pill: "bg-priority-high/12 text-priority-high dark:bg-priority-high/25",
  },
  urgent: {
    label: "Urgent",
    dot: "bg-priority-urgent",
    pill: "bg-priority-urgent/15 text-priority-urgent dark:bg-priority-urgent/30",
  },
};

export const HEALTH_META: Record<
  ProjectHealth,
  { label: string; dot: string; pill: string }
> = {
  green: {
    label: "On Track",
    dot: "bg-status-done",
    pill: "bg-status-done/12 text-status-done dark:bg-status-done/25",
  },
  yellow: {
    label: "At Risk",
    dot: "bg-status-revisions",
    pill: "bg-status-revisions/15 text-status-revisions dark:bg-status-revisions/30",
  },
  red: {
    label: "Off Track",
    dot: "bg-status-blocked",
    pill: "bg-status-blocked/12 text-status-blocked dark:bg-status-blocked/25",
  },
};

export const KANBAN_COLUMNS: TaskStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "revisions",
  "done",
];
