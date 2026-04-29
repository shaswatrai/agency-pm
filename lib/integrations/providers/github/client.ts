import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

const GH_API = "https://api.github.com";

export interface GhUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
}

export interface GhRepo {
  id: number;
  full_name: string;
  html_url: string;
  default_branch: string;
}

export interface GhPull {
  id: number;
  number: number;
  state: "open" | "closed";
  merged: boolean;
  title: string;
  html_url: string;
  head: { ref: string; sha: string };
  base: { ref: string };
  user: { login: string };
}

async function ghFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const getMe = (token: string) => ghFetch<GhUser>(token, "/user");

export const listRepos = (token: string) =>
  ghFetch<GhRepo[]>(token, "/user/repos?per_page=100&sort=updated");

export const getPull = (token: string, owner: string, repo: string, n: number) =>
  ghFetch<GhPull>(token, `/repos/${owner}/${repo}/pulls/${n}`);

export const commentOnIssue = (
  token: string,
  owner: string,
  repo: string,
  n: number,
  body: string,
) =>
  ghFetch<{ id: number; html_url: string }>(
    token,
    `/repos/${owner}/${repo}/issues/${n}/comments`,
    { method: "POST", body: JSON.stringify({ body }) },
  );

/**
 * Parse a GitHub PR / branch / commit URL into a structured ref.
 * Accepts:
 *   https://github.com/{owner}/{repo}/pull/{n}
 *   https://github.com/{owner}/{repo}/tree/{branch}
 *   https://github.com/{owner}/{repo}/commit/{sha}
 *   https://github.com/{owner}/{repo}
 */
export interface GhRef {
  owner: string;
  repo: string;
  kind: "pr" | "branch" | "commit" | "repo";
  ident?: string;
}

export function parseGithubUrl(input: string): GhRef | null {
  if (!input) return null;
  try {
    const url = new URL(input.trim());
    if (!url.hostname.endsWith("github.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, repo, kind, ident] = parts;
    if (!kind) return { owner, repo, kind: "repo" };
    if (kind === "pull") return { owner, repo, kind: "pr", ident };
    if (kind === "tree") return { owner, repo, kind: "branch", ident: parts.slice(3).join("/") || ident };
    if (kind === "commit") return { owner, repo, kind: "commit", ident };
    return { owner, repo, kind: "repo" };
  } catch {
    return null;
  }
}

export const githubClient: ProviderClient = {
  kind: "github",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("github", credential);
    try {
      const me = await getMe(secret);
      return {
        ok: true,
        message: `Connected as ${me.login}`,
        account: { id: String(me.id), label: me.login },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
