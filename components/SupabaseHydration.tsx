"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRuntimeConfig } from "@/lib/config/runtime";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { hydrateFromSupabase } from "@/lib/db/hydrateFromSupabase";
import { getPrimaryOrg } from "@/lib/auth";

/**
 * When Connected mode is on AND a session exists, fetches the user's
 * org data from Postgres and replaces the in-memory store with it.
 * Runs once per app load (per session).
 */
export function SupabaseHydration() {
  const useSupabase = useRuntimeConfig((s) => s.useSupabase);
  const url = useRuntimeConfig((s) => s.supabaseUrl);
  const anon = useRuntimeConfig((s) => s.supabaseAnonKey);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!useSupabase || !url || !anon || hydrated) return;

    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowser();
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;

      const org = await getPrimaryOrg(data.user.id);
      if (!org || cancelled) return;

      const result = await hydrateFromSupabase(supabase, org.id, data.user.id);
      if (cancelled) return;
      if (result.ok) {
        toast.success("Loaded workspace from Supabase", {
          description: `${result.counts?.tasks ?? 0} tasks · ${result.counts?.projects ?? 0} projects · ${result.counts?.clients ?? 0} clients`,
        });
        setHydrated(true);
      } else {
        toast.error(`Hydration failed: ${result.message}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [useSupabase, url, anon, hydrated]);

  return null;
}
