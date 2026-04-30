/**
 * Branch-name → task-code matcher. Agencies use convention like
 *   feat/ATELIER-WEB-003-T042-add-cart
 *   fix/ACME-APP-007-T118
 * The task code is the all-caps section ending in T<digits> (or, more
 * generally, the project code + task seq).
 *
 * Matches greedily so it works with arbitrary prefixes ("feat/",
 * "ENG-", "release/") and suffixes ("-add-cart", " (#42)").
 */
const TASK_CODE_RE = /([A-Z][A-Z0-9_]+(?:-[A-Z0-9]+)*-T\d+)/;

export function extractTaskCode(branchOrCommitMessage: string): string | null {
  if (!branchOrCommitMessage) return null;
  const match = branchOrCommitMessage.match(TASK_CODE_RE);
  return match ? match[1] : null;
}

/**
 * Look up multiple potential task codes from a single string (commit
 * message, PR description). Returns unique matches in order.
 */
export function extractAllTaskCodes(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  const re = new RegExp(TASK_CODE_RE.source, "g");
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}
