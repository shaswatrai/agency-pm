-- ============================================================================
-- Agency PM System — Phase 1 schema
-- Multi-tenant via organization_id + Postgres RLS on every table.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type org_role as enum (
  'super_admin', 'admin', 'pm', 'member', 'finance', 'qa', 'client'
);
create type client_status as enum ('prospect', 'active', 'on_hold', 'churned');
create type project_status as enum (
  'draft', 'pending_approval', 'active', 'on_hold', 'completed', 'cancelled', 'archived'
);
create type project_type as enum (
  'web_dev', 'app_dev', 'digital_marketing', 'branding', 'maintenance', 'other'
);
create type project_health as enum ('green', 'yellow', 'red');
create type priority as enum ('low', 'medium', 'high', 'urgent');
create type task_status as enum (
  'todo', 'in_progress', 'in_review', 'revisions', 'done', 'blocked'
);
create type billing_model as enum (
  'fixed_price', 'time_and_materials', 'retainer', 'milestone'
);
create type contract_type as enum ('retainer', 'project', 'hybrid', 'tm');
create type approval_status as enum ('pending', 'approved', 'rejected');

-- ----------------------------------------------------------------------------
-- Core tenant tables
-- ----------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  slug citext unique not null,
  name text not null,
  logo_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role org_role not null default 'member',
  cost_rate numeric(10,2),
  bill_rate numeric(10,2),
  weekly_capacity numeric(5,2) default 40,
  skills text[] default array[]::text[],
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index on organization_members (user_id);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email citext not null,
  role org_role not null default 'member',
  token text unique not null,
  invited_by uuid references profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Domain tables (PRD §5.1, §5.2, §5.3)
-- ----------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  name text not null,
  industry text,
  company_size text,
  primary_contact_name text,
  primary_contact_email citext,
  primary_contact_phone text,
  billing_address jsonb,
  tax_id text,
  payment_terms text default 'net_30',
  currency text not null default 'USD',
  contract_type contract_type not null default 'project',
  status client_status not null default 'active',
  account_manager_id uuid references profiles(id),
  tags text[] default array[]::text[],
  notes text,
  logo_url text,
  portal_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index on clients (organization_id, status);

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  code text not null,
  name text not null,
  type project_type not null,
  sub_type text,
  start_date date,
  end_date date,
  status project_status not null default 'draft',
  priority priority not null default 'medium',
  project_manager_id uuid references profiles(id),
  billing_model billing_model not null default 'fixed_price',
  total_budget numeric(12,2),
  estimated_hours numeric(10,2),
  hourly_rate_override numeric(10,2),
  retainer_hours_per_month numeric(8,2),
  tags text[] default array[]::text[],
  description text,
  client_portal_visible boolean not null default true,
  health project_health not null default 'green',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index on projects (organization_id, status);
create index on projects (client_id);

create table phases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  position int not null,
  description text,
  start_date date,
  end_date date,
  is_complete boolean not null default false,
  created_at timestamptz not null default now()
);
create index on phases (project_id, position);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  phase_id uuid references phases(id) on delete set null,
  code text not null,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority priority not null default 'medium',
  task_type text,
  start_date date,
  due_date date,
  estimated_hours numeric(8,2),
  story_points int,
  reviewer_id uuid references profiles(id),
  client_visible boolean not null default false,
  position int not null default 0,
  tags text[] default array[]::text[],
  figma_url text,
  repo_url text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index on tasks (project_id, status);
create index on tasks (project_id, phase_id, position);

