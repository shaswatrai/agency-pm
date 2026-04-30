import { NextResponse } from "next/server";
import { stubResult } from "@/lib/integrations/webhooks/server-worker";

/**
 * Cron tick endpoint — invoked from pg_cron, Vercel Cron, GitHub Actions,
 * or any external scheduler. In real (Supabase-backed) mode this drains
 * webhook_deliveries via flushServerSide() with a Supabase-backed
 * FlushDeps. Until that adapter activates, returns the stub result so
 * the scheduler integration is still proven.
 *
 * Auth: clients MUST send X-Cron-Secret matching CRON_SECRET env, or the
 *   request is rejected. In demo, no env → no auth requirement.
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

  // Real-mode wiring lands when the Supabase data-layer swap completes;
  // until then the stub keeps cron callers happy.
  const result = stubResult;

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    result,
    message:
      "Server-side webhook flush worker active (stub mode). " +
      "Browser-side flush still runs via Settings → Webhooks → Flush queue.",
  });
}

export async function GET(req: Request) {
  return POST(req);
}
