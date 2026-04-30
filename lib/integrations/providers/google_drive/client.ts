import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

const DRIVE_API = "https://www.googleapis.com/drive/v3";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
  size?: string;
}

async function driveFetch<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${DRIVE_API}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Drive ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const aboutMe = (token: string) =>
  driveFetch<{ user: { displayName: string; emailAddress: string }; storageQuota: unknown }>(
    token,
    "/about?fields=user,storageQuota",
  );

export const listFolderChildren = (token: string, folderId: string) =>
  driveFetch<{ files: DriveFile[] }>(
    token,
    `/files?q='${encodeURIComponent(folderId)}'+in+parents+and+trashed+%3D+false&fields=files(id,name,mimeType,webViewLink,iconLink,modifiedTime,size)`,
  );

export const getFile = (token: string, fileId: string) =>
  driveFetch<DriveFile>(
    token,
    `/files/${fileId}?fields=id,name,mimeType,webViewLink,iconLink,modifiedTime,size`,
  );

/**
 * Parse a Google Drive URL.
 *   https://drive.google.com/file/d/<id>/view
 *   https://drive.google.com/drive/folders/<id>
 *   https://docs.google.com/document/d/<id>/edit
 *   https://docs.google.com/spreadsheets/d/<id>/edit
 */
export interface DriveRef {
  id: string;
  kind: "file" | "folder" | "doc" | "sheet" | "slide" | "form";
}

export function parseDriveUrl(input: string): DriveRef | null {
  if (!input) return null;
  try {
    const url = new URL(input.trim());
    const parts = url.pathname.split("/").filter(Boolean);
    const dIdx = parts.indexOf("d");
    if (url.hostname.startsWith("docs.google.com")) {
      const kind = (parts[0] === "document"
        ? "doc"
        : parts[0] === "spreadsheets"
          ? "sheet"
          : parts[0] === "presentation"
            ? "slide"
            : parts[0] === "forms"
              ? "form"
              : "doc") as DriveRef["kind"];
      if (dIdx !== -1 && parts[dIdx + 1]) return { id: parts[dIdx + 1], kind };
      return null;
    }
    if (url.hostname.endsWith("drive.google.com")) {
      if (parts[0] === "drive" && parts[1] === "folders" && parts[2]) {
        return { id: parts[2], kind: "folder" };
      }
      if (parts[0] === "file" && dIdx !== -1 && parts[dIdx + 1]) {
        return { id: parts[dIdx + 1], kind: "file" };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export const driveClient: ProviderClient = {
  kind: "google_drive",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("google_drive", credential);
    try {
      const me = await aboutMe(secret);
      return {
        ok: true,
        message: `Connected as ${me.user.displayName}`,
        account: { id: me.user.emailAddress, label: me.user.displayName },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
