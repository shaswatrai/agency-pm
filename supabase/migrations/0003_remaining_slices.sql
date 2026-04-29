-- ============================================================================
-- Pass 2 chunk 5 — remaining domain slices
--
-- Adds Postgres tables for the slices that were previously in-memory only:
--   • quotes  (header) + versions (jsonb child documents)
--   • invoices (header + jsonb line items)
--   • automations + automation_runs
--   • timesheet_submissions
--   • fx_rates (per-org currency table) + base_currency on organizations
--   • budget_change_requests
--   • user_skills
--   • time_tracking_config (one row per org)
--
-- All tenant-scoped via organization_id + RLS using the existing
-- is_member_of() helper from 0001_init.sql.
--
-- Plus: tighter Storage RLS so the project-files bucket is only readable /
-- writable by org members (vs any authenticated user). Path layout is
-- `<orgId>/<projectId>/<fileId>-<filename>`, so the first segment of the
-- object name is the organization id we check membership against.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type quote_status as enum (
    'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum (
    'draft', 'sent', 'paid', 'overdue', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_type as enum (
    'milestone', 'time_materials', 'retainer', 'fixed_installment', 'expense'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type timesheet_status as enum ('draft', 'submitted', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type budget_change_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type automation_run_status as enum ('success', 'skipped', 'error');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Org base currency
-- ----------------------------------------------------------------------------
alter table organizations
  add column if not exists base_currency text not null default 'USD';

-- ----------------------------------------------------------------------------
-- Quotes
-- ----------------------------------------------------------------------------
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  number text not null,
  name text not null,
  type project_type not null,
  description text,
  status quote_status not null default 'draft',
  currency text not null default 'USD',
  valid_until date,
  current_version_id uuid,
  converted_to_project_id uuid references projects(id) on delete set null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);
create index if not exists quotes_org_status_idx on quotes (organization_id, status);

create table if not exists quote_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  quote_id uuid not null references quotes(id) on delete cascade,
  version_number int not null,
  status text not null default 'draft',
  notes text,
  -- line items as jsonb: array of { id, category, description, quantity, unit, rate, costRate, amount }
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  internal_cost numeric(12,2) not null default 0,
  tax_rate numeric(5,4) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (quote_id, version_number)
);
create index if not exists quote_versions_quote_idx on quote_versions (quote_id);

-- ----------------------------------------------------------------------------
-- Invoices
-- ----------------------------------------------------------------------------
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete restrict,
  client_id uuid not null references clients(id) on delete restrict,
  number text not null,
  type invoice_type not null,
  status invoice_status not null default 'draft',
  issue_date date not null,
  due_date date not null,
  currency text not null default 'USD',
  notes text,
  -- line items as jsonb: array of { id, description, quantity, unit, rate, amount }
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  tax_rate numeric(5,4) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  paid_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);
create index if not exists invoices_org_status_idx on invoices (organization_id, status);
create index if not exists invoices_project_idx on invoices (project_id);

-- ----------------------------------------------------------------------------
-- Automations
-- ----------------------------------------------------------------------------
create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  category text not null,
  -- trigger / conditions / actions are AutomationStep document shapes
  trigger jsonb not null,
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  run_count int not null default 0,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists automations_org_active_idx on automations (organization_id, is_active);

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  rule_id uuid not null references automations(id) on delete cascade,
  trigger_type text not null,
  trigger_summary text not null,
  entity_type text,
  entity_id text,
  status automation_run_status not null,
  -- list of { type, label, outcome, detail }
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists automation_runs_org_created_idx
  on automation_runs (organization_id, created_at desc);
create index if not exists automation_runs_rule_idx on automation_runs (rule_id);

-- ----------------------------------------------------------------------------
-- Timesheet submissions
-- ----------------------------------------------------------------------------
create table if not exists timesheet_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  week_start date not null,
  status timesheet_status not null default 'draft',
  total_minutes int not null default 0,
  billable_minutes int not null default 0,
  -- list of time_entries.id values covered by this submission
  entry_ids uuid[] not null default array[]::uuid[],
  notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id, week_start)
);
create index if not exists timesheet_submissions_org_status_idx
  on timesheet_submissions (organization_id, status);

-- ----------------------------------------------------------------------------
-- FX rates (per-org foreign currency rate table)
-- ----------------------------------------------------------------------------
create table if not exists fx_rates (
  organization_id uuid not null references organizations(id) on delete cascade,
  currency text not null,
  rate_to_base numeric(14,6) not null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, currency)
);

-- ----------------------------------------------------------------------------
-- Budget change requests
-- ----------------------------------------------------------------------------
create table if not exists budget_change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  requested_by uuid not null references profiles(id) on delete restrict,
  delta numeric(12,2) not null,
  reason text not null,
  status budget_change_status not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id),
  review_note text,
  created_at timestamptz not null default now()
);
create index if not exists budget_change_org_status_idx
  on budget_change_requests (organization_id, status);
create index if not exists budget_change_project_idx
  on budget_change_requests (project_id);

-- ----------------------------------------------------------------------------
-- User skills (per-org skill matrix)
-- ----------------------------------------------------------------------------
create table if not exists user_skills (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  skill text not null,
  proficiency smallint not null check (proficiency between 0 and 4),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id, skill)
);

