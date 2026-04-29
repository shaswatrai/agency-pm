-- ============================================================================
-- Pass 5 chunk 5 — custom report builder
--
-- A "custom report" is a saved query config: data source, group-by field,
-- measure (count / sum / avg over a numeric field), filter list, and a
-- visual (table / bar / kpi). The runner re-evaluates against live store
-- data on the client at render time, so reports always reflect current
-- state without separate result storage.
-- ============================================================================

create table if not exists custom_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  -- ReportConfig shape (see types/domain.ts)
  config jsonb not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists custom_reports_org_idx
  on custom_reports (organization_id, created_at desc);

drop trigger if exists trg_custom_reports_updated on custom_reports;
create trigger trg_custom_reports_updated before update on custom_reports
  for each row execute function set_updated_at();

alter table custom_reports enable row level security;

drop policy if exists custom_reports_select on custom_reports;
create policy custom_reports_select on custom_reports for select
  using (is_member_of(organization_id));

drop policy if exists custom_reports_write on custom_reports;
create policy custom_reports_write on custom_reports for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));
