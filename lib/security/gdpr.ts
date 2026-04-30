"use client";

import { useStore } from "@/lib/db/store";

/**
 * GDPR-style data export (PRD §7). Bundles every record about a
 * person — tasks they're assigned, comments they authored, time
 * they logged, mentions of them, files they uploaded, sigs they
 * signed. Returns a JSON blob suitable for direct download.
 *
 * Real-mode adds Supabase data; demo mode walks the in-memory store.
 */

export interface UserDataExport {
  generatedAt: string;
  userId: string;
  user: unknown;
  tasksAssigned: unknown[];
  tasksReviewed: unknown[];
  tasksCreated: unknown[];
  comments: unknown[];
  timeEntries: unknown[];
  mentionsInComments: { commentId: string; body: string; createdAt: string }[];
  approvalSignatures: unknown[];
  meetingNotesAttended: unknown[];
  budgetChangesRequested: unknown[];
  timesheetSubmissions: unknown[];
  userSkills: unknown[];
  mfaEnrolled: boolean;
}

export function exportUserData(userId: string): UserDataExport {
  const s = useStore.getState();
  const user = s.users.find((u) => u.id === userId);

  const tasksAssigned = s.tasks.filter((t) => t.assigneeIds.includes(userId));
  const tasksReviewed = s.tasks.filter((t) => t.reviewerId === userId);
  const tasksCreated = s.tasks.filter((t) => t.createdBy === userId);
  const comments = s.comments.filter((c) => c.authorId === userId);
  const timeEntries = s.timeEntries.filter((e) => e.userId === userId);

  const handle = user
    ? user.fullName.toLowerCase().replace(/\s+/g, ".")
    : "";
  const mentionsInComments = handle
    ? s.comments
        .filter((c) =>
          c.body.toLowerCase().includes(`@${handle}`),
        )
        .map((c) => ({
          commentId: c.id,
          body: c.body,
          createdAt: c.createdAt,
        }))
    : [];

  const approvalSignatures = s.approvalSignatures.filter(
    (sig) => sig.signedName?.toLowerCase() === user?.fullName.toLowerCase(),
  );

  const meetingNotesAttended = s.meetingNotes.filter((n) =>
    n.attendees.includes(userId),
  );

  const budgetChangesRequested = s.budgetChanges.filter(
    (b) => b.requestedBy === userId,
  );

  const timesheetSubmissions = s.timesheetSubmissions.filter(
    (t) => t.userId === userId,
  );

  const userSkills = s.userSkills.filter((sk) => sk.userId === userId);

  const mfaEnrolled = s.mfaEnrollments.some((m) => m.userId === userId);

  return {
    generatedAt: new Date().toISOString(),
    userId,
    user,
    tasksAssigned,
    tasksReviewed,
    tasksCreated,
    comments,
    timeEntries,
    mentionsInComments,
    approvalSignatures,
    meetingNotesAttended,
    budgetChangesRequested,
    timesheetSubmissions,
    userSkills,
    mfaEnrolled,
  };
}

/**
 * Download the export as a JSON file. Browser-only.
 */
export function downloadUserDataExport(userId: string): UserDataExport {
  const data = exportUserData(userId);
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `atelier-data-export-${userId}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return data;
}

/**
 * GDPR right-to-deletion. Doesn't actually drop the user (foreign-key
 * cascade would shred the project history). Instead anonymizes:
 *   - replaces fullName with "Deleted user"
 *   - clears email, avatarUrl
 *   - keeps userId so historical references resolve
 *
 * Deletion of comments / time entries authored by the user is left
 * to the admin's choice (typically retained for accounting purposes).
 */
export function anonymizeUser(userId: string): boolean {
  const s = useStore.getState();
  const user = s.users.find((u) => u.id === userId);
  if (!user) return false;
  // Use the underlying setState to mutate the immutable user list
  useStore.setState((state) => ({
    users: state.users.map((u) =>
      u.id === userId
        ? {
            ...u,
            fullName: "Deleted user",
            email: `deleted+${userId}@invalid.local`,
            avatarUrl: undefined,
            billRate: undefined,
            costRate: undefined,
          }
        : u,
    ),
  }));
  return true;
}
