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
import type { Invoice, Task } from "@/types/domain";

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

/**
 * Fire when a client-visible task is moved to "done" — a deliverable was
 * approved (typically by the client through the portal). Recipients:
 * the project PM + any task assignees who actually did the work.
 */
export function notifyDeliverableApproved(task: Task): void {
  if (!task.clientVisible) return;
  const state = useStore.getState();
  const project = state.projects.find((p) => p.id === task.projectId);
  if (!project) return;

  const recipientIds = new Set<string>();
  if (project.projectManagerId) recipientIds.add(project.projectManagerId);
  for (const id of task.assigneeIds) recipientIds.add(id);

  for (const userId of recipientIds) {
    const user = state.users.find((u) => u.id === userId);
    if (!user?.email) continue;
    const subject = `Approved: ${task.title}`;
    const html = `
      <p>Hi ${user.fullName.split(" ")[0]},</p>
      <p>Your client just approved <strong>${escapeHtml(task.title)}</strong>
         in ${escapeHtml(project.name)}. 🎉</p>
      <p>This deliverable is now marked Done. If it's part of a milestone-billing
         project, the next invoice may be ready to issue.</p>
      <p><a href="${taskUrl(task)}">Open the task &rarr;</a></p>
    `;
    void sendEmail({ to: user.email, subject, html });
  }
}

/**
 * Fire when an invoice's status flips to "sent" for the first time.
 * Sends to the client's primary contact email if known.
 */
export function notifyInvoiceSent(invoice: Invoice): void {
  const state = useStore.getState();
  const client = state.clients.find((c) => c.id === invoice.clientId);
  if (!client?.primaryContactEmail) return;

  const project = state.projects.find((p) => p.id === invoice.projectId);
  const formattedTotal = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: invoice.currency,
  }).format(invoice.total);

  const subject = `Invoice ${invoice.number} from ${state.organization.name}`;
  const html = `
    <p>Hi ${client.primaryContactName?.split(" ")[0] ?? "there"},</p>
    <p>A new invoice from <strong>${escapeHtml(state.organization.name)}</strong>
       is ready for your review.</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr>
        <td style="padding:6px 12px;color:#666">Invoice</td>
        <td style="padding:6px 12px"><strong>${invoice.number}</strong></td>
      </tr>
      <tr>
        <td style="padding:6px 12px;color:#666">Project</td>
        <td style="padding:6px 12px">${escapeHtml(project?.name ?? "—")}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;color:#666">Total</td>
        <td style="padding:6px 12px"><strong>${formattedTotal}</strong></td>
      </tr>
      <tr>
        <td style="padding:6px 12px;color:#666">Due</td>
        <td style="padding:6px 12px">${invoice.dueDate}</td>
      </tr>
    </table>
    <p>You can view + pay the invoice from your client portal.</p>
    <p style="color:#888;font-size:12px">Replies go straight to your account team.</p>
  `;
  void sendEmail({ to: client.primaryContactEmail, subject, html });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
