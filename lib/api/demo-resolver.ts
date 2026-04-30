"use client";

import type { ApiToken } from "./auth";
import { useApiTokensStore } from "./tokens-store";

/**
 * Demo-mode token resolver. The browser-side integrations store also
 * persists API tokens; this resolver walks them. Real mode swaps in
 * a Supabase RPC call against api_token_authenticate.
 */
export async function demoResolveToken(
  prefix: string,
  hash: string,
): Promise<Pick<ApiToken, "id" | "organizationId" | "scopes" | "rateLimitPerMinute"> | null> {
  const tokens = useApiTokensStore.getState().tokens;
  const found = tokens.find(
    (t) => t.prefix === prefix && t.hash === hash && t.isActive,
  );
  if (!found) return null;
  if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) return null;
  return {
    id: found.id,
    organizationId: found.organizationId,
    scopes: found.scopes,
    rateLimitPerMinute: found.rateLimitPerMinute,
  };
}
