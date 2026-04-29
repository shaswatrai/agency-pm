"use client";

/**
 * Supabase Realtime — replaces the BroadcastChannel transport when
 * Connected mode is on.
 *
 * Subscribes to postgres_changes on:
 *   - tasks (INSERT / UPDATE / DELETE)
 *   - comments (INSERT)
 *   - time_entries (INSERT)
 *   - task_assignees (INSERT / DELETE)
 *   - activity_log (INSERT) — drives the dashboard live activity feed
 *   - files (INSERT) — multi-user upload sync
 *
 * Echo dedupe: when the local tab dual-writes a row, that row arrives
 * back via realtime. We compare the incoming row to the local store and
 * skip if it's already there with the same shape.
 */
import type {
  RealtimeChannel,
  SupabaseClient,
} from "@supabase/supabase-js";
import { useStore } from "@/lib/db/store";
import type {
  ActivityEvent,
  Comment,
  ProjectFile,
  Task,
  TimeEntry,
} from "@/types/domain";

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
}

interface DbComment {
  id: string;
  organization_id: string;
  task_id: string;
  parent_comment_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
}

interface DbTimeEntry {
  id: string;
  organization_id: string;
  task_id: string;
  user_id: string;
  entry_date: string;
  duration_minutes: number;
  description: string | null;
  billable: boolean;
}

