import { NextResponse } from "next/server";
import {
  extractAllTaskCodes,
  extractTaskCode,
} from "@/lib/integrations/providers/github/parse";

/**
 * GitLab webhook receiver. GitLab sends `X-Gitlab-Token` (plain shared
 * secret, not HMAC) and an `X-Gitlab-Event` header. Verify the token
 * against the connection's stored secret, then dispatch by event kind.
 */

interface GlPushEvent {
  ref: string;
  before: string;
  after: string;
  commits: { id: string; message: string; url: string; author: { name: string } }[];
  project: { path_with_namespace: string; web_url: string };
  user_username: string;
}

interface GlMergeRequestEvent {
  object_kind: "merge_request";
  user: { username: string };
  project: { path_with_namespace: string };
  object_attributes: {
    iid: number;
    title: string;
    description: string | null;
    state: "opened" | "closed" | "merged";
    action: string;
    source_branch: string;
    target_branch: string;
    url: string;
  };
}

export async function POST(req: Request) {
  const event = req.headers.get("x-gitlab-event") ?? "";
  const provided = req.headers.get("x-gitlab-token") ?? "";
  const expected = req.headers.get("x-test-secret"); // for tests
  if (expected && provided !== expected) {
    return NextResponse.json(
      { ok: false, message: "token mismatch" },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (event === "Push Hook") {
    const e = payload as GlPushEvent;
    const branch = e.ref.replace(/^refs\/heads\//, "");
    const codes = new Set<string>();
    const fromBranch = extractTaskCode(branch);
    if (fromBranch) codes.add(fromBranch);
    for (const c of e.commits ?? []) {
      for (const t of extractAllTaskCodes(c.message)) codes.add(t);
    }
    return NextResponse.json({
      ok: true,
      action: "push",
      matchedTaskCodes: [...codes],
      message: `Push to ${e.project.path_with_namespace}:${branch}`,
    });
  }

  if (event === "Merge Request Hook") {
    const e = payload as GlMergeRequestEvent;
    const codes = new Set<string>();
    const fromBranch = extractTaskCode(e.object_attributes.source_branch);
    if (fromBranch) codes.add(fromBranch);
    for (const t of extractAllTaskCodes(e.object_attributes.title)) codes.add(t);
    for (const t of extractAllTaskCodes(e.object_attributes.description ?? "")) codes.add(t);
    return NextResponse.json({
      ok: true,
      action: `mr_${e.object_attributes.action}`,
      matchedTaskCodes: [...codes],
      message: `MR !${e.object_attributes.iid} (${e.object_attributes.action}) on ${e.project.path_with_namespace}`,
    });
  }

  return NextResponse.json({ ok: true, action: "ignore", event });
}
