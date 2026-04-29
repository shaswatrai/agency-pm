"use client";

/**
 * Direct notification side-effects fired by store mutations.
 *
 * These are independent of the automation engine — they cover the
 * baseline behaviours the PRD/plan promised in Phase 1: "task assigned"
 * and "mention" emails. The automation engine still owns conditional /
 * configurable email rules; this file owns the always-on defaults.
 *
 * No-ops silently when:
 *   • Resend isn't configured
 *   • The recipient has no email on their User record
 *   • The actor is the recipient (don't email yourself when you self-assign)
 */
import { sendEmail } from "@/lib/db/adapter";
import { useStore } from "@/lib/db/store";
import type { Task } from "@/types/domain";

const MENTION_REGEX = /@([\w.-]+)/g;

function projectName(task: Task): string {
  const project = useStore.getState().projects.find(
    (p) => p.id === task.projectId,
  );
  return project?.name ?? "Project";
}

function siteOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function taskUrl(task: Task): string {
  const slug = useStore.getState().organization.slug;
  return `${siteOrigin()}/${slug}/projects/${task.projectId}/kanban?task=${task.id}`;
}

/**
 * Fire one assignment email per newly-added assignee.
 * `prevAssigneeIds` is the assignee list *before* the mutation;
 * `nextAssigneeIds` is what it became.
 */
export function notifyTaskAssignment(
  task: Task,
  prevAssigneeIds: string[],
  nextAssigneeIds: string[],
): void {
  const added = nextAssigneeIds.filter((id) => !prevAssigneeIds.includes(id));
  if (added.length === 0) return;
  const state = useStore.getState();
  const actorId = state.currentUserId;
  const actor = state.users.find((u) => u.id === actorId);
  const actorName = actor?.fullName ?? "Someone";

  for (const userId of added) {
    if (userId === actorId) continue; // skip self-assignment
    const user = state.users.find((u) => u.id === userId);
    if (!user?.email) continue;
    const subject = `You were assigned to ${task.title}`;
    const html = `
      <p>Hi ${user.fullName.split(" ")[0]},</p>
      <p>${actorName} assigned you to <strong>${escapeHtml(task.title)}</strong>
         in ${escapeHtml(projectName(task))}.</p>
      <p>Status: ${task.status} &middot; Priority: ${task.priority}${
        task.dueDate ? ` &middot; Due ${task.dueDate}` : ""
      }</p>
      <p><a href="${taskUrl(task)}">Open the task &rarr;</a></p>
      <p style="color:#888;font-size:12px">Sent by Atelier on behalf of your workspace.</p>
    `;
    void sendEmail({ to: user.email, subject, html });
  }
}

/**
 * Fire mention emails when @username tokens appear in a comment body.
 * Matches against User.fullName (lowercased, spaces → ".") and email handle.
 */
export function notifyMentions(commentBody: string, taskId: string): void {
  const matches = Array.from(commentBody.matchAll(MENTION_REGEX));
  if (matches.length === 0) return;

  const state = useStore.getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;
  const actorId = state.currentUserId;
  const actor = state.users.find((u) => u.id === actorId);
  const actorName = actor?.fullName ?? "Someone";

  const handles = matches.map((m) => m[1].toLowerCase());
  const seen = new Set<string>();

  for (const handle of handles) {
    const user = state.users.find((u) => {
      const nameHandle = u.fullName.toLowerCase().replace(/\s+/g, ".");
      const emailHandle = u.email.split("@")[0].toLowerCase();
      return nameHandle === handle || emailHandle === handle;
    });
    if (!user || seen.has(user.id)) continue;
    if (user.id === actorId) continue;
    if (!user.email) continue;
    seen.add(user.id);
    const subject = `${actorName} mentioned you on ${task.title}`;
    const html = `
      <p>Hi ${user.fullName.split(" ")[0]},</p>
      <p>${actorName} mentioned you in a comment on
         <strong>${escapeHtml(task.title)}</strong> in
         ${escapeHtml(projectName(task))}:</p>
      <blockquote style="border-left:3px solid #ddd;margin:0;padding:8px 12px;color:#555">
        ${escapeHtml(commentBody).slice(0, 400)}
      </blockquote>
      <p><a href="${taskUrl(task)}">Open the task &rarr;</a></p>
    `;
    void sendEmail({ to: user.email, subject, html });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
