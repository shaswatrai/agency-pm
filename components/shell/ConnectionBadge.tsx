"use client";

import Link from "next/link";
import { Database, FlaskConical } from "lucide-react";
import { useRuntimeConfig } from "@/lib/config/runtime";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";

export function ConnectionBadge() {
  const orgSlug = useStore((s) => s.organization.slug);
  const useSupabase = useRuntimeConfig((s) => s.useSupabase);
  const status = useRuntimeConfig((s) => s.supabaseStatus.status);
  const connected = useSupabase && status === "connected";

  return (
    <Link
      href={`/${orgSlug}/settings`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-medium transition-colors hover:bg-accent",
        connected
          ? "border-status-done/30 bg-status-done/5 text-status-done"
          : "border-status-revisions/30 bg-status-revisions/5 text-status-revisions",
      )}
      title={
        connected
          ? "Connected to Supabase"
          : "Demo mode — click to configure Supabase"
      }
    >
      {connected ? (
        <Database className="size-3" />
      ) : (
        <FlaskConical className="size-3" />
      )}
      {connected ? "Connected" : "Demo mode"}
    </Link>
  );
}
