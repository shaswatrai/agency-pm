"use client";

import type {
  IntegrationEventType,
  WebhookDelivery,
  WebhookSubscription,
} from "@/types/domain";
import { useIntegrationsStore } from "./store";

/**
 * Match an event name against a glob filter list.
 *   ["*"]                  → everything
 *   ["task.*"]             → all task events
 *   ["task.completed"]     → only that event
 *   ["task.*","invoice.*"] → task or invoice
 */
export function matchesFilter(event: string, filter: string[]): boolean {
  if (!filter.length) return false;
  for (const pattern of filter) {
    if (pattern === "*") return true;
    if (pattern === event) return true;
    if (pattern.endsWith(".*") && event.startsWith(pattern.slice(0, -1))) {
      return true;
    }
  }
  return false;
}

export interface EmitOptions {
  organizationId: string;
  eventType: IntegrationEventType;
  payload: Record<string, unknown>;
  /** Stable key for dedupe; defaults to a fresh UUID */
  idempotencyKey?: string;
}

/**
 * Fan an event out to every active subscription whose filter matches.
 * In demo mode this enqueues into the in-memory webhook_deliveries
 * collection; the cron tick (or "Flush queue" button in settings) drains
 * it. In Supabase mode the route handler will mirror writes to Postgres
 * so a server-side worker can pick them up.
 */
export function emit(opts: EmitOptions): WebhookDelivery[] {
  const store = useIntegrationsStore.getState();
  const subs = store.webhookSubscriptions.filter(
    (s) =>
      s.organizationId === opts.organizationId &&
      s.isActive &&
      matchesFilter(opts.eventType, s.eventFilter),
  );

  const created: WebhookDelivery[] = [];
  const idempotencyKey = opts.idempotencyKey ?? crypto.randomUUID();

  for (const sub of subs) {
    const delivery: WebhookDelivery = {
      id: crypto.randomUUID(),
      subscriptionId: sub.id,
      organizationId: opts.organizationId,
      eventType: opts.eventType,
      eventId: crypto.randomUUID(),
      idempotencyKey: `${sub.id}:${idempotencyKey}`,
      payload: opts.payload,
      status: "pending",
      attemptCount: 0,
      nextAttemptAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    store.enqueueDelivery(delivery);
    created.push(delivery);
  }
  return created;
}

/**
 * Subscriptions whose filter would match this event — used by the UI
 * to preview "if I send X, who hears about it?"
 */
export function previewMatches(
  organizationId: string,
  eventType: IntegrationEventType,
): WebhookSubscription[] {
  const store = useIntegrationsStore.getState();
  return store.webhookSubscriptions.filter(
    (s) =>
      s.organizationId === organizationId &&
      s.isActive &&
      matchesFilter(eventType, s.eventFilter),
  );
}
