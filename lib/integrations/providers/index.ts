import type { IntegrationProviderKind } from "@/types/domain";
import type { ProviderClient } from "./base";
import { figmaClient } from "./figma/client";
import { githubClient } from "./github/client";
import { gitlabClient } from "./gitlab/client";

const REGISTRY: Partial<Record<IntegrationProviderKind, ProviderClient>> = {
  figma: figmaClient,
  github: githubClient,
  gitlab: gitlabClient,
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
