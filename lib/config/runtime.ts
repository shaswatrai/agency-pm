"use client";

/**
 * Runtime configuration store — backend credentials and feature flags
 * configured at runtime through the Settings → Connections panel,
 * persisted to localStorage. NO env vars required.
 *
 * Security notes:
 * - Supabase anon key is safe to store client-side (it's designed to be
 *   public; RLS gates everything).
 * - Supabase service role key bypasses RLS. Store it ONLY long enough to
 *   apply the schema migration, then clear it.
 * - Resend API key is server-only by design. We pass it as a header to
 *   our own /api/resend/* routes; never call Resend from the browser.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ConnectionStatus =
  | "untested"
  | "testing"
  | "connected"
  | "failed";

export interface ServiceStatus {
  status: ConnectionStatus;
  message?: string;
  lastCheckedAt?: number;
}

export interface RuntimeConfig {
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  // Resend
  resendApiKey: string;
  resendFrom: string;
  // Feature flags
  useSupabase: boolean;
  useRealtime: boolean;
  // Connection statuses
  supabaseStatus: ServiceStatus;
  resendStatus: ServiceStatus;
}

interface RuntimeConfigStore extends RuntimeConfig {
  setField: <K extends keyof RuntimeConfig>(
    key: K,
    value: RuntimeConfig[K],
  ) => void;
  setMany: (patch: Partial<RuntimeConfig>) => void;
  reset: () => void;
  isSupabaseConfigured: () => boolean;
  isResendConfigured: () => boolean;
}

const DEFAULT: RuntimeConfig = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  supabaseServiceRoleKey: "",
  resendApiKey: "",
  resendFrom: "",
  useSupabase: false,
  useRealtime: true,
  supabaseStatus: { status: "untested" },
  resendStatus: { status: "untested" },
};

export const useRuntimeConfig = create<RuntimeConfigStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT,
      setField: (key, value) => set((s) => ({ ...s, [key]: value })),
      setMany: (patch) => set((s) => ({ ...s, ...patch })),
      reset: () => set({ ...DEFAULT }),
      isSupabaseConfigured: () => {
        const s = get();
        return Boolean(s.supabaseUrl && s.supabaseAnonKey);
      },
      isResendConfigured: () => {
        const s = get();
        return Boolean(s.resendApiKey && s.resendFrom);
      },
    }),
    {
      name: "atelier:runtime-config",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Don't persist transient connection statuses
      partialize: (state) => ({
        supabaseUrl: state.supabaseUrl,
        supabaseAnonKey: state.supabaseAnonKey,
        supabaseServiceRoleKey: state.supabaseServiceRoleKey,
        resendApiKey: state.resendApiKey,
        resendFrom: state.resendFrom,
        useSupabase: state.useSupabase,
        useRealtime: state.useRealtime,
      }),
    },
  ),
);

/**
 * Test that the configured Supabase project is reachable and the anon key
 * is valid. Hits the public auth health endpoint which works without RLS.
 */
export async function testSupabaseConnection(
  url: string,
  anonKey: string,
): Promise<{ ok: boolean; message: string }> {
  if (!url || !anonKey) {
    return { ok: false, message: "URL and anon key are required" };
  }
  try {
    const cleanUrl = url.replace(/\/+$/, "");
    const res = await fetch(`${cleanUrl}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `${res.status} ${res.statusText} — check URL and anon key`,
      };
    }
    return { ok: true, message: "Connected" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Send a tiny ping through our own /api/resend/test endpoint.
 * The endpoint reads the API key + from address from the request body
 * (so we never embed the Resend key client-side after the request).
 */
export async function testResendConnection(
  apiKey: string,
  from: string,
): Promise<{ ok: boolean; message: string }> {
  if (!apiKey || !from) {
    return { ok: false, message: "API key and from address are required" };
  }
  try {
    const res = await fetch("/api/resend/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, from }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        message: json.error ?? `${res.status} ${res.statusText}`,
      };
    }
    return { ok: true, message: json.message ?? "Connected" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Network error",
    };
  }
}
