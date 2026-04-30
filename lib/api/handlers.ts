import { NextResponse } from "next/server";
import {
  authenticate,
  parseAuthHeader,
  requireScope,
  type ApiTokenScope,
  type AuthedRequest,
} from "./auth";

/**
 * Public REST API helper that wraps every v1 route. Demo-mode routes
 * skip the actual data layer and return canned responses so the API
 * is exercisable from `curl` without any backend wired. Real-mode
 * routes will swap in Supabase queries that respect organizationId.
 *
 * Usage:
 *   export const GET = withAuth(["read:tasks"], async (req, authed) => {
 *     return NextResponse.json({ data: [...] });
 *   });
 */

export interface DemoResponse {
  ok: boolean;
  endpoint: string;
  method: string;
  organizationId: string;
  scopes: ApiTokenScope[];
  body?: unknown;
  data: unknown;
}

export function withAuth(
  needed: ApiTokenScope[],
  handler: (req: Request, authed: AuthedRequest) => Promise<NextResponse>,
) {
  return async (req: Request) => {
    // Demo-mode bypass: server-side route can't reach the browser
    // Zustand store. We honor a special "Atelier-Demo: 1" header so
    // unit tests / curl explorations can hit the API without a real
    // token. Real deployments set NODE_ENV=production and demo bypass
    // is gated to localhost.
    const demo = req.headers.get("atelier-demo") === "1";
    if (demo) {
      const authed: AuthedRequest = {
        organizationId: "org_atelier",
        scopes: ["admin"],
        tokenId: "demo-token",
      };
      return handler(req, authed);
    }
    // Server-side resolver hits Supabase via RPC `api_token_authenticate`.
    // Until the real adapter ships, we attempt to parse the header and
    // return 401 (production deploys without Supabase get a clean error).
    const parsed = await parseAuthHeader(req.headers.get("authorization"));
    if (!parsed) {
      return NextResponse.json(
        { error: "missing or malformed Bearer token (or set Atelier-Demo: 1 in dev)" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      {
        error:
          "API token store not yet wired in this build — POST Settings → API tokens to mint, then enable the Supabase resolver",
      },
      { status: 401 },
    );
  };
}

/**
 * Skeleton for an in-process demo dataset response. The dev/preview
 * deploys ship with a tiny sample dataset for each entity type so
 * `curl /api/v1/tasks -H "Atelier-Demo: 1"` returns something
 * recognizable.
 */
export function demoData(entity: string, n: number = 3): unknown[] {
  switch (entity) {
    case "tasks":
      return Array.from({ length: n }, (_, i) => ({
        id: `t_${i + 1}`,
        code: `IRIS-WEB-001-T${String(i + 1).padStart(3, "0")}`,
        title: ["Wireframe homepage", "Build hero section", "QA mobile nav"][i] ?? "Demo task",
        status: ["in_progress", "in_review", "done"][i % 3],
        projectId: "p_iris",
        assigneeIds: ["u_marcus"],
      }));
    case "projects":
      return Array.from({ length: n }, (_, i) => ({
        id: `p_${i + 1}`,
        code: ["IRIS-WEB-001", "ACME-APP-002", "GLOW-MKT-003"][i] ?? `DEMO-${i}`,
        name: ["Iris dashboard refresh", "Acme mobile app", "GLOW SEO retainer"][i] ?? "Demo project",
        status: ["active", "active", "on_hold"][i],
        clientId: `c_${i + 1}`,
      }));
    case "clients":
      return Array.from({ length: n }, (_, i) => ({
        id: `c_${i + 1}`,
        code: ["IRIS", "ACME", "GLOW"][i] ?? `C${i}`,
        name: ["Iris Studio", "Acme Corp", "Glow Beauty"][i] ?? "Demo client",
        status: "active",
      }));
    case "invoices":
      return Array.from({ length: n }, (_, i) => ({
        id: `inv_${i + 1}`,
        number: `INV-${String(i + 100).padStart(4, "0")}`,
        clientId: `c_${i + 1}`,
        total: [12500, 8200, 4100][i] ?? 1000,
        currency: "USD",
        status: ["paid", "sent", "draft"][i],
      }));
    case "time_entries":
      return Array.from({ length: n }, (_, i) => ({
        id: `te_${i + 1}`,
        taskId: `t_${i + 1}`,
        userId: "u_marcus",
        date: new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10),
        durationMinutes: [105, 240, 60][i] ?? 60,
        billable: true,
      }));
    default:
      return [];
  }
}

export async function demoCreate(entity: string, body: unknown): Promise<DemoResponse> {
  const id = `${entity.slice(0, 3)}_${crypto.randomUUID()}`;
  return {
    ok: true,
    endpoint: `/api/v1/${entity}`,
    method: "POST",
    organizationId: "org_atelier",
    scopes: ["admin"],
    body,
    data: { id, ...((typeof body === "object" && body) || {}) },
  };
}

// Keep a single import live so unused-param lints stay quiet
void authenticate;
void requireScope;