interface DbActivity {
  id: string;
  organization_id: string;
  actor_id: string | null;
  entity_type: ActivityEvent["entityType"];
  entity_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface DbFile {
  id: string;
  organization_id: string;
  project_id: string;
  task_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  version: number;
  uploaded_by: string | null;
  client_visible: boolean;
  created_at: string;
}

function dbTaskToLocal(row: DbTask): Task {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    phaseId: row.phase_id ?? undefined,
    code: row.code,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    priority: row.priority,
    taskType: row.task_type ?? undefined,
    dueDate: row.due_date ?? undefined,
    estimatedHours: row.estimated_hours ?? undefined,
    actualHours: 0,
    storyPoints: row.story_points ?? undefined,
    assigneeIds: [],
    reviewerId: undefined,
    clientVisible: row.client_visible,
    position: row.position,
    tags: row.tags ?? [],
    figmaUrl: row.figma_url ?? undefined,
    repoUrl: row.repo_url ?? undefined,
    subtasks: [],
    commentCount: 0,
    attachmentCount: 0,
    subtaskCount: 0,
    subtasksDone: 0,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbCommentToLocal(row: DbComment): Comment {
  return {
    id: row.id,
    taskId: row.task_id,
    parentCommentId: row.parent_comment_id ?? undefined,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function dbTimeEntryToLocal(row: DbTimeEntry): TimeEntry {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    date: row.entry_date,
    durationMinutes: row.duration_minutes,
    description: row.description ?? "",
    billable: row.billable,
  };
}

let activeChannel: RealtimeChannel | null = null;

export function startRealtime(supabase: SupabaseClient, orgId: string) {
  if (activeChannel) return; // already subscribed

  const channel = supabase
    .channel(`org:${orgId}`)
    // Tasks: INSERT
    .on(
      "postgres_changes" as unknown as never,
      { event: "INSERT", schema: "public", table: "tasks" },
      (payload: { new: DbTask }) => {
        const row = payload.new;
        if (row.organization_id !== orgId) return;
        const incoming = dbTaskToLocal(row);
        useStore.setState((state) => {
          if (state.tasks.some((t) => t.id === incoming.id)) return state;
          return { tasks: [...state.tasks, incoming] };
        });
      },
    )
    .on(
      "postgres_changes" as unknown as never,
      { event: "UPDATE", schema: "public", table: "tasks" },
      (payload: { new: DbTask }) => {
        const row = payload.new;
        if (row.organization_id !== orgId) return;
        useStore.setState((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === row.id
              ? {
                  ...t,
                  title: row.title,
                  description: row.description ?? undefined,
                  status: row.status,
                  priority: row.priority,
                  taskType: row.task_type ?? undefined,
                  dueDate: row.due_date ?? undefined,
                  estimatedHours: row.estimated_hours ?? undefined,
                  storyPoints: row.story_points ?? undefined,
                  clientVisible: row.client_visible,
                  position: row.position,
                  tags: row.tags ?? [],
                  figmaUrl: row.figma_url ?? undefined,
                  repoUrl: row.repo_url ?? undefined,
                  phaseId: row.phase_id ?? undefined,
                  updatedAt: row.updated_at,
                }
              : t,
          ),
        }));
      },
    )
    .on(
      "postgres_changes" as unknown as never,
      { event: "DELETE", schema: "public", table: "tasks" },
      (payload: { old: { id: string } }) => {
        const id = payload.old?.id;
        if (!id) return;
        useStore.setState((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
      },
    )
    // Comments: INSERT
    .on(
      "postgres_changes" as unknown as never,
      { event: "INSERT", schema: "public", table: "comments" },
      (payload: { new: DbComment }) => {
        const row = payload.new;
        if (row.organization_id !== orgId) return;
        const incoming = dbCommentToLocal(row);
        useStore.setState((state) => {
          if (state.comments.some((c) => c.id === incoming.id)) return state;
          return {
            comments: [...state.comments, incoming],
            tasks: state.tasks.map((t) =>
              t.id === incoming.taskId
                ? { ...t, commentCount: t.commentCount + 1 }
                : t,
            ),
          };
        });
      },
    )
    // Time entries: INSERT
    .on(
      "postgres_changes" as unknown as never,
      { event: "INSERT", schema: "public", table: "time_entries" },
      (payload: { new: DbTimeEntry }) => {
        const row = payload.new;
        if (row.organization_id !== orgId) return;
        const incoming = dbTimeEntryToLocal(row);
        useStore.setState((state) => {
          if (state.timeEntries.some((e) => e.id === incoming.id))
            return state;
          return {
            timeEntries: [...state.timeEntries, incoming],
            tasks: state.tasks.map((t) =>
              t.id === incoming.taskId
                ? {
                    ...t,
                    actualHours:
                      t.actualHours + incoming.durationMinutes / 60,
                  }
                : t,
            ),
          };
        });
      },
    )
    // Activity log: INSERT — feeds the dashboard activity feed across users
    .on(
      "postgres_changes" as unknown as never,
      { event: "INSERT", schema: "public", table: "activity_log" },
      (payload: { new: DbActivity }) => {
        const row = payload.new;
        if (row.organization_id !== orgId) return;
        const event: ActivityEvent = {
          id: row.id,
          actorId: row.actor_id ?? undefined,
          entityType: row.entity_type,
          entityId: row.entity_id,
          action: row.action,
          metadata: row.metadata ?? undefined,
          createdAt: row.created_at,
        };
        useStore.setState((state) => {
          if (state.activityEvents.some((e) => e.id === event.id)) return state;
          return {
            activityEvents: [event, ...state.activityEvents].slice(0, 200),
          };
        });
      },
    )
    // Files: INSERT — multi-user upload sync on Files page + task drawer
    .on(
      "postgres_changes" as unknown as never,
      { event: "INSERT", schema: "public", table: "files" },
      (payload: { new: DbFile }) => {
        const row = payload.new;
        if (row.organization_id !== orgId) return;
        const incoming: ProjectFile = {
          id: row.id,
          projectId: row.project_id,
          taskId: row.task_id ?? undefined,
          fileName: row.file_name,
          mimeType: row.mime_type ?? undefined,
          sizeBytes: row.size_bytes,
          version: row.version,
          uploadedBy: row.uploaded_by ?? undefined,
          clientVisible: row.client_visible,
          createdAt: row.created_at,
          storagePath: row.storage_path,
        };
        useStore.setState((state) => {
          if (state.files.some((f) => f.id === incoming.id)) return state;
          return {
            files: [...state.files, incoming],
            tasks: incoming.taskId
              ? state.tasks.map((t) =>
                  t.id === incoming.taskId
                    ? { ...t, attachmentCount: t.attachmentCount + 1 }
                    : t,
                )
              : state.tasks,
          };
        });
      },
    )
    // Task assignee changes
    .on(
      "postgres_changes" as unknown as never,
      { event: "INSERT", schema: "public", table: "task_assignees" },
      (payload: { new: { task_id: string; user_id: string } }) => {
        const { task_id, user_id } = payload.new;
        useStore.setState((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === task_id && !t.assigneeIds.includes(user_id)
              ? { ...t, assigneeIds: [...t.assigneeIds, user_id] }
              : t,
          ),
        }));
      },
    )
    .on(
      "postgres_changes" as unknown as never,
      { event: "DELETE", schema: "public", table: "task_assignees" },
      (payload: { old: { task_id: string; user_id: string } }) => {
        const { task_id, user_id } = payload.old;
        useStore.setState((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === task_id
              ? {
                  ...t,
                  assigneeIds: t.assigneeIds.filter((id) => id !== user_id),
                }
              : t,
          ),
        }));
      },
    )
    .subscribe();

  activeChannel = channel;
}

export function stopRealtime(supabase: SupabaseClient) {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
}
