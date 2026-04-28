"use client";

/**
 * Data layer adapter pattern.
 *
 * Today: every read goes through the in-memory Zustand store (lib/db/store.ts).
 * Tomorrow: when `useSupabase` is on, reads + writes go through Supabase.
 *
 * Migration plan (next pass):
 *   1. Replace each Zustand action with one that calls the adapter.
 *   2. Adapter dispatches to either the local store or Supabase.
 *   3. Realtime subscription replaces BroadcastChannel transport.
 *
 * This file intentionally re-exports the local Zustand hooks as the
 * "current implementation" so we can refactor incrementally without
 * breaking every caller at once.
 */
import { useRuntimeConfig } from "@/lib/config/runtime";

export function useBackendMode(): "demo" | "supabase" {
  const useSupabase = useRuntimeConfig((s) => s.useSupabase);
  const url = useRuntimeConfig((s) => s.supabaseUrl);
  const anon = useRuntimeConfig((s) => s.supabaseAnonKey);
  return useSupabase && url && anon ? "supabase" : "demo";
}

export const DATA_LAYER_NOTE = `
Today the entire app reads/writes through lib/db/store.ts (in-memory).
The Settings → Connections panel can already store Supabase + Resend
credentials, but the data layer doesn't consume them yet. See
docs/ROADMAP.md for the planned Supabase wiring sequence.
`.trim();
