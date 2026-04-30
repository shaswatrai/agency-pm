import type { User } from "@/types/domain";

/**
 * @-mention token shape: `@firstname.lastname` or `@email-handle`.
 * Matches the regex used by lib/db/notify.ts when firing mention emails.
 */
export const MENTION_REGEX = /@([a-z][a-z0-9._-]+)/gi;

export type MentionSegment =
  | { type: "text"; value: string }
  | { type: "mention"; raw: string; handle: string; user: User | null };

/**
 * Resolve a handle string back to a user (matches `firstname.lastname`
 * or the email local-part). Used by both the renderer (to style with a
 * real avatar) and the autocomplete picker.
 */
export function resolveHandle(handle: string, users: User[]): User | null {
  const lower = handle.toLowerCase();
  return (
    users.find((u) => {
      const nameHandle = u.fullName.toLowerCase().replace(/\s+/g, ".");
      const emailHandle = u.email.split("@")[0].toLowerCase();
      return nameHandle === lower || emailHandle === lower;
    }) ?? null
  );
}

/**
 * Tokenize a comment body into text + mention segments. The renderer
 * uses this to wrap mentions in a styled chip while keeping inline
 * with the surrounding text.
 */
export function parseMentions(body: string, users: User[]): MentionSegment[] {
  if (!body) return [];
  const out: MentionSegment[] = [];
  let lastIndex = 0;
  const re = new RegExp(MENTION_REGEX.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m.index > lastIndex) {
      out.push({ type: "text", value: body.slice(lastIndex, m.index) });
    }
    out.push({
      type: "mention",
      raw: m[0],
      handle: m[1],
      user: resolveHandle(m[1], users),
    });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < body.length) {
    out.push({ type: "text", value: body.slice(lastIndex) });
  }
  return out;
}

/**
 * Suggest users for the autocomplete popup based on the partial query
 * after the @ in the textarea. Empty query returns top 5; otherwise
 * fuzzy-matches name or handle.
 */
export function suggestMentions(
  query: string,
  users: User[],
  excludeUserId?: string,
  limit = 5,
): User[] {
  const q = query.toLowerCase().trim();
  const filtered = users.filter((u) => u.id !== excludeUserId);
  if (!q) return filtered.slice(0, limit);
  return filtered
    .filter((u) => {
      const name = u.fullName.toLowerCase();
      const handle = u.email.split("@")[0].toLowerCase();
      return name.includes(q) || handle.includes(q);
    })
    .slice(0, limit);
}

/**
 * Get the canonical mention token for a user — the format that
 * resolveHandle() will resolve back to them.
 */
export function tokenFor(user: User): string {
  return `@${user.fullName.toLowerCase().replace(/\s+/g, ".")}`;
}
