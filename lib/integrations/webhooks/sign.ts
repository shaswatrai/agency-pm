/**
 * HMAC-SHA256 signing for outbound webhook deliveries.
 *
 * The header `X-Atelier-Signature: t={ts},v1={hex}` mirrors the Stripe
 * pattern: receivers reconstruct the signed string `{ts}.{rawBody}` and
 * compare HMACs in constant time. The timestamp blocks replay attacks
 * (receivers should reject signatures older than 5 min).
 *
 * Works in both Node and the Web Crypto runtime (Next.js routes, Edge).
 */

const enc = new TextEncoder();

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function bufToHex(buf: ArrayBuffer): string {
  const arr = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < arr.length; i++) {
    out += arr[i].toString(16).padStart(2, "0");
  }
  return out;
}

export async function signPayload(
  secret: string,
  rawBody: string,
  timestampMs: number = Date.now(),
): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${timestampMs}.${rawBody}`),
  );
  return `t=${timestampMs},v1=${bufToHex(sig)}`;
}

export interface SignatureVerifyResult {
  valid: boolean;
  reason?: string;
}

export async function verifySignature(
  secret: string,
  rawBody: string,
  header: string,
  toleranceMs: number = 5 * 60 * 1000,
): Promise<SignatureVerifyResult> {
  if (!header) return { valid: false, reason: "missing signature header" };
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  ) as Record<string, string>;

  const ts = Number(parts.t);
  const provided = parts.v1;
  if (!ts || !provided) {
    return { valid: false, reason: "malformed signature header" };
  }
  if (Math.abs(Date.now() - ts) > toleranceMs) {
    return { valid: false, reason: "timestamp outside tolerance" };
  }

  const key = await importHmacKey(secret);
  const expected = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${ts}.${rawBody}`),
  );
  const expectedHex = bufToHex(expected);
  if (!constantTimeEqual(expectedHex, provided)) {
    return { valid: false, reason: "signature mismatch" };
  }
  return { valid: true };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Provider-specific verifiers for inbound webhooks. Each takes the raw
 * body + the relevant header(s) and the connection's vault secret.
 */

export async function verifyFigmaPasscode(
  expectedPasscode: string,
  receivedPasscode: string,
): Promise<SignatureVerifyResult> {
  // Figma uses a `passcode` field in the body (no HMAC in 2023 webhooks v2).
  // The passcode is set when registering the webhook; we compare in const time.
  if (!expectedPasscode || !receivedPasscode) {
    return { valid: false, reason: "missing passcode" };
  }
  if (!constantTimeEqual(expectedPasscode, receivedPasscode)) {
    return { valid: false, reason: "passcode mismatch" };
  }
  return { valid: true };
}

export async function verifyGithubSignature(
  secret: string,
  rawBody: string,
  header: string,
): Promise<SignatureVerifyResult> {
  if (!header || !header.startsWith("sha256=")) {
    return { valid: false, reason: "missing or unexpected sha256= signature" };
  }
  const provided = header.slice("sha256=".length);
  const key = await importHmacKey(secret);
  const expected = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expectedHex = bufToHex(expected);
  if (!constantTimeEqual(expectedHex, provided)) {
    return { valid: false, reason: "signature mismatch" };
  }
  return { valid: true };
}
