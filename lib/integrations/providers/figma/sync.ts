import type { IntegrationLink } from "@/types/domain";
import {
  type FigmaFrameRef,
  buildDevModeUrl,
  getImages,
  getVersions,
  parseFigmaUrl,
} from "./client";

const THUMBNAIL_TTL_MS = 50 * 60 * 1000; // Figma S3 URLs expire ~60min; refresh at 50

export interface ThumbnailResult {
  ok: boolean;
  url?: string;
  fetchedAt: string;
  fromCache: boolean;
  message?: string;
}

/**
 * Resolve a thumbnail URL for an integration_link's referenced frame.
 * Caches the URL + timestamp into link.metadata so repeat reads are
 * free for ~50 min, then refreshes from Figma.
 *
 * Demo mode (no live token): returns a deterministic SVG placeholder.
 */
export async function resolveThumbnail(
  link: IntegrationLink,
  token: string | null,
): Promise<ThumbnailResult> {
  const meta = link.metadata as {
    thumbnail_url?: string;
    thumbnail_fetched_at?: string;
    file_key?: string;
    node_id?: string;
  };

  if (
    meta.thumbnail_url &&
    meta.thumbnail_fetched_at &&
    Date.now() - new Date(meta.thumbnail_fetched_at).getTime() < THUMBNAIL_TTL_MS
  ) {
    return {
      ok: true,
      url: meta.thumbnail_url,
      fetchedAt: meta.thumbnail_fetched_at,
      fromCache: true,
    };
  }

  if (!token || token.startsWith("demo:")) {
    const svg = demoPlaceholderSvg(link.externalId);
    return {
      ok: true,
      url: svg,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      message: "demo placeholder",
    };
  }

  const fileKey = meta.file_key ?? link.externalId.split(":")[0];
  const nodeId = meta.node_id ?? link.externalId.split(":").slice(1).join(":");
  if (!fileKey || !nodeId) {
    return {
      ok: false,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      message: "link metadata missing file_key/node_id",
    };
  }

  try {
    const res = await getImages(token, fileKey, [nodeId], { format: "png", scale: 1 });
    const url = res.images[nodeId];
    if (!url) {
      return {
        ok: false,
        fetchedAt: new Date().toISOString(),
        fromCache: false,
        message: res.err ?? "no image returned",
      };
    }
    return {
      ok: true,
      url,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
    };
  } catch (err) {
    return {
      ok: false,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      message: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

/**
 * Snapshot the current Figma version of a file at a milestone (status
 * change → in_review or done). Stored under link.metadata.versions[].
 */
export async function captureVersionSnapshot(
  link: IntegrationLink,
  token: string | null,
  reason: string,
): Promise<{
  ok: boolean;
  versionId?: string;
  capturedAt: string;
  message?: string;
}> {
  const meta = link.metadata as { file_key?: string };
  const fileKey = meta.file_key ?? link.externalId.split(":")[0];
  if (!fileKey) {
    return { ok: false, capturedAt: new Date().toISOString(), message: "no file_key" };
  }

  if (!token || token.startsWith("demo:")) {
    return {
      ok: true,
      versionId: `demo-v${Math.floor(Math.random() * 1000)}`,
      capturedAt: new Date().toISOString(),
      message: `demo · ${reason}`,
    };
  }

  try {
    const { versions } = await getVersions(token, fileKey);
    const head = versions[0];
    return {
      ok: true,
      versionId: head?.id,
      capturedAt: new Date().toISOString(),
      message: head?.label ?? reason,
    };
  } catch (err) {
    return {
      ok: false,
      capturedAt: new Date().toISOString(),
      message: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

/**
 * Generate a Dev Mode handoff URL for a frame ref. Designers approve a
 * design task → engine auto-attaches this URL to the matching dev task.
 */
export function devModeUrlFor(linkOrUrl: IntegrationLink | string): string | null {
  let ref: FigmaFrameRef | null;
  if (typeof linkOrUrl === "string") {
    ref = parseFigmaUrl(linkOrUrl);
  } else {
    const meta = linkOrUrl.metadata as { file_key?: string; node_id?: string };
    if (!meta.file_key) return null;
    ref = { fileKey: meta.file_key, nodeId: meta.node_id };
  }
  if (!ref) return null;
  return buildDevModeUrl(ref);
}

/**
 * Render a deterministic gradient SVG so demo mode shows something
 * recognizable in the thumbnail slot rather than a broken image.
 */
function demoPlaceholderSvg(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 60) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='hsl(${h1},70%,55%)'/>
        <stop offset='1' stop-color='hsl(${h2},70%,40%)'/>
      </linearGradient>
    </defs>
    <rect width='800' height='450' fill='url(#g)'/>
    <text x='400' y='225' font-family='ui-sans-serif' font-size='28' fill='white' opacity='0.6' text-anchor='middle'>Figma frame · demo</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
