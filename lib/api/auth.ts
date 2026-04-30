/**
 * Public REST API authentication.
 *
 * Tokens look like `atl_<prefix8>_<random32>` — the prefix is what the
 * server uses for lookup, the random tail is hashed (SHA-256 hex) and
 * compared. Rotation: issue a new token and revoke the old; we never
 * store the plaintext outside Vault.
 *
 * In demo mode (no Supabase) the entire token store lives in the
 * integrations Zustand store under `apiTokens` and the middleware
 * walks it in-memory.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const TOKEN_PREFIX_LEN = 8;

export type ApiTokenScope =
  | "read:tasks"
  | "write:tasks"
  | "read:projects"
  | "write:projects"
  | "read:clients"
  | "write:clients"
  | "read:invoices"
  | "write:invoices"
  | "read:time_entries"
  | "write:time_entries"
  | "read:webhooks"
  | "write:webhooks"
  | "admin";

export interface ApiToken {
  id: string;
  organizationId: string;
  name: string;
  prefix: string; // public 8-char prefix
  hash: string;   // SHA-256 hex of the full plaintext
  scopes: ApiTokenScope[];
  expiresAt?: string;
  isActive: boolean;
  rateLimitPerMinute: number;
  createdBy?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface AuthedRequest {
  organizationId: string;
  scopes: ApiTokenScope[];
  tokenId: string;
}

export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const arr = new Uint8Array(digest);
  let out = "";
  for (let i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

/**
 * Generate a fresh token. Returns both the visible plaintext (only seen
 * once at creation time) and the hash to persist.
 */
export async function mintToken(): Promise<{ plaintext: string; prefix: string; hash: string }> {
  const rand = (n: number) => {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, n);
  };
  const prefix = rand(TOKEN_PREFIX_LEN);
  const tail = rand(32);
  const plaintext = `atl_${prefix}_${tail}`;
  const hash = await sha256Hex(plaintext);
  return { plaintext, prefix, hash };
}

/**
 * Parse the Authorization header into (prefix, hash). Returns null if
 * the format doesn't match.
 */
export async function parseAuthHeader(
  header: string | null,
): Promise<{ prefix: string; hash: string } | null> {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(atl_[A-Za-z0-9]+_[A-Za-z0-9]+)$/);
  if (!match) return null;
  const plaintext = match[1];
  const parts = plaintext.split("_");
  if (parts.length !== 3) return null;
  const prefix = parts[1];
  const hash = await sha256Hex(plaintext);
  return { prefix, hash };
}

/**
 * Authenticate using a callback that does the actual lookup. The HTTP
 * handlers don't import the demo-mode store directly; they pass in a
 * resolver so the route can run on the server (without Zustand).
 *
 * Real-mode resolver hits the Supabase RPC `api_token_authenticate`.
 */
export type TokenResolver = (
  prefix: string,
  hash: string,
) => Promise<Pick<ApiToken, "id" | "organizationId" | "scopes" | "rateLimitPerMinute"> | null>;

export async function authenticate(
  req: NextRequest | Request,
  resolve: TokenResolver,
): Promise<AuthedRequest | NextResponse> {
  const parsed = await parseAuthHeader(req.headers.get("authorization"));
  if (!parsed) {
    return NextResponse.json(
      { error: "missing or malformed Bearer token" },
      { status: 401 },
    );
  }
  const tok = await resolve(parsed.prefix, parsed.hash);
  if (!tok) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }
  return {
    organizationId: tok.organizationId,
    scopes: tok.scopes,
    tokenId: tok.id,
  };
}

export function requireScope(
  authed: AuthedRequest,
  ...needed: ApiTokenScope[]
): NextResponse | null {
  if (authed.scopes.includes("admin")) return null;
  for (const s of needed) {
    if (!authed.scopes.includes(s)) {
      return NextResponse.json(
        { error: `missing scope: ${s}` },
        { status: 403 },
      );
    }
  }
  return null;
}
