import { NextResponse } from "next/server";

/**
 * SSO initiation endpoint (PRD §7). Called when a user clicks
 * "Sign in with SSO" from /login. The handler:
 *   1. Looks up the org's active SsoProvider
 *   2. SAML: builds a SAMLRequest XML, signs it, redirects to
 *      provider.config.idpSsoUrl?SAMLRequest=…
 *   3. OIDC: builds an authorize URL with the org's clientId +
 *      stored discovery doc's authorization_endpoint + state
 *
 * Demo mode: returns a JSON description of what would happen so
 * the UI flow can be exercised end-to-end without a real IdP.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const url = new URL(req.url);
  const protocolHint = url.searchParams.get("protocol");
  return NextResponse.json({
    ok: true,
    mode: "demo",
    orgId,
    protocolHint,
    note:
      "Demo SSO start. Real mode looks up the active SsoProvider and " +
      "redirects to the IdP's authorization or SAMLRequest endpoint.",
  });
}
