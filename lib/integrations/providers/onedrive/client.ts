import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

const GRAPH_API = "https://graph.microsoft.com/v1.0";

async function graphFetch<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${GRAPH_API}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Graph ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const me = (token: string) =>
  graphFetch<{ id: string; displayName: string; userPrincipalName: string }>(
    token,
    "/me",
  );

export const driveItem = (token: string, itemId: string) =>
  graphFetch<{
    id: string;
    name: string;
    webUrl: string;
    file?: unknown;
    folder?: unknown;
  }>(token, `/me/drive/items/${itemId}`);

export const listChildren = (token: string, folderId: string) =>
  graphFetch<{
    value: { id: string; name: string; webUrl: string; file?: unknown; folder?: unknown }[];
  }>(token, `/me/drive/items/${folderId}/children`);

/**
 * Parse OneDrive / SharePoint share URLs. OneDrive personal:
 *   https://onedrive.live.com/?id=<id>&cid=<cid>
 *   https://1drv.ms/<short>
 * SharePoint sites:
 *   https://<tenant>.sharepoint.com/:f:/g/<path>
 */
export function parseOneDriveUrl(input: string): { external: string; kind: "file" | "folder" } | null {
  if (!input) return null;
  try {
    const url = new URL(input.trim());
    if (
      !url.hostname.endsWith("onedrive.live.com") &&
      !url.hostname.endsWith("1drv.ms") &&
      !url.hostname.endsWith("sharepoint.com")
    ) {
      return null;
    }
    return {
      external: url.toString(),
      kind: url.pathname.includes(":f:") || url.pathname.includes("/folders/") ? "folder" : "file",
    };
  } catch {
    return null;
  }
}

export const onedriveClient: ProviderClient = {
  kind: "onedrive",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("onedrive", credential);
    try {
      const u = await me(secret);
      return {
        ok: true,
        message: `Connected as ${u.displayName}`,
        account: { id: u.id, label: u.userPrincipalName },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
