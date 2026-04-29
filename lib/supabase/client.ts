"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRuntimeConfig } from "@/lib/config/runtime";

/**
 * Get a Supabase browser client built from the runtime config (Settings →
 * Connections). Returns null when no project is configured (demo mode).
 */
export function getSupabaseBrowser() {
  if (typeof window === "undefined") return null;
  const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig.getState();
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/** Convenience hook returning a memoized client (recreated when config changes). */
export function useSupabaseBrowser() {
  const url = useRuntimeConfig((s) => s.supabaseUrl);
  const anon = useRuntimeConfig((s) => s.supabaseAnonKey);
  if (!url || !anon) return null;
  // Browser-side: no need to memoize — createBrowserClient is cheap
  return createBrowserClient(url, anon);
}

// Backwards compat for older callers
export function createClient() {
  return getSupabaseBrowser();
}
