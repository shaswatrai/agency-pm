-- ============================================================================
-- Pass 6 chunk 1 — integrations framework
--
-- Enterprise-grade scaffold for every Phase-4 integration:
--   * integration_providers — static registry (figma, github, slack, …)
--   * integration_credentials — per-org per-provider creds, secret in Vault
--   * integration_connections — multi-account bindings (e.g. two Figma teams)
--   * integration_links — entity ↔ external resource (polymorphic)
--   * webhook_subscriptions — outbound deliveries, signed
--   * webhook_deliveries — at-least-once log with retry/backoff
--   * incoming_webhook_endpoints — provider callbacks (one URL per connection)
--   * incoming_webhook_events — immutable receipt audit
--   * integration_jobs — background queue (token refresh, thumbnail refresh, …)
--   * integration_audit_log — every connect/disconnect/rotate for SOC-2
--
-- Secrets live in Supabase Vault (vault.create_secret); tables only carry
-- the secret UUID. Service-role functions (`integration_get_secret`) read
-- the plaintext server-side. Browser code never sees raw tokens.
-- ============================================================================

create extension if not exists "vault" with schema "vault";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type integration_provider_kind as enum (
  -- design
  'figma',
  'adobe_creative_cloud',
  -- code
  'github',
  'gitlab',
  'bitbucket',
  -- comms
  'slack',
  'microsoft_teams',
  -- storage
  'google_drive',
  'dropbox',
  'onedrive',
  'sharepoint',
  -- marketing
  'google_ads',
  'meta_ads',
  'google_analytics',
  'google_search_console',
  'mailchimp',
  'sendgrid',
  'hootsuite',
  'buffer',
  -- accounting
  'quickbooks',
  'xero',
  'freshbooks',
  -- crm
  'hubspot',
  'salesforce',
  -- calendar
  'google_calendar',
  'outlook_calendar',
  -- devops / hosting
  'jira_import',
  'vercel',
  'netlify',
  'aws',
  -- automation gateways
  'zapier',
  'make',
  -- generic
  'generic_webhook'
);

create type integration_credential_type as enum (
  'oauth2',
  'api_key',
  'personal_access_token',
  'basic_auth',
  'webhook_secret',
  'service_account'
);

create type integration_connection_status as enum (
  'pending',
  'connected',
  'disconnected',
  'expired',
  'error'
);

create type webhook_delivery_status as enum (
  'pending',
  'in_flight',
  'delivered',
  'failed',
  'exhausted'
);

