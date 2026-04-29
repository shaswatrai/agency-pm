import type {
  IntegrationEventType,
  IntegrationProviderKind,
} from "@/types/domain";

/**
 * A recipe is a one-click webhook subscription template — the agency
 * picks "Connect QuickBooks" and we pre-fill the target URL pattern,
 * the event filter, the docs link, and a payload-shape preview. The
 * accounting tools all accept generic JSON via Zapier-style webhooks,
 * native webhooks, or via something like Make/Pipedream.
 *
 * Each recipe yields the input we'd pass to createSubscription().
 */

export interface IntegrationRecipe {
  id: string;
  provider: IntegrationProviderKind;
  displayName: string;
  description: string;
  events: IntegrationEventType[];
  /**
   * Placeholder target URL the user fills in. We don't pre-fill a
   * working URL — each receiver (QB, Xero, Zapier, Make) issues their
   * own. We provide an example pattern + a docs link.
   */
  targetUrlPlaceholder: string;
  documentationUrl?: string;
  customHeaders?: Record<string, string>;
  /** Preview of the payload shape posted to the receiver. */
  samplePayload: Record<string, unknown>;
}

export const RECIPES: IntegrationRecipe[] = [
  {
    id: "quickbooks-invoice-sync",
    provider: "quickbooks",
    displayName: "QuickBooks — invoice sync",
    description:
      "When an invoice is created, sent, or paid in Atelier, push a webhook event to a QuickBooks-listening endpoint (Zapier, Make, or your own ingress).",
    events: ["invoice.created", "invoice.sent", "invoice.paid"],
    targetUrlPlaceholder: "https://hooks.zapier.com/hooks/catch/<acct>/quickbooks-invoice/",
    documentationUrl: "https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/work-with-invoices",
    samplePayload: {
      invoiceId: "inv_…",
      number: "INV-001",
      total: 12500,
      currency: "USD",
      clientId: "c_…",
      type: "milestone",
    },
  },
  {
    id: "xero-invoice-sync",
    provider: "xero",
    displayName: "Xero — invoice + payment sync",
    description:
      "Mirror Atelier invoices into Xero. Subscribe to invoice.* and time_entry.approved (T&M billing).",
    events: ["invoice.created", "invoice.sent", "invoice.paid", "time_entry.approved"],
    targetUrlPlaceholder: "https://hooks.zapier.com/hooks/catch/<acct>/xero/",
    documentationUrl: "https://developer.xero.com/documentation/api/accounting/invoices",
    samplePayload: {
      invoiceId: "inv_…",
      number: "INV-001",
      total: 12500,
      currency: "USD",
      clientId: "c_…",
    },
  },
  {
    id: "freshbooks-invoice-sync",
    provider: "freshbooks",
    displayName: "FreshBooks — invoice sync",
    description:
      "Forward invoice events to FreshBooks via a Zapier or Make webhook gateway.",
    events: ["invoice.created", "invoice.paid"],
    targetUrlPlaceholder: "https://hooks.zapier.com/hooks/catch/<acct>/freshbooks/",
    documentationUrl: "https://www.freshbooks.com/api/start",
    samplePayload: {
      invoiceId: "inv_…",
      total: 12500,
      currency: "USD",
    },
  },
  {
    id: "zapier-everything",
    provider: "zapier",
    displayName: "Zapier — fan everything out",
    description:
      "All Atelier events → one Zapier catch hook. Build any downstream workflow in Zapier without touching this codebase.",
    events: [
      "task.created",
      "task.status_changed",
      "task.completed",
      "invoice.created",
      "invoice.sent",
      "invoice.paid",
      "project.created",
      "project.completed",
      "milestone.completed",
      "approval.granted",
      "client.created",
      "sla.breached",
    ],
    targetUrlPlaceholder: "https://hooks.zapier.com/hooks/catch/<acct>/atelier/",
    documentationUrl: "https://zapier.com/help/create/code-webhooks/trigger-zaps-from-webhooks",
    samplePayload: { type: "task.completed", data: { taskId: "t_…" } },
  },
  {
    id: "make-everything",
    provider: "make",
    displayName: "Make — fan everything out",
    description: "All Atelier events into a Make scenario via a Custom Webhook trigger.",
    events: [
      "task.created",
      "task.completed",
      "invoice.paid",
      "milestone.completed",
      "sla.breached",
    ],
    targetUrlPlaceholder: "https://hook.eu1.make.com/<random>",
    documentationUrl: "https://www.make.com/en/help/tools/webhooks",
    samplePayload: { type: "milestone.completed", data: { projectId: "p_…", phaseId: "ph_…" } },
  },
];

export function recipesByProvider(p: IntegrationProviderKind): IntegrationRecipe[] {
  return RECIPES.filter((r) => r.provider === p);
}
