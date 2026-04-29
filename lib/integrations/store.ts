"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  IncomingWebhookEndpoint,
  IncomingWebhookEvent,
  IntegrationConnection,
  IntegrationConnectionStatus,
  IntegrationCredential,
  IntegrationCredentialType,
  IntegrationJob,
  IntegrationLink,
  IntegrationLinkEntityType,
  IntegrationProviderKind,
  WebhookDelivery,
  WebhookDeliveryStatus,
  WebhookSubscription,
} from "@/types/domain";

/**
 * Demo-mode mirror of the integrations Supabase tables. Persisted to
 * localStorage so connections survive reload; secrets live ONLY here in
 * demo mode (real mode stores them in Supabase Vault). The `vault:` prefix
 * on a secret id distinguishes a Vault UUID from a demo placeholder.
 */
interface IntegrationsState {
  credentials: IntegrationCredential[];
  connections: IntegrationConnection[];
  links: IntegrationLink[];
  webhookSubscriptions: WebhookSubscription[];
  webhookDeliveries: WebhookDelivery[];
  incomingEndpoints: IncomingWebhookEndpoint[];
  incomingEvents: IncomingWebhookEvent[];
  jobs: IntegrationJob[];
  /** Demo-mode plaintext secret store. Keyed by `demo:<credentialId>`. */
  demoSecrets: Record<string, string>;

  // ----- credential ops -----
  createCredential: (input: {
    organizationId: string;
    provider: IntegrationProviderKind;
    credentialType: IntegrationCredentialType;
    label: string;
    secret: string;
    payloadMeta?: Record<string, unknown>;
    scopes?: string[];
    expiresAt?: string;
    createdBy?: string;
  }) => IntegrationCredential;
  rotateCredential: (id: string, newSecret: string) => void;
  deleteCredential: (id: string) => void;
  markCredentialValidated: (
    id: string,
    ok: boolean,
    message?: string,
  ) => void;

  // ----- connection ops -----
  upsertConnection: (
    conn: Omit<IntegrationConnection, "id" | "createdAt"> &
      Partial<Pick<IntegrationConnection, "id" | "createdAt">>,
  ) => IntegrationConnection;
  setConnectionStatus: (
    id: string,
    status: IntegrationConnectionStatus,
    error?: string,
  ) => void;
  removeConnection: (id: string) => void;

  // ----- link ops -----
  addLink: (
    link: Omit<IntegrationLink, "id" | "createdAt">,
  ) => IntegrationLink;
  removeLink: (id: string) => void;
  linksFor: (
    entityType: IntegrationLinkEntityType,
    entityId: string,
  ) => IntegrationLink[];

  // ----- webhook subscription ops -----
  createSubscription: (input: {
    organizationId: string;
    name: string;
    description?: string;
    targetUrl: string;
    secret: string;
    eventFilter: string[];
    customHeaders?: Record<string, string>;
    retryMax?: number;
    timeoutMs?: number;
    createdBy?: string;
  }) => WebhookSubscription;
  updateSubscription: (
    id: string,
    patch: Partial<WebhookSubscription>,
  ) => void;
  deleteSubscription: (id: string) => void;

  // ----- delivery queue ops -----
  enqueueDelivery: (d: WebhookDelivery) => void;
  recordDeliveryAttempt: (
    id: string,
    update: {
      status: WebhookDeliveryStatus;
      responseStatus?: number;
      responseBody?: string;
      signature: string;
      attemptCount: number;
      nextAttemptAt?: string;
    },
  ) => void;
  dueDeliveries: () => WebhookDelivery[];

  // ----- inbound endpoint ops -----
  createIncomingEndpoint: (input: {
    organizationId: string;
    connectionId?: string;
    provider: IntegrationProviderKind;
    secret?: string;
  }) => IncomingWebhookEndpoint;
  recordIncomingEvent: (
    e: Omit<IncomingWebhookEvent, "id" | "receivedAt">,
  ) => IncomingWebhookEvent;

  // ----- demo secret access (server-side reads via API in real mode) -----
  readSecret: (vaultSecretId: string) => string | null;

  // ----- bulk reset (debug) -----
  resetIntegrations: () => void;
}

