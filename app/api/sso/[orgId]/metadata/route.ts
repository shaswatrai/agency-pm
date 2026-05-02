import { NextResponse } from "next/server";

/**
 * Atelier service-provider metadata (PRD §7). IdPs that consume
 * SAML metadata XML pull this URL when the customer registers
 * Atelier as a relying party.
 *
 * The XML below is a minimal valid SP descriptor — production
 * deploys substitute the real ACS URL, certificate, and
 * NameIDFormat. Demo mode serves it from the request host.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const url = new URL(req.url);
  const acsUrl = `${url.origin}/api/sso/${orgId}/acs`;
  const entityId = `${url.origin}/api/sso/${orgId}/metadata`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="${entityId}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"
                       AuthnRequestsSigned="false"
                       WantAssertionsSigned="true">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acsUrl}"
      index="0"
      isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;

  return new NextResponse(xml, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
