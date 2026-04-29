import type {
  IntegrationCredential,
} from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

/**
 * Minimal Figma REST wrapper — chunk 1 only ships the `test` probe and
 * URL parsing. Chunk 2 layers on the deep features (thumbnails, comment
 * sync, version snapshots, dev-mode handoff, approval overlay).
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

export const figmaClient: ProviderClient = {
  kind: "figma",
  async test(secret: string, credential: IntegrationCredential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token provided" };
    if (secret.startsWith("demo:") || credential.label.toLowerCase().includes("demo")) {
      return demoTest("figma", credential);
    }
    try {
      const res = await fetch(`${FIGMA_API}/v1/me`, {
        headers: { "X-Figma-Token": secret },
      });
      if (!res.ok) {
        return {
          ok: false,
          message: `Figma returned ${res.status} ${res.statusText}`,
        };
      }
      const me = (await res.json()) as FigmaUser;
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
