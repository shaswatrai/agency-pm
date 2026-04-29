-- ============================================================================
-- Pass 5 chunk 4 — SLA policies
--
-- Per-org default + optional per-client overrides. Each policy owns a list
-- of priority tiers (urgent / high / medium / low) and the response /
-- resolution targets for each. Live SLA state is computed on the fly from
-- task timestamps + the policy — no separate "incident" table; that lets
-- us recompute deterministically as the underlying task moves through
-- statuses.
--
-- Tiers shape (jsonb):
--   [
--     { priority: "urgent", responseHours: 1,  resolutionHours: 4   },
--     { priority: "high",   responseHours: 4,  resolutionHours: 24  },
--     { priority: "medium", responseHours: 8,  resolutionHours: 72  },
--     { priority: "low",    responseHours: 24, resolutionHours: 168 }
--   ]
-- ============================================================================

create table if not exists sla_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  -- null client_id = org-wide default; otherwise scopes to one client
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  -- Hours to count: 'business_hours' (Mon-Fri 9-5 in org TZ) or 'calendar'
  hours_kind text not null default 'business_hours'
    check (hours_kind in ('business_hours', 'calendar')),
  -- Tiers stored as a jsonb array; order is presentation order only.
  tiers jsonb not null default '[]'::jsonb,
  -- Escalation: if a deadline is missed, list of user_ids to email
  escalation_user_ids uuid[] not null default array[]::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One default per org, one override per client
  unique (organization_id, client_id)
);
create index if not exists sla_policies_org_idx on sla_policies (organization_id);

drop trigger if exists trg_sla_policies_updated on sla_policies;
create trigger trg_sla_policies_updated before update on sla_policies
  for each row execute function set_updated_at();

alter table sla_policies enable row level security;

drop policy if exists sla_policies_select on sla_policies;
create policy sla_policies_select on sla_policies for select
  using (is_member_of(organization_id));

drop policy if exists sla_policies_write on sla_policies;
create policy sla_policies_write on sla_policies for all
  using (has_role_in(organization_id, array['super_admin','admin','pm']::org_role[]))
  with check (has_role_in(organization_id, array['super_admin','admin','pm']::org_role[]));
