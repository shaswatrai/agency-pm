"use client";

/**
 * Activity log writer.
 *
 * Each meaningful mutation (task created / status changed / comment
 * added / time logged / approval received) appends one row to
 * activity_log in Postgres + an in-memory mirror so the dashboard +
 * project Activity tab can read it instantly.
 */
import { useRuntimeConfig } from "@/lib/config/runtime";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useStore } from "@/lib/db/store";
import type { ActivityEvent } from "@/types/domain";

export type ActivityEntityType =
  | "task"
  | "comment"
  | "project"
  | "client"
  | "file"
  | "invoice";

export interface LogActivityInput {
  entityType: ActivityEntityType;
  entityId: string;
  action: string; // e.g. "created", "status_changed", "completed"
  metadata?: Record<string, unknown>;
}

function uuidOrFallback() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  const id = uuidOrFallback();
  const orgId = useStore.getState().organization.id;
  const actorId = useStore.getState().currentUserId;
  const createdAt = new Date().toISOString();

  // 1. Always update the in-memory mirror so the UI is reactive
  const event: ActivityEvent = {
    id,
    actorId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    metadata: input.metadata,
    createdAt,
  };
  useStore.setState((state) => {
    const arr = (state as unknown as { activityEvents?: ActivityEvent[] })
      .activityEvents ?? [];
    return {
      activityEvents: [event, ...arr].slice(0, 200),
    } as object;
  });

  // 2. Mirror to Postgres if Connected
  const cfg = useRuntimeConfig.getState();
  if (!cfg.useSupabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  await supabase.from("activity_log").insert({
    id,
    organization_id: orgId,
    actor_id: actorId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    metadata: input.metadata ?? {},
  });
}
