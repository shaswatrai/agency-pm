import { NextResponse } from "next/server";

/**
 * SSO Assertion Consumer Service (SAML ACS) / OIDC redirect URI.
 * Called by the IdP after the user authenticates.
 *
 * SAML: POST with form fields { SAMLResponse, RelayState }. We:
 *   1. Verify the signature with the org's stored idpCertificate
 *   2. Parse the assertion, extract email + given name + groups
 *   3. JIT-provision if email domain is in jitProvisioningDomains
 *   4. Issue a Supabase session and redirect to RelayState
 *
 * OIDC: GET with ?code + ?state. We:
 *   1. Validate state matches what we set on /start
 *   2. POST to the discovery doc's token_endpoint to swap code for tokens
 *   3. Decode + validate the id_token (jwks)
 *   4. Same JIT + session flow as SAML
 *
 * This route is the demo scaffold — real mode performs the full
 * crypto verification server-side.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  return NextResponse.json({
    ok: true,
    mode: "demo",
    orgId,
    note: "SAML ACS demo. Real mode validates SAMLResponse signature, parses assertion, JIT-provisions, redirects to RelayState.",
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  return NextResponse.json({
    ok: true,
    mode: "demo",
    orgId,
    receivedCode: code,
    receivedState: state,
    note: "OIDC redirect demo. Real mode swaps code for tokens, validates id_token, JIT-provisions.",
  });
}
