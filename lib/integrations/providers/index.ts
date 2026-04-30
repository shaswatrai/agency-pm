import type { IntegrationProviderKind } from "@/types/domain";
import type { ProviderClient } from "./base";
import { figmaClient } from "./figma/client";
import { githubClient } from "./github/client";
import { gitlabClient } from "./gitlab/client";
import { slackClient } from "./slack/client";
import { teamsClient } from "./microsoft_teams/client";
import { driveClient } from "./google_drive/client";
import { dropboxClient } from "./dropbox/client";
import { onedriveClient } from "./onedrive/client";
import { gaClient } from "./google_analytics/client";
import { gscClient } from "./google_search_console/client";
import { adsClient } from "./google_ads/client";
import { metaClient } from "./meta_ads/client";
import { hubspotClient } from "./hubspot/client";
import { salesforceClient } from "./salesforce/client";
import { gcalClient } from "./google_calendar/client";
import { outlookCalClient } from "./outlook_calendar/client";

const REGISTRY: Partial<Record<IntegrationProviderKind, ProviderClient>> = {
  figma: figmaClient,
  github: githubClient,
  gitlab: gitlabClient,
  slack: slackClient,
  microsoft_teams: teamsClient,
  google_drive: driveClient,
  dropbox: dropboxClient,
  onedrive: onedriveClient,
  google_analytics: gaClient,
  google_search_console: gscClient,
  google_ads: adsClient,
  meta_ads: metaClient,
  hubspot: hubspotClient,
  salesforce: salesforceClient,
  google_calendar: gcalClient,
  outlook_calendar: outlookCalClient,
};

/**
 * Look up the provider client implementation. Providers without a
 * dedicated client run through the demo-mode `demoTest` fallback. As we
 * add real adapters in subsequent chunks (github, slack, gdrive, …) we
 * register them here.
 */
export function getProviderClient(
  kind: IntegrationProviderKind,
): ProviderClient | null {
  return REGISTRY[kind] ?? null;
}
