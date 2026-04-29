import { NextResponse } from "next/server";

/**
 * Cron tick endpoint — invoked from pg_cron, Vercel Cron, GitHub Actions,
 * or any external scheduler. In real (Supabase) mode this would:
 *   1. Acquire a short advisory lock
 *   2. Select webhook_deliveries where status in ('pending','failed')
 *      and next_attempt_at <= now() limit 50
 *   3. Mark them in_flight, deliver, record outcome, exponential backoff
 *
 * In demo mode the queue lives in the browser, so the page-side flush
 * worker (`flushDueDeliveries` in lib/integrations/webhooks/worker.ts)
 * runs there. This endpoint just returns a heartbeat.
 *
 * Auth: clients MUST send X-Cron-Secret matching CRON_SECRET env, or the
 *   request is rejected. In demo, no env → no auth requirement, but the
 *   endpoint also has nothing dangerous to do.
 */
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const provided = req.headers.get("x-cron-secret") ?? "";
    if (provided !== expected) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    message:
      "Heartbeat OK. In Supabase-backed deployments, the queue worker runs " +
      "here. Demo mode flushes from the browser (see Settings → Webhooks).",
  });
}

export async function GET(req: Request) {
  return POST(req);
}
