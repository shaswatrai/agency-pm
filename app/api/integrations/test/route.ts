import { NextResponse } from "next/server";
import { getProviderClient } from "@/lib/integrations/providers";
import { demoTest } from "@/lib/integrations/providers/base";
import type { IntegrationCredential, IntegrationProviderKind } from "@/types/domain";

/**
 * Test a credential against its provider. Called from the
 * "Test connection" button in Settings → Integrations.
 *
 * Body: { provider, credential, secret }
 *   - credential is the IntegrationCredential row (no secret in it)
 *   - secret is the plaintext token (forwarded for the duration of the
 *     request only; never logged, never persisted server-side)
 *
 * In demo mode the call still hits this route so behavior is uniform —
 * the route just falls back to the demoTest synthetic outcome.
 */
export async function POST(req: Request) {
  let body: {
    provider?: IntegrationProviderKind;
    credential?: IntegrationCredential;
    secret?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const { provider, credential, secret } = body;
  if (!provider || !credential || !secret) {
    return NextResponse.json(
      { ok: false, message: "provider, credential, and secret are required" },
      { status: 400 },
    );
  }

  const client = getProviderClient(provider);
  if (!client) {
    return NextResponse.json(demoTest(provider, credential));
  }

  try {
    const result = await client.test(secret, credential);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Test failed",
      },
      { status: 500 },
    );
  }
}
