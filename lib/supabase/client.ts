"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, SUPABASE_CONFIGURED } from "@/lib/env";

export function createClient() {
  if (!SUPABASE_CONFIGURED) return null;
  return createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
