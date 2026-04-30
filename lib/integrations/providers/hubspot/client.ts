import type { IntegrationCredential } from "@/types/domain";
import type { ProviderClient, TestResult } from "../base";
import { demoTest } from "../base";

const HS_API = "https://api.hubapi.com";

export interface HsContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    lifecyclestage?: string;
  };
}

export interface HsDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    pipeline?: string;
  };
}

async function hsFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${HS_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`HubSpot ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const me = (token: string) =>
  hsFetch<{ user: string; portalId: number; hub_domain: string }>(
    token,
    "/integrations/v1/me",
  );

export const listDeals = (token: string) =>
  hsFetch<{ results: HsDeal[] }>(
    token,
    "/crm/v3/objects/deals?limit=25&properties=dealname,amount,dealstage,closedate,pipeline",
  );

export const listContacts = (token: string) =>
  hsFetch<{ results: HsContact[] }>(
    token,
    "/crm/v3/objects/contacts?limit=25&properties=email,firstname,lastname,company,lifecyclestage",
  );

export const hubspotClient: ProviderClient = {
  kind: "hubspot",
  async test(secret, credential): Promise<TestResult> {
    if (!secret) return { ok: false, message: "No token" };
    if (secret.startsWith("demo:")) return demoTest("hubspot", credential);
    try {
      const u = await me(secret);
      return {
        ok: true,
        message: `Connected to ${u.hub_domain}`,
        account: { id: String(u.portalId), label: u.hub_domain },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Failed" };
    }
  },
};