-- ----------------------------------------------------------------------------
-- Time tracking config (one row per org)
-- ----------------------------------------------------------------------------
create table if not exists time_tracking_configs (
  organization_id uuid primary key references organizations(id) on delete cascade,
  rounding text not null default 'exact',
  locked_weeks date[] not null default array[]::date[],
  idle_threshold_minutes int not null default 0,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
drop trigger if exists trg_quotes_updated on quotes;
create trigger trg_quotes_updated before update on quotes
  for each row execute function set_updated_at();

drop trigger if exists trg_invoices_updated on invoices;
create trigger trg_invoices_updated before update on invoices
  for each row execute function set_updated_at();

drop trigger if exists trg_automations_updated on automations;
create trigger trg_automations_updated before update on automations
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS — every new table gets the same is_member_of() gate
-- ----------------------------------------------------------------------------
alter table quotes enable row level security;
alter table quote_versions enable row level security;
alter table invoices enable row level security;
alter table automations enable row level security;
alter table automation_runs enable row level security;
alter table timesheet_submissions enable row level security;
alter table fx_rates enable row level security;
alter table budget_change_requests enable row level security;
alter table user_skills enable row level security;
alter table time_tracking_configs enable row level security;

drop policy if exists quotes_tenant on quotes;
create policy quotes_tenant on quotes for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

drop policy if exists quote_versions_tenant on quote_versions;
create policy quote_versions_tenant on quote_versions for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

drop policy if exists invoices_tenant on invoices;
create policy invoices_tenant on invoices for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

-- Automations: read for any member, write only for admins / pms
drop policy if exists automations_select on automations;
create policy automations_select on automations for select
  using (is_member_of(organization_id));
drop policy if exists automations_write on automations;
create policy automations_write on automations for all
  using (has_role_in(organization_id, array['super_admin','admin','pm']::org_role[]))
  with check (has_role_in(organization_id, array['super_admin','admin','pm']::org_role[]));

drop policy if exists automation_runs_select on automation_runs;
create policy automation_runs_select on automation_runs for select
  using (is_member_of(organization_id));
drop policy if exists automation_runs_insert on automation_runs;
create policy automation_runs_insert on automation_runs for insert
  with check (is_member_of(organization_id));

-- Timesheets: any member can see their own org's; users insert their own;
-- admins / pms approve.
drop policy if exists timesheet_select on timesheet_submissions;
create policy timesheet_select on timesheet_submissions for select
  using (is_member_of(organization_id));
drop policy if exists timesheet_self_insert on timesheet_submissions;
create policy timesheet_self_insert on timesheet_submissions for insert
  with check (
    is_member_of(organization_id) and user_id = auth.uid()
  );
drop policy if exists timesheet_self_update on timesheet_submissions;
create policy timesheet_self_update on timesheet_submissions for update
  using (
    is_member_of(organization_id) and (
      user_id = auth.uid()
      or has_role_in(organization_id, array['super_admin','admin','pm']::org_role[])
    )
  );

drop policy if exists fx_select on fx_rates;
create policy fx_select on fx_rates for select
  using (is_member_of(organization_id));
drop policy if exists fx_admin_write on fx_rates;
create policy fx_admin_write on fx_rates for all
  using (has_role_in(organization_id, array['super_admin','admin','finance']::org_role[]))
  with check (has_role_in(organization_id, array['super_admin','admin','finance']::org_role[]));

drop policy if exists bcr_tenant on budget_change_requests;
create policy bcr_tenant on budget_change_requests for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

drop policy if exists user_skills_tenant on user_skills;
create policy user_skills_tenant on user_skills for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

drop policy if exists ttc_select on time_tracking_configs;
create policy ttc_select on time_tracking_configs for select
  using (is_member_of(organization_id));
drop policy if exists ttc_admin_write on time_tracking_configs;
create policy ttc_admin_write on time_tracking_configs for all
  using (has_role_in(organization_id, array['super_admin','admin','pm']::org_role[]))
  with check (has_role_in(organization_id, array['super_admin','admin','pm']::org_role[]));

-- ----------------------------------------------------------------------------
-- Tighter Storage RLS for the project-files bucket
--
-- Path layout:  <orgId>/<projectId>/<fileId>-<sanitised filename>
-- so split_part(name, '/', 1) is the org id we check membership against.
--
-- This replaces the broad "any authenticated" policies from 0002.
-- ----------------------------------------------------------------------------
drop policy if exists "Authenticated read project-files" on storage.objects;
drop policy if exists "Authenticated upload project-files" on storage.objects;
drop policy if exists "Owner delete project-files" on storage.objects;
drop policy if exists "Org members read project-files" on storage.objects;
drop policy if exists "Org members upload project-files" on storage.objects;
drop policy if exists "Org members delete project-files" on storage.objects;

create policy "Org members read project-files" on storage.objects
  for select using (
    bucket_id = 'project-files'
    and is_member_of((split_part(name, '/', 1))::uuid)
  );

create policy "Org members upload project-files" on storage.objects
  for insert with check (
    bucket_id = 'project-files'
    and is_member_of((split_part(name, '/', 1))::uuid)
  );

create policy "Org members delete project-files" on storage.objects
  for delete using (
    bucket_id = 'project-files'
    and is_member_of((split_part(name, '/', 1))::uuid)
  );
