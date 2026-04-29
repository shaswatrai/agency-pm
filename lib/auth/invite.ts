"use client";

/**
 * Org invite flow.
 *
 * Demo mode: returns ok=true with a fake token so the UI behaves the same.
 * Connected mode: inserts a row into `invitations` (with 14d expiry) and
 * sends the email via the Resend adapter. The accept link points at
 * /accept-invite/<token>, which already exists.
 *
 * The `invitations` table from migration 0001 has columns:
 *   id, organization_id, email, role, token, invited_by, accepted_at,
 *   expires_at, created_at
 * RLS limits writes to org admins.
 */
import { sendEmail } from "@/lib/db/adapter";
import { useStore } from "@/lib/db/store";
import { useRuntimeConfig } from "@/lib/config/runtime";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { OrgRole } from "@/types/domain";

export interface InviteResult {
  ok: boolean;
  message: string;
  token?: string;
  emailSent?: boolean;
}

function token(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // strip dashes — short, URL-safe, still 32 hex chars
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function origin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export async function inviteTeammate(args: {
  email: string;
  role: OrgRole;
}): Promise<InviteResult> {
  const email = args.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, message: "Enter a valid email" };
  }
  const cfg = useRuntimeConfig.getState();
  const state = useStore.getState();
  const orgId = state.organization.id;
  const orgName = state.organization.name;
  const inviter = state.users.find((u) => u.id === state.currentUserId);
  const inviterName = inviter?.fullName ?? "A teammate";
  const inviteToken = token();
  const acceptUrl = `${origin()}/accept-invite/${inviteToken}`;

  // 1. Connected mode: persist the invitation
  if (cfg.useSupabase && cfg.supabaseUrl && cfg.supabaseAnonKey) {
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const { error } = await supabase.from("invitations").insert({
        organization_id: orgId,
        email,
        role: args.role,
        token: inviteToken,
        invited_by: state.currentUserId,
      });
      if (error) {
        return {
          ok: false,
          message: `Couldn't save invitation: ${error.message}`,
        };
      }
    }
  }

  // 2. Send the email (no-ops silently if Resend isn't configured)
  let emailSent = false;
  if (cfg.isResendConfigured()) {
    const subject = `You've been invited to ${orgName} on Atelier`;
    const html = `
      <p>Hi,</p>
      <p>${escapeHtml(inviterName)} has invited you to join
         <strong>${escapeHtml(orgName)}</strong> on Atelier as
         <strong>${args.role.replace("_", " ")}</strong>.</p>
      <p><a href="${acceptUrl}"
            style="display:inline-block;padding:10px 18px;background:#111;color:#fff;border-radius:6px;text-decoration:none">
        Accept invite &rarr;
      </a></p>
      <p style="color:#777;font-size:12px">
        Or paste this link into your browser: ${acceptUrl}<br>
        This invite expires in 14 days.
      </p>
    `;
    const result = await sendEmail({ to: email, subject, html });
    emailSent = result.ok;
  }

  return {
    ok: true,
    message: emailSent
      ? `Invite sent to ${email}`
      : cfg.isResendConfigured()
        ? `Invitation saved but email failed to send`
        : `Invitation saved (Resend not configured — email not sent)`,
    token: inviteToken,
    emailSent,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
