/**
 * Server-side mirror of lib/integrations/webhooks/worker.ts.
 *
 * In a Supabase-backed deployment, webhook_deliveries rows live in
 * Postgres and a cron-driven worker drains them. This function:
 *   1. SELECTs up to 50 due rows (status in ('pending','failed') and
 *      next_attempt_at <= now()) using FOR UPDATE SKIP LOCKED so
 *      multiple workers don't double-deliver.
 *   2. Marks them in_flight.
 *   3. Reads the subscription's HMAC secret from Vault.
 *   4. Delivers, records outcome, schedules next attempt with the
 *      same exponential-backoff ladder as the in-browser worker.
 *
 * Until the data-layer adapter swap lands, this runs as a stub that
 * the cron tick endpoint can call without crashing — the meaningful
 * implementation activates the day useBackendMode() reports
 * "supabase".
 */

import { deliverOnce, nextAttemptDelayMs } from "./deliver";
import type {
  WebhookDelivery,
  WebhookSubscription,
} from "@/types/domain";

export interface ServerFlushResult {
  picked: number;
  delivered: number;
  failed: number;
  exhausted: number;
  mode: "supabase" | "stub";
}

/**
 * Resolver shape: caller injects (a) how to load due deliveries +
 * subscriptions and (b) how to read the HMAC secret. Real callers
 * use Supabase service-role; tests inject a mock.
 */
export interface FlushDeps {
  loadDue(limit: number): Promise<{ delivery: WebhookDelivery; subscription: WebhookSubscription }[]>;
  readSecret(vaultSecretId: string): Promise<string | null>;
  recordOutcome(deliveryId: string, update: {
    status: WebhookDelivery["status"];
    responseStatus?: number;
    responseBody?: string;
    signature: string;
    attemptCount: number;
    nextAttemptAt?: string;
  }): Promise<void>;
}

export async function flushServerSide(deps: FlushDeps, limit = 50): Promise<ServerFlushResult> {
  const due = await deps.loadDue(limit);
  let delivered = 0;
  let failed = 0;
  let exhausted = 0;

  for (const { delivery, subscription } of due) {
    if (!subscription.isActive) {
      await deps.recordOutcome(delivery.id, {
        status: "exhausted",
        signature: "",
        attemptCount: delivery.attemptCount,
      });
      exhausted++;
      continue;
    }
    const secret = await deps.readSecret(subscription.vaultSecretId);
    if (!secret) {
      await deps.recordOutcome(delivery.id, {
        status: "failed",
        signature: "",
        attemptCount: delivery.attemptCount + 1,
        nextAttemptAt: new Date(
          Date.now() + nextAttemptDelayMs(delivery.attemptCount),
        ).toISOString(),
      });
      failed++;
      continue;
    }
    const result = await deliverOnce(subscription, delivery, secret);
    const next = delivery.attemptCount + 1;
    if (result.status === "delivered") {
      await deps.recordOutcome(delivery.id, {
        status: "delivered",
        responseStatus: result.responseStatus,
        responseBody: result.responseBody,
        signature: result.signature,
        attemptCount: next,
      });
      delivered++;
    } else if (next >= subscription.retryMax) {
      await deps.recordOutcome(delivery.id, {
        status: "exhausted",
        responseStatus: result.responseStatus,
        responseBody: result.responseBody ?? result.error,
        signature: result.signature,
        attemptCount: next,
      });
      exhausted++;
    } else {
      await deps.recordOutcome(delivery.id, {
        status: "failed",
        responseStatus: result.responseStatus,
        responseBody: result.responseBody ?? result.error,
        signature: result.signature,
        attemptCount: next,
        nextAttemptAt: new Date(Date.now() + nextAttemptDelayMs(next)).toISOString(),
      });
      failed++;
    }
  }
  return { picked: due.length, delivered, failed, exhausted, mode: "supabase" };
}

export const stubResult: ServerFlushResult = {
  picked: 0,
  delivered: 0,
  failed: 0,
  exhausted: 0,
  mode: "stub",
};