const initial: Pick<
  IntegrationsState,
  | "credentials"
  | "connections"
  | "links"
  | "webhookSubscriptions"
  | "webhookDeliveries"
  | "incomingEndpoints"
  | "incomingEvents"
  | "jobs"
  | "demoSecrets"
> = {
  credentials: [],
  connections: [],
  links: [],
  webhookSubscriptions: [],
  webhookDeliveries: [],
  incomingEndpoints: [],
  incomingEvents: [],
  jobs: [],
  demoSecrets: {},
};

export const useIntegrationsStore = create<IntegrationsState>()(
  persist(
    (set, get) => ({
      ...initial,

      createCredential: (input) => {
        const id = `cred_${crypto.randomUUID()}`;
        const vaultSecretId = `demo:${id}`;
        const cred: IntegrationCredential = {
          id,
          organizationId: input.organizationId,
          provider: input.provider,
          credentialType: input.credentialType,
          label: input.label,
          vaultSecretId,
          payloadMeta: input.payloadMeta ?? {},
          scopes: input.scopes ?? [],
          expiresAt: input.expiresAt,
          isActive: true,
          createdBy: input.createdBy,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          credentials: [...s.credentials, cred],
          demoSecrets: { ...s.demoSecrets, [vaultSecretId]: input.secret },
        }));
        return cred;
      },

      rotateCredential: (id, newSecret) => {
        set((s) => {
          const cred = s.credentials.find((c) => c.id === id);
          if (!cred) return s;
          return {
            ...s,
            demoSecrets: { ...s.demoSecrets, [cred.vaultSecretId]: newSecret },
            credentials: s.credentials.map((c) =>
              c.id === id ? { ...c, lastValidatedAt: undefined } : c,
            ),
          };
        });
      },

      deleteCredential: (id) => {
        set((s) => {
          const cred = s.credentials.find((c) => c.id === id);
          const nextSecrets = { ...s.demoSecrets };
          if (cred) delete nextSecrets[cred.vaultSecretId];
          return {
            ...s,
            credentials: s.credentials.filter((c) => c.id !== id),
            connections: s.connections.filter((c) => c.credentialId !== id),
            demoSecrets: nextSecrets,
          };
        });
      },

      markCredentialValidated: (id, ok, message) => {
        set((s) => ({
          credentials: s.credentials.map((c) =>
            c.id === id
              ? {
                  ...c,
                  lastValidatedAt: new Date().toISOString(),
                  lastValidationMessage: message,
                  isActive: ok ? c.isActive : false,
                }
              : c,
          ),
        }));
      },

      upsertConnection: (conn) => {
        const id = conn.id ?? `conn_${crypto.randomUUID()}`;
        const createdAt = conn.createdAt ?? new Date().toISOString();
        const out: IntegrationConnection = { ...conn, id, createdAt };
        set((s) => {
          const idx = s.connections.findIndex((c) => c.id === id);
          if (idx >= 0) {
            const next = [...s.connections];
            next[idx] = out;
            return { connections: next };
          }
          return { connections: [...s.connections, out] };
        });
        return out;
      },

      setConnectionStatus: (id, status, error) => {
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status,
                  lastError: error,
                  lastSyncedAt:
                    status === "connected" ? new Date().toISOString() : c.lastSyncedAt,
                }
              : c,
          ),
        }));
      },

      removeConnection: (id) => {
        set((s) => ({
          connections: s.connections.filter((c) => c.id !== id),
          links: s.links.filter((l) => l.connectionId !== id),
        }));
      },

      addLink: (input) => {
        const link: IntegrationLink = {
          ...input,
          id: `link_${crypto.randomUUID()}`,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ links: [...s.links, link] }));
        return link;
      },

      removeLink: (id) =>
        set((s) => ({ links: s.links.filter((l) => l.id !== id) })),

      linksFor: (entityType, entityId) =>
        get().links.filter(
          (l) => l.entityType === entityType && l.entityId === entityId,
        ),

      createSubscription: (input) => {
        const id = `sub_${crypto.randomUUID()}`;
        const vaultSecretId = `demo:${id}`;
        const sub: WebhookSubscription = {
          id,
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          targetUrl: input.targetUrl,
          vaultSecretId,
          eventFilter: input.eventFilter,
          customHeaders: input.customHeaders ?? {},
          isActive: true,
          retryMax: input.retryMax ?? 6,
          timeoutMs: input.timeoutMs ?? 10000,
          createdBy: input.createdBy,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          webhookSubscriptions: [...s.webhookSubscriptions, sub],
          demoSecrets: { ...s.demoSecrets, [vaultSecretId]: input.secret },
        }));
        return sub;
      },

      updateSubscription: (id, patch) => {
        set((s) => ({
          webhookSubscriptions: s.webhookSubscriptions.map((w) =>
            w.id === id ? { ...w, ...patch } : w,
          ),
        }));
      },

      deleteSubscription: (id) => {
        set((s) => {
          const sub = s.webhookSubscriptions.find((w) => w.id === id);
          const nextSecrets = { ...s.demoSecrets };
          if (sub) delete nextSecrets[sub.vaultSecretId];
          return {
            ...s,
            webhookSubscriptions: s.webhookSubscriptions.filter((w) => w.id !== id),
            webhookDeliveries: s.webhookDeliveries.filter(
              (d) => d.subscriptionId !== id,
            ),
            demoSecrets: nextSecrets,
          };
        });
      },

      enqueueDelivery: (d) => {
        set((s) => ({ webhookDeliveries: [d, ...s.webhookDeliveries].slice(0, 500) }));
      },

      recordDeliveryAttempt: (id, update) => {
        set((s) => ({
          webhookDeliveries: s.webhookDeliveries.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status: update.status,
                  responseStatus: update.responseStatus,
                  responseBody: update.responseBody,
                  signature: update.signature,
                  attemptCount: update.attemptCount,
                  lastAttemptAt: new Date().toISOString(),
                  nextAttemptAt: update.nextAttemptAt ?? d.nextAttemptAt,
                }
              : d,
          ),
          webhookSubscriptions: s.webhookSubscriptions.map((sub) => {
            const d = s.webhookDeliveries.find((x) => x.id === id);
            if (!d || d.subscriptionId !== sub.id) return sub;
            return {
              ...sub,
              lastDeliveryAt: new Date().toISOString(),
              lastDeliveryStatus: update.status,
            };
          }),
        }));
      },

      dueDeliveries: () => {
        const now = Date.now();
        return get().webhookDeliveries.filter(
          (d) =>
            (d.status === "pending" || d.status === "failed") &&
            new Date(d.nextAttemptAt).getTime() <= now,
        );
      },

      createIncomingEndpoint: (input) => {
        const id = `endp_${crypto.randomUUID()}`;
        const endpointToken = crypto.randomUUID().replace(/-/g, "");
        const vaultSecretId = input.secret ? `demo:${id}` : undefined;
        const endpoint: IncomingWebhookEndpoint = {
          id,
          organizationId: input.organizationId,
          connectionId: input.connectionId,
          provider: input.provider,
          endpointToken,
          vaultSecretId,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          incomingEndpoints: [...s.incomingEndpoints, endpoint],
          demoSecrets:
            input.secret && vaultSecretId
              ? { ...s.demoSecrets, [vaultSecretId]: input.secret }
              : s.demoSecrets,
        }));
        return endpoint;
      },

      recordIncomingEvent: (e) => {
        const event: IncomingWebhookEvent = {
          ...e,
          id: `evt_${crypto.randomUUID()}`,
          receivedAt: new Date().toISOString(),
        };
        set((s) => ({
          incomingEvents: [event, ...s.incomingEvents].slice(0, 200),
          incomingEndpoints: s.incomingEndpoints.map((ep) =>
            ep.id === e.endpointId
              ? { ...ep, lastReceivedAt: event.receivedAt }
              : ep,
          ),
        }));
        return event;
      },

      readSecret: (vaultSecretId) => {
        if (!vaultSecretId.startsWith("demo:")) {
          // Real Supabase Vault id; the browser must not have plaintext.
          // API routes call integration_read_secret() server-side instead.
          return null;
        }
        return get().demoSecrets[vaultSecretId] ?? null;
      },

      resetIntegrations: () => set(initial),
    }),
    {
      name: "atelier:integrations",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
