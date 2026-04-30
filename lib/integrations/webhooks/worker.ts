"use client";

import { useIntegrationsStore } from "@/lib/integrations/store";
import { deliverOnce, nextAttemptDelayMs } from "./deliver";

/**
 * Drain every due webhook_delivery, attempt POST, record outcome,
 * reschedule on failure with exponential backoff.
 *
 * In demo mode this runs in the browser (called from the cron tick API
 * route via fetch, or manually via "Flush queue" in settings). In real
 * mode the same logic runs server-side against Supabase rows; the API
 * route calls a server-side equivalent.
 *
 * Returns a summary so the caller can log/toast progress.
 */
export interface FlushResult {
  picked: number;
  delivered: number;
  failed: number;
  exhausted: number;
}

export async function flushDueDeliveries(): Promise<FlushResult> {
  const store = useIntegrationsStore.getState();
  const due = store.dueDeliveries();
  let delivered = 0;
  let failed = 0;
  let exhausted = 0;

  for (const delivery of due) {
    const sub = store.webhookSubscriptions.find(
      (s) => s.id === delivery.subscriptionId,
    );
    if (!sub || !sub.isActive) {
      store.recordDeliveryAttempt(delivery.id, {
        status: "exhausted",
        signature: "",
        attemptCount: delivery.attemptCount,
      });
      exhausted++;
      continue;
    }

    const secret = store.readSecret(sub.vaultSecretId);
    if (!secret) {
      store.recordDeliveryAttempt(delivery.id, {
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

    const result = await deliverOnce(sub, delivery, secret);
    const nextCount = delivery.attemptCount + 1;

    if (result.status === "delivered") {
      store.recordDeliveryAttempt(delivery.id, {
        status: "delivered",
        responseStatus: result.responseStatus,
        responseBody: result.responseBody,
        signature: result.signature,
        attemptCount: nextCount,
      });
      delivered++;
    } else if (nextCount >= sub.retryMax) {
      store.recordDeliveryAttempt(delivery.id, {
        status: "exhausted",
        responseStatus: result.responseStatus,
        responseBody: result.responseBody ?? result.error,
        signature: result.signature,
        attemptCount: nextCount,
      });
      exhausted++;
    } else {
      store.recordDeliveryAttempt(delivery.id, {
        status: "failed",
        responseStatus: result.responseStatus,
        responseBody: result.responseBody ?? result.error,
        signature: result.signature,
        attemptCount: nextCount,
        nextAttemptAt: new Date(
          Date.now() + nextAttemptDelayMs(nextCount),
        ).toISOString(),
      });
      failed++;
    }
  }

  return { picked: due.length, delivered, failed, exhausted };
}
