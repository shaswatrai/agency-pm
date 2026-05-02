import type { OrgRole, SsoProtocol, SsoProvider } from "@/types/domain";

/**
 * Vendor presets for SSO setup wizards (PRD §7). Each preset
 * fills in the protocol-specific fields a customer otherwise would
 * have to look up from their IdP admin console.
 */

export interface SsoVendorPreset {
  vendor: SsoProvider["vendor"];
  displayName: string;
  protocol: SsoProtocol;
  /** Documentation deep-link explaining how to register the app on the IdP. */
  setupGuideUrl: string;
  /** Required config keys, in display order. */
  configFields: SsoConfigField[];
  /** When the IdP exposes a metadata XML / OIDC discovery URL we accept that
   *  as the canonical source instead of asking for individual fields. */
  acceptsMetadataUrl: boolean;
}

export interface SsoConfigField {
  key: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  /** Treat as a secret in the UI (masked input + write-only). */
  secret?: boolean;
  required: boolean;
  inputType?: "text" | "url" | "textarea";
}

const SAML_FIELDS: SsoConfigField[] = [
  {
    key: "idpEntityId",
    label: "IdP Entity ID",
    placeholder: "https://accounts.google.com/o/saml2?idpid=…",
    required: true,
    inputType: "url",
  },
  {
    key: "idpSsoUrl",
    label: "IdP SSO URL",
    placeholder: "https://accounts.google.com/o/saml2/idp",
    required: true,
    inputType: "url",
  },
  {
    key: "idpCertificate",
    label: "IdP X.509 certificate (PEM)",
    placeholder: "-----BEGIN CERTIFICATE-----\nMIIDdz…\n-----END CERTIFICATE-----",
    inputType: "textarea",
    required: true,
  },
  {
    key: "metadataUrl",
    label: "Or paste a metadata URL",
    placeholder: "https://login.example.com/sso/saml/metadata",
    required: false,
    inputType: "url",
  },
];

const OIDC_FIELDS: SsoConfigField[] = [
  {
    key: "discoveryUrl",
    label: "Discovery URL (.well-known/openid-configuration)",
    placeholder: "https://login.example.com/.well-known/openid-configuration",
    required: true,
    inputType: "url",
  },
  {
    key: "clientId",
    label: "Client ID",
    required: true,
  },
  {
    key: "clientSecret",
    label: "Client Secret",
    secret: true,
    required: true,
  },
];

export const SSO_VENDORS: Record<SsoProvider["vendor"], SsoVendorPreset> = {
  google_workspace: {
    vendor: "google_workspace",
    displayName: "Google Workspace",
    protocol: "saml",
    setupGuideUrl:
      "https://support.google.com/a/answer/6087519",
    configFields: SAML_FIELDS,
    acceptsMetadataUrl: true,
  },
  microsoft_entra: {
    vendor: "microsoft_entra",
    displayName: "Microsoft Entra ID",
    protocol: "saml",
    setupGuideUrl:
      "https://learn.microsoft.com/azure/active-directory/manage-apps/configure-saml-single-sign-on",
    configFields: SAML_FIELDS,
    acceptsMetadataUrl: true,
  },
  okta: {
    vendor: "okta",
    displayName: "Okta",
    protocol: "saml",
    setupGuideUrl:
      "https://help.okta.com/oie/en-us/Content/Topics/Apps/Apps_App_Integration_Wizard_SAML.htm",
    configFields: SAML_FIELDS,
    acceptsMetadataUrl: true,
  },
  generic: {
    vendor: "generic",
    displayName: "Generic OIDC provider",
    protocol: "oidc",
    setupGuideUrl: "https://openid.net/connect/",
    configFields: OIDC_FIELDS,
    acceptsMetadataUrl: false,
  },
};

/**
 * Compute the Atelier-side service-provider URLs the customer
 * registers with the IdP. These don't change between IdPs — the
 * UI shows them on the configuration page so admins can copy them
 * straight in.
 */
export function spUrls(orgId: string, baseUrl: string) {
  const root = baseUrl.replace(/\/$/, "");
  return {
    /** SAML ACS / OIDC redirect URI. */
    acsUrl: `${root}/api/sso/${orgId}/acs`,
    /** SAML Entity ID / OIDC client metadata URL. */
    spEntityId: `${root}/api/sso/${orgId}/metadata`,
    /** Single-logout URL. */
    sloUrl: `${root}/api/sso/${orgId}/slo`,
  };
}

/**
 * Validate that the required fields for a vendor are present.
 * Returns an array of missing keys (empty = valid).
 */
export function validateProviderConfig(
  vendor: SsoProvider["vendor"],
  config: Record<string, string>,
): string[] {
  const preset = SSO_VENDORS[vendor];
  const missing: string[] = [];
  for (const f of preset.configFields) {
    if (!f.required) continue;
    // SAML providers can satisfy idpEntityId/idpSsoUrl/idpCertificate via
    // metadataUrl alone — special-case that.
    if (
      preset.acceptsMetadataUrl &&
      config.metadataUrl &&
      ["idpEntityId", "idpSsoUrl", "idpCertificate"].includes(f.key)
    ) {
      continue;
    }
    if (!config[f.key]?.trim()) missing.push(f.key);
  }
  return missing;
}

/**
 * JIT (just-in-time) provisioning rule: when a federated user signs in
 * with email "alice@acme.com" and acme.com is in the allowlist, we
 * auto-create their Atelier profile + assign defaultRole. Without a
 * domain match we bounce them with a "contact admin" page.
 */
export function shouldJitProvision(
  email: string,
  jitDomains: string[] | undefined,
): boolean {
  if (!jitDomains || jitDomains.length === 0) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return jitDomains.some((d) => d.toLowerCase() === domain);
}

export function defaultRoleFor(provider: SsoProvider): OrgRole {
  return provider.defaultRole ?? "member";
}
