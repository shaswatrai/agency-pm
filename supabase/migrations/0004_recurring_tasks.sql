-- ============================================================================
-- Pass 5 chunk 2 — recurring task rules
--
-- Auto-generates tasks on a schedule (daily / weekly / monthly). The most
-- common case for an agency is monthly retainer work — "create the same 4
-- tasks at the start of each calendar month for client X".
--
-- Engine: lib/automation/recurring.ts runs once on app boot and bumps the
-- rule's `last_run_at` after materialising. Tasks are created via the
-- regular addTask path so they go through the same activity log + email
-- side-effects as anything else.
-- ============================================================================

do $$ begin
  create type recurrence_freq as enum ('daily', 'weekly', 'monthly');
exception when duplicate_object then null; end $$;

create table if not exists recurring_task_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  phase_id uuid references phases(id) on delete set null,
  name text not null,
  is_active boolean not null default true,
  freq recurrence_freq not null,
  -- multiplier: every <interval> day/week/month
  interval_count int not null default 1 check (interval_count > 0),
  -- 0=Sun … 6=Sat (used when freq='weekly'; null otherwise)
  day_of_week smallint check (day_of_week between 0 and 6),
  -- 1..28 (used when freq='monthly'; capped at 28 to avoid Feb edge cases)
  day_of_month smallint check (day_of_month between 1 and 28),
  -- task template: anything we want to copy onto each generated task.
  -- shape mirrors the in-memory store (camelCase keys preserved).
  task_template jsonb not null,
  start_date date not null,
  end_date date,
  last_run_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rtr_org_active_idx
  on recurring_task_rules (organization_id, is_active);
create index if not exists rtr_project_idx
  on recurring_task_rules (project_id);

drop trigger if exists trg_rtr_updated on recurring_task_rules;
create trigger trg_rtr_updated before update on recurring_task_rules
  for each row execute function set_updated_at();

alter table recurring_task_rules enable row level security;

drop policy if exists rtr_select on recurring_task_rules;
create policy rtr_select on recurring_task_rules for select
  using (is_member_of(organization_id));

drop policy if exists rtr_write on recurring_task_rules;
create policy rtr_write on recurring_task_rules for all
  using (has_role_in(organization_id, array['super_admin','admin','pm']::org_role[]))
  with check (has_role_in(organization_id, array['super_admin','admin','pm']::org_role[]));
