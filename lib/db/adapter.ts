"use client";

/**
 * Data layer adapter pattern.
 *
 * The full Supabase swap-out happens in Pass 2; this file is the bridge.
 * - useBackendMode() tells you which mode is active.
 * - getSupabaseClient() returns a configured client (or null in demo).
 * - sendEmail() calls /api/email/send when Resend is configured, or
 *   falls back to a console log + toast in demo.
 *
 * Once Pass 2 lands, lib/db/store.ts actions check useBackendMode() and
 * dispatch reads/writes through Supabase queries. The action signatures
 * stay the same so component callers don't change.
 */
import { useRuntimeConfig } from "@/lib/config/runtime";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export function useBackendMode(): "demo" | "supabase" {
  const useSupabase = useRuntimeConfig((s) => s.useSupabase);
  const url = useRuntimeConfig((s) => s.supabaseUrl);
  const anon = useRuntimeConfig((s) => s.supabaseAnonKey);
  return useSupabase && url && anon ? "supabase" : "demo";
}

export function getSupabaseClient() {
  const { useSupabase, supabaseUrl, supabaseAnonKey } =
    useRuntimeConfig.getState();
  if (!useSupabase || !supabaseUrl || !supabaseAnonKey) return null;
  return getSupabaseBrowser();
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<{ ok: boolean; message: string }> {
  const config = useRuntimeConfig.getState();
  if (!config.isResendConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[email simulated]", {
        from: config.resendFrom || "demo@local",
        ...input,
      });
    }
    return {
      ok: false,
      message:
        "Demo mode — Resend not configured (Settings → Connections to enable real sends)",
    };
  }
  try {
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: config.resendApiKey,
        from: config.resendFrom,
        ...input,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: json.error ?? `${res.status}` };
    }
    return { ok: true, message: `Sent · id ${json.id}` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Network error",
    };
  }
}

export const DATA_LAYER_NOTE = `
Today the entire app reads/writes through lib/db/store.ts (in-memory).
The Settings → Connections panel can already store Supabase + Resend
credentials, but the data layer doesn't fully consume them yet. See
docs/ROADMAP.md for the planned Supabase wiring sequence.

Pass 6 (automation engine) is real and consumes events from the
in-memory store. Pass 2 will swap the underlying source so triggers
fire on Postgres changes via Supabase Realtime instead of the
in-process subscribe loop.
`.trim();