create type integration_job_status as enum (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

-- ----------------------------------------------------------------------------
-- integration_providers — static catalog
-- ----------------------------------------------------------------------------
create table integration_providers (
  kind integration_provider_kind primary key,
  display_name text not null,
  category text not null,
  -- Capability flags
  supports_oauth boolean not null default false,
  supports_api_key boolean not null default false,
  supports_pat boolean not null default false,
  supports_webhook_in boolean not null default false,
  supports_webhook_out boolean not null default false,
  default_scopes text[] not null default array[]::text[],
  documentation_url text,
  is_active boolean not null default true
);

insert into integration_providers (kind, display_name, category, supports_oauth, supports_api_key, supports_pat, supports_webhook_in, supports_webhook_out, default_scopes, documentation_url) values
  ('figma',                'Figma',                  'design',     true,  false, true,  true,  false, array['files:read','file_comments:write'], 'https://www.figma.com/developers/api'),
  ('adobe_creative_cloud', 'Adobe Creative Cloud',   'design',     true,  false, false, false, false, array[]::text[], 'https://developer.adobe.com/'),
  ('github',               'GitHub',                 'code',       true,  false, true,  true,  true,  array['repo','read:org'], 'https://docs.github.com/en/rest'),
  ('gitlab',               'GitLab',                 'code',       true,  false, true,  true,  true,  array['api','read_repository'], 'https://docs.gitlab.com/ee/api/'),
  ('bitbucket',            'Bitbucket',              'code',       true,  false, false, true,  true,  array['repository','pullrequest'], 'https://developer.atlassian.com/cloud/bitbucket/rest/'),
  ('slack',                'Slack',                  'comms',      true,  false, false, true,  true,  array['chat:write','commands'], 'https://api.slack.com/'),
  ('microsoft_teams',      'Microsoft Teams',        'comms',      true,  false, false, true,  true,  array['ChannelMessage.Send'], 'https://learn.microsoft.com/microsoftteams/platform/'),
  ('google_drive',         'Google Drive',           'storage',    true,  false, false, false, false, array['https://www.googleapis.com/auth/drive.file'], 'https://developers.google.com/drive'),
  ('dropbox',              'Dropbox',                'storage',    true,  false, false, false, false, array['files.content.read','files.content.write'], 'https://www.dropbox.com/developers'),
  ('onedrive',             'OneDrive',               'storage',    true,  false, false, false, false, array['Files.ReadWrite'], 'https://learn.microsoft.com/onedrive/developer/'),
  ('sharepoint',           'SharePoint',             'storage',    true,  false, false, false, false, array['Sites.ReadWrite.All'], 'https://learn.microsoft.com/sharepoint/dev/'),
  ('google_ads',           'Google Ads',             'marketing',  true,  false, false, false, false, array['https://www.googleapis.com/auth/adwords'], 'https://developers.google.com/google-ads/api/docs'),
  ('meta_ads',             'Meta Ads Manager',       'marketing',  true,  false, false, false, false, array['ads_read'], 'https://developers.facebook.com/docs/marketing-apis/'),
  ('google_analytics',     'Google Analytics',       'marketing',  true,  false, false, false, false, array['https://www.googleapis.com/auth/analytics.readonly'], 'https://developers.google.com/analytics'),
  ('google_search_console','Google Search Console',  'marketing',  true,  false, false, false, false, array['https://www.googleapis.com/auth/webmasters.readonly'], 'https://developers.google.com/webmaster-tools'),
  ('mailchimp',            'Mailchimp',              'marketing',  true,  true,  false, true,  false, array['campaigns'], 'https://mailchimp.com/developer/'),
  ('sendgrid',             'SendGrid',               'marketing',  false, true,  false, true,  false, array['mail.send','stats.read'], 'https://docs.sendgrid.com/'),
  ('hootsuite',            'Hootsuite',              'marketing',  true,  false, false, false, false, array['social_post'], 'https://developer.hootsuite.com/'),
  ('buffer',               'Buffer',                 'marketing',  true,  false, false, false, false, array['post'], 'https://buffer.com/developers/api'),
  ('quickbooks',           'QuickBooks Online',      'accounting', true,  false, false, true,  true,  array['com.intuit.quickbooks.accounting'], 'https://developer.intuit.com/'),
  ('xero',                 'Xero',                   'accounting', true,  false, false, true,  true,  array['accounting.transactions','accounting.contacts'], 'https://developer.xero.com/'),
  ('freshbooks',           'FreshBooks',             'accounting', true,  false, false, true,  true,  array['user:invoices:read','user:invoices:write'], 'https://www.freshbooks.com/api'),
  ('hubspot',              'HubSpot',                'crm',        true,  false, false, true,  true,  array['crm.objects.deals.read','crm.objects.contacts.read'], 'https://developers.hubspot.com/'),
  ('salesforce',           'Salesforce',             'crm',        true,  false, false, true,  true,  array['api','refresh_token'], 'https://developer.salesforce.com/'),
  ('google_calendar',      'Google Calendar',        'calendar',   true,  false, false, false, false, array['https://www.googleapis.com/auth/calendar'], 'https://developers.google.com/calendar'),
  ('outlook_calendar',     'Outlook Calendar',       'calendar',   true,  false, false, false, false, array['Calendars.ReadWrite'], 'https://learn.microsoft.com/graph/api/'),
  ('jira_import',          'Jira (one-way import)',  'devops',     false, false, true,  false, false, array[]::text[], 'https://developer.atlassian.com/cloud/jira/'),
  ('vercel',               'Vercel',                 'hosting',    false, false, true,  true,  false, array[]::text[], 'https://vercel.com/docs/rest-api'),
  ('netlify',              'Netlify',                'hosting',    false, false, true,  true,  false, array[]::text[], 'https://docs.netlify.com/api/'),
  ('aws',                  'AWS',                    'hosting',    false, true,  false, false, false, array[]::text[], 'https://docs.aws.amazon.com/'),
  ('zapier',               'Zapier',                 'gateway',    false, false, false, true,  true,  array[]::text[], 'https://platform.zapier.com/'),
  ('make',                 'Make (Integromat)',      'gateway',    false, false, false, true,  true,  array[]::text[], 'https://www.make.com/'),
  ('generic_webhook',      'Generic webhook',        'gateway',    false, false, false, true,  true,  array[]::text[], null);

-- ----------------------------------------------------------------------------
-- integration_credentials — one row per (org, provider, account label)
--   * vault_secret_id points at vault.secrets; plaintext lives only there
--   * payload_meta stores non-secret bits (account ids, expiry, etc.)
-- ----------------------------------------------------------------------------
create table integration_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider integration_provider_kind not null references integration_providers(kind),
  credential_type integration_credential_type not null,
  label text not null,
  vault_secret_id uuid not null,
  payload_meta jsonb not null default '{}'::jsonb,
  scopes text[] not null default array[]::text[],
  expires_at timestamptz,
  is_active boolean not null default true,
  last_validated_at timestamptz,
  last_validation_message text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index integration_credentials_org_idx
  on integration_credentials (organization_id, provider);

drop trigger if exists trg_integration_credentials_updated on integration_credentials;
create trigger trg_integration_credentials_updated before update on integration_credentials
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- integration_connections — one per external account this org talks to
--   (e.g. one Figma team, one GitHub org, one Slack workspace)
-- ----------------------------------------------------------------------------
create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  credential_id uuid not null references integration_credentials(id) on delete cascade,
  provider integration_provider_kind not null,
  status integration_connection_status not null default 'pending',
  external_account_id text,
  external_account_label text,
  account_metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index integration_connections_org_idx
  on integration_connections (organization_id, provider, status);

drop trigger if exists trg_integration_connections_updated on integration_connections;
create trigger trg_integration_connections_updated before update on integration_connections
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- integration_links — polymorphic link between an internal entity
-- (task / project / client / phase / invoice) and an external resource
-- (figma frame, github PR, gdrive folder, hubspot deal, ...).
-- ----------------------------------------------------------------------------
create table integration_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  connection_id uuid references integration_connections(id) on delete cascade,
  provider integration_provider_kind not null,
  entity_type text not null check (entity_type in ('task','project','client','phase','invoice','quote','milestone')),
  entity_id uuid not null,
  external_kind text not null,
  external_id text not null,
  external_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index integration_links_entity_idx
  on integration_links (entity_type, entity_id);
create index integration_links_external_idx
  on integration_links (connection_id, external_id);
create index integration_links_org_provider_idx
  on integration_links (organization_id, provider);

drop trigger if exists trg_integration_links_updated on integration_links;
create trigger trg_integration_links_updated before update on integration_links
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- webhook_subscriptions — outbound. Generic-webhook is how you connect
-- accounting (QB/Xero/FreshBooks), Zapier, Make, or any custom endpoint.
-- ----------------------------------------------------------------------------
create table webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  target_url text not null,
  -- HMAC secret for signature header (X-Atelier-Signature: v1=hex(hmac_sha256))
  vault_secret_id uuid not null,
  -- Glob list of event names to deliver. ['*'] = everything.
  event_filter text[] not null default array['*']::text[],
  custom_headers jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  retry_max int not null default 6,
  timeout_ms int not null default 10000,
  last_delivery_at timestamptz,
  last_delivery_status webhook_delivery_status,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index webhook_subscriptions_org_idx
  on webhook_subscriptions (organization_id, is_active);

drop trigger if exists trg_webhook_subscriptions_updated on webhook_subscriptions;
create trigger trg_webhook_subscriptions_updated before update on webhook_subscriptions
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- webhook_deliveries — at-least-once log
--   * idempotency_key prevents duplicate deliveries on retry
--   * next_attempt_at lets the cron worker pick due rows
-- ----------------------------------------------------------------------------
create table webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references webhook_subscriptions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  event_type text not null,
  event_id uuid not null default gen_random_uuid(),
  idempotency_key text not null,
  payload jsonb not null,
  status webhook_delivery_status not null default 'pending',
  attempt_count int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  response_status int,
  response_headers jsonb,
  response_body text,
  signature text,
  created_at timestamptz not null default now()
);
create unique index webhook_deliveries_idem_idx
  on webhook_deliveries (subscription_id, idempotency_key);
