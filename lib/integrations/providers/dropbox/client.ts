import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

const DBX_API = "https://api.dropboxapi.com/2";

async function dbxRpc<T>(token: string, path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${DBX_API}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Dropbox ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const getCurrentAccount = (token: string) =>
  dbxRpc<{
    account_id: string;
    name: { display_name: string };
    email: string;
  }>(token, "/users/get_current_account", null);

export const listFolder = (token: string, path: string) =>
  dbxRpc<{
    entries: { ".tag": string; name: string; path_lower: string; id: string }[];
  }>(token, "/files/list_folder", { path });

/**
 * Parse a Dropbox shared link / file path.
 *   https://www.dropbox.com/scl/fo/<rand>/<key>?dl=0
 *   https://www.dropbox.com/scl/fi/<rand>/<filename>?dl=0
 */
export function parseDropboxUrl(input: string): { sharedKey: string; kind: "file" | "folder" } | null {
  if (!input) return null;
  try {
    const url = new URL(input.trim());
    if (!url.hostname.endsWith("dropbox.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 3) return null;
    const kind = parts[1] === "fo" ? "folder" : "file";
    return { sharedKey: parts[2], kind };
  } catch {
    return null;
  }
}

export const dropboxClient: ProviderClient = {
  kind: "dropbox",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("dropbox", credential);
    try {
      const me = await getCurrentAccount(secret);
      return {
        ok: true,
        message: `Connected as ${me.name.display_name}`,
        account: { id: me.account_id, label: me.email },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
