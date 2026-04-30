import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

const GL_API = "https://gitlab.com/api/v4";

export interface GlUser {
  id: number;
  username: string;
  name: string;
  email?: string;
  avatar_url?: string;
}

export interface GlMergeRequest {
  id: number;
  iid: number;
  state: "opened" | "closed" | "merged";
  title: string;
  description: string | null;
  source_branch: string;
  target_branch: string;
  web_url: string;
  author: { username: string };
}

async function glFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GL_API}${path}`, {
    ...init,
    headers: {
      "private-token": token,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitLab ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const getMe = (token: string) => glFetch<GlUser>(token, "/user");

export const commentOnMr = (
  token: string,
  projectId: string | number,
  iid: number,
  body: string,
) =>
  glFetch<{ id: number; web_url: string }>(
    token,
    `/projects/${encodeURIComponent(String(projectId))}/merge_requests/${iid}/notes`,
    { method: "POST", body: JSON.stringify({ body }) },
  );

export interface GlRef {
  projectPath: string;
  kind: "mr" | "branch" | "commit" | "project";
  ident?: string;
}

export function parseGitlabUrl(input: string): GlRef | null {
  if (!input) return null;
  try {
    const url = new URL(input.trim());
    if (!url.hostname.endsWith("gitlab.com") && !url.hostname.endsWith("gitlab.io")) {
      return null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    const dashIdx = parts.indexOf("-");
    if (dashIdx === -1) {
      return parts.length ? { projectPath: parts.join("/"), kind: "project" } : null;
    }
    const projectPath = parts.slice(0, dashIdx).join("/");
    const kind = parts[dashIdx + 1];
    const ident = parts.slice(dashIdx + 2).join("/");
    if (kind === "merge_requests") return { projectPath, kind: "mr", ident };
    if (kind === "tree") return { projectPath, kind: "branch", ident };
    if (kind === "commit") return { projectPath, kind: "commit", ident };
    return { projectPath, kind: "project" };
  } catch {
    return null;
  }
}

export const gitlabClient: ProviderClient = {
  kind: "gitlab",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("gitlab", credential);
    try {
      const me = await getMe(secret);
      return {
        ok: true,
        message: `Connected as ${me.username}`,
        account: { id: String(me.id), label: me.username },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
