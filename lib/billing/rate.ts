import type { Client, Project, User } from "@/types/domain";

/**
 * Billing-rate resolution hierarchy (PRD §5.3.1):
 *
 *   1. project.hourlyRateOverride       (project-specific override)
 *   2. client.rateCard[user.role]        (per-client per-role rate)
 *   3. user.billRate                     (team member's default)
 *   4. DEFAULT_BILL_RATE                 (fallback constant)
 *
 * Symmetric resolveCostRate() returns the internal cost rate for
 * profitability calculations:
 *
 *   1. user.costRate
 *   2. DEFAULT_COST_RATE
 */

export const DEFAULT_BILL_RATE = 165;
export const DEFAULT_COST_RATE = 95;

export interface ResolveBillingRateInputs {
  user: Pick<User, "role" | "billRate"> | null | undefined;
  project: Pick<Project, "hourlyRateOverride"> | null | undefined;
  client: Pick<Client, "rateCard"> | null | undefined;
}

export interface ResolvedRate {
  rate: number;
  source: "project_override" | "client_rate_card" | "user_default" | "fallback";
  /** A human-readable trail used for tooltips ("Inherited from client rate card · designer = $145"). */
  trail: string[];
}

export function resolveBillingRate(input: ResolveBillingRateInputs): ResolvedRate {
  const trail: string[] = [];

  if (input.project?.hourlyRateOverride !== undefined && input.project.hourlyRateOverride !== null) {
    trail.push(`project override = $${input.project.hourlyRateOverride}/h`);
    return { rate: input.project.hourlyRateOverride, source: "project_override", trail };
  }
  trail.push("no project override");

  if (input.user?.role && input.client?.rateCard) {
    const cardEntry = input.client.rateCard.find((e) => e.role === input.user!.role);
    if (cardEntry) {
      trail.push(`client rate card · ${cardEntry.role} = $${cardEntry.rate}/h`);
      return { rate: cardEntry.rate, source: "client_rate_card", trail };
    }
    trail.push(`no client rate card entry for ${input.user.role}`);
  } else {
    trail.push("no client rate card");
  }

  if (input.user?.billRate !== undefined && input.user.billRate !== null) {
    trail.push(`user default = $${input.user.billRate}/h`);
    return { rate: input.user.billRate, source: "user_default", trail };
  }
  trail.push("no user default");

  trail.push(`fallback = $${DEFAULT_BILL_RATE}/h`);
  return { rate: DEFAULT_BILL_RATE, source: "fallback", trail };
}

/**
 * Cost-rate resolution mirrors the bill-rate hierarchy minus the
 * client tier (rate cards apply only to billable side):
 *
 *   1. project.costRateOverride
 *   2. user.costRate
 *   3. DEFAULT_COST_RATE
 */
export interface ResolvedCostRate {
  rate: number;
  source: "project_override" | "user_default" | "fallback";
  trail: string[];
}

export interface ResolveCostRateInputs {
  user: Pick<User, "costRate"> | null | undefined;
  project: Pick<Project, "costRateOverride"> | null | undefined;
}

export function resolveCostRate(input: ResolveCostRateInputs): ResolvedCostRate {
  const trail: string[] = [];
  if (
    input.project?.costRateOverride !== undefined &&
    input.project.costRateOverride !== null
  ) {
    trail.push(`project override = $${input.project.costRateOverride}/h`);
    return {
      rate: input.project.costRateOverride,
      source: "project_override",
      trail,
    };
  }
  trail.push("no project override");
  if (input.user?.costRate !== undefined && input.user.costRate !== null) {
    trail.push(`user default = $${input.user.costRate}/h`);
    return { rate: input.user.costRate, source: "user_default", trail };
  }
  trail.push("no user default");
  trail.push(`fallback = $${DEFAULT_COST_RATE}/h`);
  return { rate: DEFAULT_COST_RATE, source: "fallback", trail };
}

export function resolveCostRateById({
  userId,
  projectId,
  users,
  projects,
}: {
  userId: string;
  projectId: string;
  users: User[];
  projects: Project[];
}): ResolvedCostRate {
  const user = users.find((u) => u.id === userId) ?? null;
  const project = projects.find((p) => p.id === projectId) ?? null;
  return resolveCostRate({ user, project });
}

/**
 * Convenience wrapper that takes the full lookup state and returns the
 * resolved bill rate for (userId, projectId). Used by anything that
 * has access to the store's full snapshot — invoice line item generation,
 * budget burn analysis, profitability reports.
 */
export function resolveBillingRateById({
  userId,
  projectId,
  users,
  projects,
  clients,
}: {
  userId: string;
  projectId: string;
  users: User[];
  projects: Project[];
  clients: Client[];
}): ResolvedRate {
  const user = users.find((u) => u.id === userId) ?? null;
  const project = projects.find((p) => p.id === projectId) ?? null;
  const client = project ? clients.find((c) => c.id === project.clientId) ?? null : null;
  return resolveBillingRate({ user, project, client });
}
