import type { WebhookDelivery, WebhookSubscription } from "@/types/domain";
import { signPayload } from "./sign";

export interface DeliveryAttempt {
  status: "delivered" | "failed";
  responseStatus?: number;
  responseBody?: string;
  signature: string;
  durationMs: number;
  error?: string;
}

/**
 * Single HTTP attempt against a subscription target. The caller decides
 * whether to retry — this fn just executes one round-trip and reports.
 *
 * Body envelope:
 *   { id, type, occurred_at, organization_id, data }
 * Headers:
 *   Content-Type: application/json
 *   User-Agent: AtelierWebhooks/1.0
 *   X-Atelier-Event: <event_type>
 *   X-Atelier-Delivery: <delivery id>
 *   X-Atelier-Signature: t={ts},v1={hmac_sha256_hex}
 *   ...plus any custom_headers from the subscription
 */
export async function deliverOnce(
  sub: WebhookSubscription,
  delivery: WebhookDelivery,
  hmacSecret: string,
): Promise<DeliveryAttempt> {
  const startedAt = Date.now();
  const envelope = {
    id: delivery.eventId,
    type: delivery.eventType,
    occurred_at: delivery.createdAt,
    organization_id: delivery.organizationId,
    data: delivery.payload,
  };
  const rawBody = JSON.stringify(envelope);
  const signature = await signPayload(hmacSecret, rawBody);

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "AtelierWebhooks/1.0",
    "x-atelier-event": delivery.eventType,
    "x-atelier-delivery": delivery.id,
    "x-atelier-signature": signature,
    ...sub.customHeaders,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), sub.timeoutMs);

  try {
    const res = await fetch(sub.targetUrl, {
      method: "POST",
      headers,
      body: rawBody,
      signal: controller.signal,
    });
    const responseBody = await res.text().catch(() => "");
    const truncated = responseBody.slice(0, 4000);
    const ok = res.status >= 200 && res.status < 300;
    return {
      status: ok ? "delivered" : "failed",
      responseStatus: res.status,
      responseBody: truncated,
      signature,
      durationMs: Date.now() - startedAt,
      error: ok ? undefined : `non-2xx ${res.status}`,
    };
  } catch (err) {
    return {
      status: "failed",
      signature,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : "network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Exponential backoff: 30s, 1m, 5m, 15m, 1h, 6h. Capped at retry_max.
 * Jittered ±20% to spread thundering herds.
 */
export function nextAttemptDelayMs(attempt: number): number {
  const ladder = [30_000, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000];
  const base = ladder[Math.min(attempt, ladder.length - 1)];
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Math.max(1000, Math.round(base + jitter));
}

/**
 * Test-firing without persisting a delivery row: returns the would-be
 * response so admins can validate a subscription before activating.
 */
export async function testFire(
  sub: WebhookSubscription,
  hmacSecret: string,
): Promise<DeliveryAttempt> {
  const fakeDelivery: WebhookDelivery = {
    id: "test-delivery",
    subscriptionId: sub.id,
    organizationId: sub.organizationId,
    eventType: "atelier.ping",
    eventId: crypto.randomUUID(),
    idempotencyKey: `test-${Date.now()}`,
    payload: { message: "Atelier integrations test ping" },
    status: "in_flight",
    attemptCount: 0,
    nextAttemptAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  return deliverOnce(sub, fakeDelivery, hmacSecret);
}
