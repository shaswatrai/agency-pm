import type {
  IntegrationCredential,
  IntegrationProviderKind,
} from "@/types/domain";

/**
 * Result of a connection-test attempt. Real providers hit a probe
 * endpoint; demo mode synthesizes success after a short delay.
 */
export interface TestResult {
  ok: boolean;
  message: string;
  account?: { id: string; label: string };
}

/**
 * The abstraction every provider client implements. Used by:
 *   - the connection-test API route (POST /api/integrations/test)
 *   - the OAuth callback handler (when applicable)
 *   - background jobs (token refresh, sync pulls)
 *
 * Implementations live in lib/integrations/providers/<kind>/client.ts.
 * They never read tokens directly — they get a `secret` resolved by the
 * caller (server-side via vault, or via demo-mode store).
 */
export interface ProviderClient {
  kind: IntegrationProviderKind;
  test(secret: string, credential: IntegrationCredential): Promise<TestResult>;
}

/**
 * Demo-mode test: pretends to validate creds and returns a fake account.
 * Real provider clients override .test() and call their actual API.
 */
export function demoTest(
  kind: IntegrationProviderKind,
  credential: IntegrationCredential,
): TestResult {
  return {
    ok: true,
    message: `Demo mode — ${kind} credentials accepted (no live verification).`,
    account: {
      id: `demo-${kind}-${credential.id.slice(0, 6)}`,
      label: credential.label,
    },
  };
}
