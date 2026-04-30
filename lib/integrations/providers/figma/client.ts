import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

/**
 * Figma REST API wrapper. All calls are server-side (the X-Figma-Token
 * header would expose the user's PAT if invoked from the browser). API
 * routes under /app/api/integrations/figma/* proxy to these functions
 * after resolving the credential's secret from Vault.
 */
const FIGMA_API = "https://api.figma.com";

export interface FigmaUser {
  id: string;
  email: string;
  handle: string;
  img_url: string;
}

export interface FigmaFrameRef {
  fileKey: string;
  nodeId?: string;
}

export interface FigmaImageResponse {
  err: string | null;
  images: Record<string, string>;
  status?: number;
}

export interface FigmaComment {
  id: string;
  uuid: string;
  file_key: string;
  parent_id?: string;
  user: { handle: string; img_url?: string; id: string };
  created_at: string;
  resolved_at?: string;
  message: string;
  client_meta?: {
    node_id?: string;
    node_offset?: { x: number; y: number };
  };
  order_id?: string;
}

export interface FigmaVersion {
  id: string;
  created_at: string;
  label: string | null;
  description: string | null;
  user: { id: string; handle: string };
  thumbnail_url?: string;
}

/**
 * Parse a Figma URL into (fileKey, nodeId). Accepts:
 *   https://www.figma.com/file/<key>/<title>?node-id=<id>
 *   https://www.figma.com/design/<key>/<title>?node-id=<id>
 *   figma://file/<key>?node-id=<id>
 */
export function parseFigmaUrl(input: string): FigmaFrameRef | null {
  if (!input) return null;
  try {
    const url = new URL(input.trim());
    const parts = url.pathname.split("/").filter(Boolean);
    const fileIdx = parts.findIndex(
      (p) => p === "file" || p === "design" || p === "proto",
    );
    if (fileIdx === -1 || !parts[fileIdx + 1]) return null;
    const fileKey = parts[fileIdx + 1];
    const nodeId =
      url.searchParams.get("node-id") ?? url.searchParams.get("nodeId") ?? undefined;
    return { fileKey, nodeId: nodeId?.replace(/-/g, ":") };
  } catch {
    return null;
  }
}

/**
 * Construct the canonical Figma URL for a frame ref. Used to normalize
 * stored references back to a clickable link.
 */
export function buildFigmaUrl(ref: FigmaFrameRef, slug = "frame"): string {
  const node = ref.nodeId ? `?node-id=${ref.nodeId.replace(/:/g, "-")}` : "";
  return `https://www.figma.com/file/${ref.fileKey}/${slug}${node}`;
}

/**
 * Build a Figma Dev Mode URL that opens the frame in inspect/handoff
 * mode. Designers approve → the dev task auto-attaches this link.
 */
export function buildDevModeUrl(ref: FigmaFrameRef): string {
  const node = ref.nodeId ? `?node-id=${ref.nodeId.replace(/:/g, "-")}&mode=dev` : "?mode=dev";
  return `https://www.figma.com/design/${ref.fileKey}/handoff${node}`;
}

async function figmaFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${FIGMA_API}${path}`, {
    ...init,
    headers: {
      "X-Figma-Token": token,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Figma ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function getMe(token: string): Promise<FigmaUser> {
  return figmaFetch<FigmaUser>(token, "/v1/me");
}

/**
 * Get image URLs for a list of node ids. Figma returns S3 URLs valid
 * for ~1 hour. Caller cache `metadata.thumbnail_url` and refresh as
 * `metadata.thumbnail_fetched_at` ages past 50 minutes.
 *
 * format: "png" | "jpg" | "svg" | "pdf"
 * scale: 0.01..4
 */
export async function getImages(
  token: string,
  fileKey: string,
  nodeIds: string[],
  options: { format?: "png" | "jpg" | "svg"; scale?: number } = {},
): Promise<FigmaImageResponse> {
  if (!nodeIds.length) return { err: null, images: {} };
  const params = new URLSearchParams({
    ids: nodeIds.join(","),
    format: options.format ?? "png",
    scale: String(options.scale ?? 1),
  });
  return figmaFetch<FigmaImageResponse>(
    token,
    `/v1/images/${fileKey}?${params.toString()}`,
  );
}

export async function getComments(
  token: string,
  fileKey: string,
): Promise<{ comments: FigmaComment[] }> {
  return figmaFetch<{ comments: FigmaComment[] }>(
    token,
    `/v1/files/${fileKey}/comments`,
  );
}

export async function postComment(
  token: string,
  fileKey: string,
  message: string,
  clientMeta?: FigmaComment["client_meta"],
): Promise<FigmaComment> {
  return figmaFetch<FigmaComment>(
    token,
    `/v1/files/${fileKey}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ message, client_meta: clientMeta }),
    },
  );
}

export async function getVersions(
  token: string,
  fileKey: string,
): Promise<{ versions: FigmaVersion[] }> {
  return figmaFetch<{ versions: FigmaVersion[] }>(
    token,
    `/v1/files/${fileKey}/versions`,
  );
}

export const figmaClient: ProviderClient = {
  kind: "figma",
  async test(secret: string, credential: IntegrationCredential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token provided" };
    if (secret.startsWith("demo:") || credential.label.toLowerCase().includes("demo")) {
      return demoTest("figma", credential);
    }
    try {
      const me = await getMe(secret);
      return {
        ok: true,
        message: `Connected as ${me.handle} (${me.email})`,
        account: { id: me.id, label: me.handle },
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  },
};
