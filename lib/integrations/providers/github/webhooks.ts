import { extractAllTaskCodes, extractTaskCode } from "./parse";

/**
 * GitHub webhook delivery shapes — narrow subset of what we actually
 * read. Webhook signatures are verified via verifyGithubSignature in
 * lib/integrations/webhooks/sign.ts before this runs.
 */
export interface GhPushEvent {
  ref: string;
  before: string;
  after: string;
  repository: { full_name: string; html_url: string };
  pusher: { name: string; email: string };
  commits: { id: string; message: string; url: string; author: { name: string } }[];
}

export interface GhPullRequestEvent {
  action:
    | "opened"
    | "edited"
    | "closed"
    | "reopened"
    | "synchronize"
    | "ready_for_review"
    | "review_requested";
  number: number;
  pull_request: {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: "open" | "closed";
    merged: boolean;
    html_url: string;
    head: { ref: string; sha: string };
    base: { ref: string };
    user: { login: string };
  };
  repository: { full_name: string; html_url: string };
}

export interface GhIngestResult {
  ok: boolean;
  action: string;
  matchedTaskCodes: string[];
  message: string;
}

export function processPush(event: GhPushEvent): GhIngestResult {
  const branch = event.ref.replace(/^refs\/heads\//, "");
  const codes = new Set<string>();
  const fromBranch = extractTaskCode(branch);
  if (fromBranch) codes.add(fromBranch);
  for (const c of event.commits ?? []) {
    for (const t of extractAllTaskCodes(c.message)) codes.add(t);
  }
  const matched = [...codes];
  return {
    ok: true,
    action: "push",
    matchedTaskCodes: matched,
    message: matched.length
      ? `Push to ${event.repository.full_name}:${branch} → matched ${matched.join(", ")}`
      : `Push to ${event.repository.full_name}:${branch} (no task codes detected)`,
  };
}

export function processPullRequest(event: GhPullRequestEvent): GhIngestResult {
  const pr = event.pull_request;
  const codes = new Set<string>();
  const fromBranch = extractTaskCode(pr.head.ref);
  if (fromBranch) codes.add(fromBranch);
  for (const t of extractAllTaskCodes(pr.title)) codes.add(t);
  for (const t of extractAllTaskCodes(pr.body ?? "")) codes.add(t);
  const matched = [...codes];
  return {
    ok: true,
    action: `pr_${event.action}`,
    matchedTaskCodes: matched,
    message: `PR #${pr.number} (${event.action}) → ${matched.length ? matched.join(", ") : "no match"}`,
  };
}
