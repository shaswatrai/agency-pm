"use client";

/**
 * Auth helpers — thin wrappers over supabase.auth that work against the
 * runtime-configured project (no env vars).
 *
 * On signup we also create the org / profile / membership rows + seed
 * demo data so a freshly-signed-up user lands on a populated workspace.
 */
import type { SupabaseClient, Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useRuntimeConfig } from "@/lib/config/runtime";

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  orgName: string;
  orgSlug: string;
}

export interface AuthResult {
  ok: boolean;
  message: string;
  user?: User;
  session?: Session;
  orgId?: string;
}

function requireClient(): SupabaseClient | null {
  const c = getSupabaseBrowser();
  return c;
}

/**
 * Full signup flow:
 *  1. supabase.auth.signUp
 *  2. profile row (matches auth.users.id)
 *  3. organization row
 *  4. organization_members row (role: super_admin)
 *  5. seed demo data into the new org (clients, projects, phases, tasks)
 *
 * Returns the new user's session if confirmation is disabled (local dev),
 * or a guidance message asking the user to confirm via email if not.
 */
export async function signUp(input: SignUpInput): Promise<AuthResult> {
  const supabase = requireClient();
  if (!supabase) {
    return {
      ok: false,
      message:
        "Supabase isn't configured. Add credentials in Settings → Connections.",
    };
  }

  // 1. Auth signup
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.fullName },
    },
  });
  if (authErr) return { ok: false, message: authErr.message };
  const user = authData.user;
  if (!user) {
    return {
      ok: false,
      message:
        "Auth created but no user returned. Confirm via the confirmation email.",
    };
  }

  // If email confirmation is required (no session yet), tell the user.
  if (!authData.session) {
    return {
      ok: true,
      message:
        "Check your inbox / Mailpit (http://127.0.0.1:54324) to confirm.",
      user,
    };
  }

  // 2. Profile row (RLS allows the user to insert their own row)
  const { error: profileErr } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: input.fullName,
  });
  if (profileErr) return { ok: false, message: `Profile: ${profileErr.message}` };

  // 3. Organization
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({ slug: input.orgSlug, name: input.orgName })
    .select()
    .single();
  if (orgErr || !org) {
    return { ok: false, message: `Org: ${orgErr?.message ?? "no row"}` };
  }

  // 4. Membership
  const { error: memErr } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "super_admin",
    });
  if (memErr) return { ok: false, message: `Membership: ${memErr.message}` };

  // 5. Seed demo data (best effort — if it fails, signup still succeeded)
  try {
    const { seedDemoIntoOrg } = await import("@/lib/db/seedSupabase");
    await seedDemoIntoOrg(supabase, org.id, user.id);
  } catch (err) {
    console.warn("Demo seed failed:", err);
  }

  return {
    ok: true,
    message: `Welcome to ${input.orgName}`,
    user,
    session: authData.session,
    orgId: org.id,
  };
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = requireClient();
  if (!supabase) {
    return {
      ok: false,
      message:
        "Supabase isn't configured. Add credentials in Settings → Connections.",
    };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    message: "Signed in",
    user: data.user,
    session: data.session,
  };
}

export async function signOut(): Promise<void> {
  const supabase = requireClient();
  if (supabase) await supabase.auth.signOut();
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = requireClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Resolve the user's primary organization (their first membership).
 * Returns the org id + slug so we can route to /[orgSlug]/dashboard.
 */
export async function getPrimaryOrg(userId: string): Promise<{
  id: string;
  slug: string;
  name: string;
} | null> {
  const supabase = requireClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "organization_id, organizations!inner(id, slug, name)",
    )
    .eq("user_id", userId)
    .limit(1)
    .single();
  if (error || !data) return null;
  // Supabase returns the joined row as an object even though TS infers union
  const orgs = (
    data as unknown as {
      organizations: { id: string; slug: string; name: string };
    }
  ).organizations;
  return orgs;
}

/** Whether the runtime config has Connected mode enabled and a session exists. */
export function isConnectedMode(): boolean {
  const cfg = useRuntimeConfig.getState();
  return Boolean(cfg.useSupabase && cfg.supabaseUrl && cfg.supabaseAnonKey);
}