create index webhook_deliveries_due_idx
  on webhook_deliveries (status, next_attempt_at)
  where status in ('pending','failed');
create index webhook_deliveries_org_idx
  on webhook_deliveries (organization_id, created_at desc);

-- ----------------------------------------------------------------------------
-- incoming_webhook_endpoints — one per connection. URL contains the
-- endpoint_token; the shared secret is verified against signing headers.
-- Public route: POST /api/integrations/webhooks/in/{endpoint_token}
-- ----------------------------------------------------------------------------
create table incoming_webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  connection_id uuid references integration_connections(id) on delete cascade,
  provider integration_provider_kind not null,
  endpoint_token text unique not null,
  vault_secret_id uuid,
  is_active boolean not null default true,
  last_received_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- incoming_webhook_events — immutable receipt log (audit + replay)
-- ----------------------------------------------------------------------------
create table incoming_webhook_events (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references incoming_webhook_endpoints(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  received_at timestamptz not null default now(),
  request_headers jsonb not null,
  payload jsonb not null,
  signature_verified boolean not null default false,
  processed_at timestamptz,
  process_error text
);
create index incoming_webhook_events_endpoint_idx
  on incoming_webhook_events (endpoint_id, received_at desc);

-- ----------------------------------------------------------------------------
-- integration_jobs — background queue
--   Examples: figma_thumbnail_refresh, oauth_token_refresh,
--             figma_version_snapshot, gh_pr_status_pull
-- ----------------------------------------------------------------------------
create table integration_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  connection_id uuid references integration_connections(id) on delete cascade,
  kind text not null,
  status integration_job_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  run_at timestamptz not null default now(),
  attempts int not null default 0,
  last_error text,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index integration_jobs_due_idx
  on integration_jobs (status, run_at)
  where status in ('pending','failed');

drop trigger if exists trg_integration_jobs_updated on integration_jobs;
create trigger trg_integration_jobs_updated before update on integration_jobs
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- integration_audit_log — immutable trail for SOC-2
-- ----------------------------------------------------------------------------
create table integration_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  provider integration_provider_kind,
  connection_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index integration_audit_log_org_idx
  on integration_audit_log (organization_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Service-role helpers — read/write Vault secrets and emit signed deliveries.
-- ----------------------------------------------------------------------------

-- Store a new secret in vault and return its UUID. SECURITY DEFINER so it
-- runs as the function owner (service role); callers must be authenticated
-- org admins (enforced via RLS on the credential row insert).
create or replace function integration_store_secret(
  p_secret text,
  p_name text,
  p_description text default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  v_id := vault.create_secret(p_secret, p_name, p_description);
  return v_id;
end;
$$;

-- Read a secret. Restricted to service_role only via the revoke below.
create or replace function integration_read_secret(p_secret_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_plaintext text;
begin
  select decrypted_secret into v_plaintext
  from vault.decrypted_secrets
  where id = p_secret_id;
  return v_plaintext;
end;
$$;

revoke all on function integration_read_secret(uuid) from public, anon, authenticated;
grant execute on function integration_read_secret(uuid) to service_role;

-- Rotate a secret in place: writes a new vault.secret and returns the id
-- of the replacement (caller must update integration_credentials).
create or replace function integration_rotate_secret(
  p_old_secret_id uuid,
  p_new_secret text,
  p_name text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_new_id uuid;
begin
  v_new_id := vault.create_secret(p_new_secret, p_name, 'rotation of ' || p_old_secret_id::text);
  perform vault.update_secret(p_old_secret_id, null, null, 'rotated_to=' || v_new_id::text);
  return v_new_id;
end;
$$;

revoke all on function integration_rotate_secret(uuid, text, text) from public, anon, authenticated;
grant execute on function integration_rotate_secret(uuid, text, text) to service_role;

-- ----------------------------------------------------------------------------
-- RLS — admins of the org can manage; others can read non-secret rows.
-- The functions above run as service_role so plaintext never crosses RLS.
-- ----------------------------------------------------------------------------
alter table integration_providers enable row level security;
alter table integration_credentials enable row level security;
alter table integration_connections enable row level security;
alter table integration_links enable row level security;
alter table webhook_subscriptions enable row level security;
alter table webhook_deliveries enable row level security;
alter table incoming_webhook_endpoints enable row level security;
alter table incoming_webhook_events enable row level security;
alter table integration_jobs enable row level security;
alter table integration_audit_log enable row level security;

-- providers: world-readable (it's a static catalog)
create policy integration_providers_read on integration_providers for select
  using (true);

-- credentials: admins write; admins read (no anon/member access at all)
create policy integration_credentials_admin on integration_credentials for all
  using (has_role_in(organization_id, array['super_admin','admin']::org_role[]))
  with check (has_role_in(organization_id, array['super_admin','admin']::org_role[]));

-- connections: members can read (to know what's hooked up), admins write
create policy integration_connections_select on integration_connections for select
  using (is_member_of(organization_id));
create policy integration_connections_admin_write on integration_connections for all
  using (has_role_in(organization_id, array['super_admin','admin']::org_role[]))
  with check (has_role_in(organization_id, array['super_admin','admin']::org_role[]));

-- links: tenant-scoped (any member can link a frame to their task)
create policy integration_links_tenant on integration_links for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

-- webhook subscriptions: admins only
create policy webhook_subscriptions_admin on webhook_subscriptions for all
  using (has_role_in(organization_id, array['super_admin','admin']::org_role[]))
  with check (has_role_in(organization_id, array['super_admin','admin']::org_role[]));

-- webhook deliveries: admins read; service-role writes
create policy webhook_deliveries_admin_select on webhook_deliveries for select
  using (has_role_in(organization_id, array['super_admin','admin']::org_role[]));

-- incoming endpoints: admins manage
create policy incoming_endpoints_admin on incoming_webhook_endpoints for all
  using (has_role_in(organization_id, array['super_admin','admin']::org_role[]))
  with check (has_role_in(organization_id, array['super_admin','admin']::org_role[]));

-- incoming events: admins read; service-role writes
create policy incoming_events_admin_select on incoming_webhook_events for select
  using (has_role_in(organization_id, array['super_admin','admin']::org_role[]));

-- jobs queue: admins read
create policy integration_jobs_admin on integration_jobs for select
  using (has_role_in(organization_id, array['super_admin','admin']::org_role[]));

-- audit log: admins read; immutable (no update/delete policy)
create policy integration_audit_admin_select on integration_audit_log for select
  using (has_role_in(organization_id, array['super_admin','admin']::org_role[]));

-- ----------------------------------------------------------------------------
-- Optional: pg_cron schedule to flush due webhook deliveries every minute.
-- Hosted Supabase has pg_cron available; uncomment to enable. Self-hosters
-- can hit the equivalent HTTP endpoint at /api/integrations/cron/tick from
-- any external scheduler (Vercel Cron, GitHub Actions, uptime ping).
-- ----------------------------------------------------------------------------
-- create extension if not exists "pg_cron";
-- select cron.schedule(
--   'integrations-tick',
--   '* * * * *',
--   $$ select net.http_post(
--        url := current_setting('app.integrations_tick_url', true),
--        headers := jsonb_build_object('x-cron-secret', current_setting('app.cron_secret', true))
--      ) $$
-- );
