import type {
  IntegrationCategory,
  IntegrationProvider,
  IntegrationProviderKind,
} from "@/types/domain";

/**
 * Static catalog of every provider the framework knows about. Mirrored in
 * the integration_providers Supabase table; this client copy lets the UI
 * render before any DB roundtrip and lets demo mode operate without DB.
 */
export const PROVIDERS: IntegrationProvider[] = [
  // design
  { kind: "figma",                displayName: "Figma",                  category: "design",     supportsOauth: true,  supportsApiKey: false, supportsPat: true,  supportsWebhookIn: true,  supportsWebhookOut: false, defaultScopes: ["files:read","file_comments:write"], documentationUrl: "https://www.figma.com/developers/api" },
  { kind: "adobe_creative_cloud", displayName: "Adobe Creative Cloud",   category: "design",     supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: [],                                   documentationUrl: "https://developer.adobe.com/" },
  // code
  { kind: "github",               displayName: "GitHub",                 category: "code",       supportsOauth: true,  supportsApiKey: false, supportsPat: true,  supportsWebhookIn: true,  supportsWebhookOut: true,  defaultScopes: ["repo","read:org"],                  documentationUrl: "https://docs.github.com/en/rest" },
  { kind: "gitlab",               displayName: "GitLab",                 category: "code",       supportsOauth: true,  supportsApiKey: false, supportsPat: true,  supportsWebhookIn: true,  supportsWebhookOut: true,  defaultScopes: ["api","read_repository"],            documentationUrl: "https://docs.gitlab.com/ee/api/" },
  { kind: "bitbucket",            displayName: "Bitbucket",              category: "code",       supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: true,  supportsWebhookOut: true,  defaultScopes: ["repository","pullrequest"],         documentationUrl: "https://developer.atlassian.com/cloud/bitbucket/rest/" },
  // comms
  { kind: "slack",                displayName: "Slack",                  category: "comms",      supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: true,  supportsWebhookOut: true,  defaultScopes: ["chat:write","commands"],            documentationUrl: "https://api.slack.com/" },
  { kind: "microsoft_teams",      displayName: "Microsoft Teams",        category: "comms",      supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: true,  supportsWebhookOut: true,  defaultScopes: ["ChannelMessage.Send"],              documentationUrl: "https://learn.microsoft.com/microsoftteams/platform/" },
  // storage
  { kind: "google_drive",         displayName: "Google Drive",           category: "storage",    supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: ["https://www.googleapis.com/auth/drive.file"], documentationUrl: "https://developers.google.com/drive" },
  { kind: "dropbox",              displayName: "Dropbox",                category: "storage",    supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: ["files.content.read","files.content.write"], documentationUrl: "https://www.dropbox.com/developers" },
  { kind: "onedrive",             displayName: "OneDrive",               category: "storage",    supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: ["Files.ReadWrite"],                  documentationUrl: "https://learn.microsoft.com/onedrive/developer/" },
  { kind: "sharepoint",           displayName: "SharePoint",             category: "storage",    supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: ["Sites.ReadWrite.All"],              documentationUrl: "https://learn.microsoft.com/sharepoint/dev/" },
  // marketing
  { kind: "google_ads",           displayName: "Google Ads",             category: "marketing",  supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: ["https://www.googleapis.com/auth/adwords"], documentationUrl: "https://developers.google.com/google-ads/api/docs" },
  { kind: "meta_ads",             displayName: "Meta Ads Manager",       category: "marketing",  supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: ["ads_read"],                         documentationUrl: "https://developers.facebook.com/docs/marketing-apis/" },
  { kind: "google_analytics",     displayName: "Google Analytics",       category: "marketing",  supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: ["https://www.googleapis.com/auth/analytics.readonly"], documentationUrl: "https://developers.google.com/analytics" },
  { kind: "google_search_console",displayName: "Google Search Console",  category: "marketing",  supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: ["https://www.googleapis.com/auth/webmasters.readonly"], documentationUrl: "https://developers.google.com/webmaster-tools" },
  { kind: "mailchimp",            displayName: "Mailchimp",              category: "marketing",  supportsOauth: true,  supportsApiKey: true,  supportsPat: false, supportsWebhookIn: true,  supportsWebhookOut: false, defaultScopes: ["campaigns"],                        documentationUrl: "https://mailchimp.com/developer/" },
  { kind: "sendgrid",             displayName: "SendGrid",               category: "marketing",  supportsOauth: false, supportsApiKey: true,  supportsPat: false, supportsWebhookIn: true,  supportsWebhookOut: false, defaultScopes: ["mail.send","stats.read"],           documentationUrl: "https://docs.sendgrid.com/" },
  { kind: "hootsuite",            displayName: "Hootsuite",              category: "marketing",  supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: ["social_post"],                      documentationUrl: "https://developer.hootsuite.com/" },
  { kind: "buffer",               displayName: "Buffer",                 category: "marketing",  supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: ["post"],                             documentationUrl: "https://buffer.com/developers/api" },
  // accounting
  { kind: "quickbooks",           displayName: "QuickBooks Online",      category: "accounting", supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: true,  supportsWebhookOut: true,  defaultScopes: ["com.intuit.quickbooks.accounting"], documentationUrl: "https://developer.intuit.com/" },
  { kind: "xero",                 displayName: "Xero",                   category: "accounting", supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: true,  supportsWebhookOut: true,  defaultScopes: ["accounting.transactions","accounting.contacts"], documentationUrl: "https://developer.xero.com/" },
  { kind: "freshbooks",           displayName: "FreshBooks",             category: "accounting", supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: true,  supportsWebhookOut: true,  defaultScopes: ["user:invoices:read","user:invoices:write"], documentationUrl: "https://www.freshbooks.com/api" },
  // crm
  { kind: "hubspot",              displayName: "HubSpot",                category: "crm",        supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: true,  supportsWebhookOut: true,  defaultScopes: ["crm.objects.deals.read","crm.objects.contacts.read"], documentationUrl: "https://developers.hubspot.com/" },
  { kind: "salesforce",           displayName: "Salesforce",             category: "crm",        supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: true,  supportsWebhookOut: true,  defaultScopes: ["api","refresh_token"],              documentationUrl: "https://developer.salesforce.com/" },
  // calendar
  { kind: "google_calendar",      displayName: "Google Calendar",        category: "calendar",   supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: ["https://www.googleapis.com/auth/calendar"], documentationUrl: "https://developers.google.com/calendar" },
  { kind: "outlook_calendar",     displayName: "Outlook Calendar",       category: "calendar",   supportsOauth: true,  supportsApiKey: false, supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: ["Calendars.ReadWrite"],              documentationUrl: "https://learn.microsoft.com/graph/api/" },
  // devops + hosting
  { kind: "jira_import",          displayName: "Jira (one-way import)",  category: "devops",     supportsOauth: false, supportsApiKey: false, supportsPat: true,  supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: [],                                   documentationUrl: "https://developer.atlassian.com/cloud/jira/" },
  { kind: "vercel",               displayName: "Vercel",                 category: "hosting",    supportsOauth: false, supportsApiKey: false, supportsPat: true,  supportsWebhookIn: true,  supportsWebhookOut: false, defaultScopes: [],                                   documentationUrl: "https://vercel.com/docs/rest-api" },
  { kind: "netlify",              displayName: "Netlify",                category: "hosting",    supportsOauth: false, supportsApiKey: false, supportsPat: true,  supportsWebhookIn: true,  supportsWebhookOut: false, defaultScopes: [],                                   documentationUrl: "https://docs.netlify.com/api/" },
  { kind: "aws",                  displayName: "AWS",                    category: "hosting",    supportsOauth: false, supportsApiKey: true,  supportsPat: false, supportsWebhookIn: false, supportsWebhookOut: false, defaultScopes: [],                                   documentationUrl: "https://docs.aws.amazon.com/" },
  // gateways
  { kind: "zapier",               displayName: "Zapier",                 category: "gateway",    supportsOauth: false, supportsApiKey: false, supportsPat: false, supportsWebhookIn: true,  supportsWebhookOut: true,  defaultScopes: [],                                   documentationUrl: "https://platform.zapier.com/" },
  { kind: "make",                 displayName: "Make (Integromat)",      category: "gateway",    supportsOauth: false, supportsApiKey: false, supportsPat: false, supportsWebhookIn: true,  supportsWebhookOut: true,  defaultScopes: [],                                   documentationUrl: "https://www.make.com/" },
  { kind: "generic_webhook",      displayName: "Generic webhook",        category: "gateway",    supportsOauth: false, supportsApiKey: false, supportsPat: false, supportsWebhookIn: true,  supportsWebhookOut: true,  defaultScopes: [],                                   documentationUrl: undefined },
];

export const PROVIDERS_BY_KIND = new Map<IntegrationProviderKind, IntegrationProvider>(
  PROVIDERS.map((p) => [p.kind, p]),
);

export function getProvider(kind: IntegrationProviderKind): IntegrationProvider {
  const p = PROVIDERS_BY_KIND.get(kind);
  if (!p) throw new Error(`Unknown integration provider: ${kind}`);
  return p;
}

export function providersByCategory(): Record<IntegrationCategory, IntegrationProvider[]> {
  const out: Record<IntegrationCategory, IntegrationProvider[]> = {
    design: [], code: [], comms: [], storage: [], marketing: [],
    accounting: [], crm: [], calendar: [], devops: [], hosting: [], gateway: [],
  };
  for (const p of PROVIDERS) out[p.category].push(p);
  return out;
}

export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  design: "Design",
  code: "Code hosting",
  comms: "Communication",
  storage: "Cloud storage",
  marketing: "Marketing",
  accounting: "Accounting",
  crm: "CRM",
  calendar: "Calendar",
  devops: "DevOps",
  hosting: "Hosting",
  gateway: "Gateways & webhooks",
};
