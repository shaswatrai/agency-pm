"use client";

import {
  Figma,
  Github,
  Slack,
  Cloud,
  CreditCard,
  BarChart3,
  Calendar,
  Cog,
  Zap,
  Mail,
  Layers,
  Globe,
  Database,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrationProviderKind } from "@/types/domain";

const ICONS: Record<IntegrationProviderKind, LucideIcon> = {
  figma: Figma,
  adobe_creative_cloud: Layers,
  github: Github,
  gitlab: Github,
  bitbucket: Github,
  slack: Slack,
  microsoft_teams: Slack,
  google_drive: Cloud,
  dropbox: Cloud,
  onedrive: Cloud,
  sharepoint: Cloud,
  google_ads: BarChart3,
  meta_ads: BarChart3,
  google_analytics: BarChart3,
  google_search_console: BarChart3,
  mailchimp: Mail,
  sendgrid: Mail,
  hootsuite: BarChart3,
  buffer: BarChart3,
  quickbooks: CreditCard,
  xero: CreditCard,
  freshbooks: CreditCard,
  hubspot: Database,
  salesforce: Database,
  google_calendar: Calendar,
  outlook_calendar: Calendar,
  jira_import: Cog,
  vercel: Globe,
  netlify: Globe,
  aws: Cloud,
  zapier: Zap,
  make: Zap,
  generic_webhook: Webhook,
};

export function ProviderIcon({
  kind,
  className,
}: {
  kind: IntegrationProviderKind;
  className?: string;
}) {
  const Icon = ICONS[kind];
  return (
    <div
      className={cn(
        "grid place-items-center bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-4" />
    </div>
  );
}