create table task_assignees (
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

create table task_dependencies (
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  type text not null default 'finish_to_start',
  primary key (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);
create index on comments (task_id, created_at);

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete restrict,
  entry_date date not null,
  duration_minutes int not null check (duration_minutes > 0),
  description text,
  billable boolean not null default true,
  billing_rate numeric(10,2),
  approval_status approval_status not null default 'pending',
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  timer_started_at timestamptz,
  timer_ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index on time_entries (organization_id, user_id, entry_date);
create index on time_entries (task_id);

create table files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  version int not null default 1,
  uploaded_by uuid references profiles(id),
  client_visible boolean not null default false,
  created_at timestamptz not null default now()
);
create index on files (project_id);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references profiles(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on activity_log (organization_id, created_at desc);
create index on activity_log (entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_organizations_updated before update on organizations
  for each row execute function set_updated_at();
create trigger trg_clients_updated before update on clients
  for each row execute function set_updated_at();
create trigger trg_projects_updated before update on projects
  for each row execute function set_updated_at();
create trigger trg_tasks_updated before update on tasks
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Helper: is_member_of_org (used by RLS)
-- ----------------------------------------------------------------------------
create or replace function is_member_of(org uuid) returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from organization_members
    where organization_id = org and user_id = auth.uid()
  );
$$;

create or replace function has_role_in(org uuid, allowed org_role[]) returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from organization_members
    where organization_id = org
      and user_id = auth.uid()
      and role = any(allowed)
  );
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table organization_members enable row level security;
alter table invitations enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table phases enable row level security;
alter table tasks enable row level security;
alter table task_assignees enable row level security;
alter table task_dependencies enable row level security;
alter table comments enable row level security;
alter table time_entries enable row level security;
alter table files enable row level security;
alter table activity_log enable row level security;

-- Profiles: each user can read their own + members of orgs they belong to
create policy profiles_self on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_org_visible on profiles for select
  using (
    exists (
      select 1 from organization_members m1
      join organization_members m2 on m1.organization_id = m2.organization_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );

-- Organizations: only members can see
create policy organizations_select on organizations for select
  using (is_member_of(id));
create policy organizations_admin on organizations for update
  using (has_role_in(id, array['super_admin','admin']::org_role[]))
  with check (has_role_in(id, array['super_admin','admin']::org_role[]));

-- organization_members: visible to members of same org
create policy om_select on organization_members for select
  using (is_member_of(organization_id));
create policy om_admin_write on organization_members for all
  using (has_role_in(organization_id, array['super_admin','admin']::org_role[]))
  with check (has_role_in(organization_id, array['super_admin','admin']::org_role[]));

-- Invitations: only admins of the org can manage
create policy inv_admin on invitations for all
  using (has_role_in(organization_id, array['super_admin','admin']::org_role[]))
  with check (has_role_in(organization_id, array['super_admin','admin']::org_role[]));

-- Generic tenant-scoped policies (clients, projects, phases, tasks, etc.)
create policy clients_tenant on clients for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

create policy projects_tenant on projects for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

create policy phases_tenant on phases for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

create policy tasks_tenant on tasks for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

create policy task_assignees_tenant on task_assignees for all
  using (
    exists (select 1 from tasks t where t.id = task_id and is_member_of(t.organization_id))
  )
  with check (
    exists (select 1 from tasks t where t.id = task_id and is_member_of(t.organization_id))
  );

create policy task_deps_tenant on task_dependencies for all
  using (
    exists (select 1 from tasks t where t.id = task_id and is_member_of(t.organization_id))
  )
  with check (
    exists (select 1 from tasks t where t.id = task_id and is_member_of(t.organization_id))
  );

create policy comments_tenant on comments for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

create policy time_entries_select on time_entries for select
  using (is_member_of(organization_id));
create policy time_entries_self_insert on time_entries for insert
  with check (
    is_member_of(organization_id) and user_id = auth.uid()
  );
create policy time_entries_self_update on time_entries for update
  using (
    is_member_of(organization_id) and (
      user_id = auth.uid()
      or has_role_in(organization_id, array['super_admin','admin','pm']::org_role[])
    )
  );

create policy files_tenant on files for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

-- activity_log: read-only for members; inserts only via server
create policy activity_select on activity_log for select
  using (is_member_of(organization_id));
