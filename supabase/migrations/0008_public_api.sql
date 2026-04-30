-- ============================================================================
-- Pass 6 chunk 9 — public API surface
--
-- Adds:
--   * api_tokens — scoped bearer tokens for the public REST API (OAuth-2-style
--                  scopes; per-org). Plaintext stored in Vault, hash here for
--                  cheap lookup.
--   * api_token_usage — per-token rate-limit counters and last-used timestamps.
--   * Helper: api_token_authenticate(prefix, plaintext) for the middleware.
-- ============================================================================

create type api_token_scope as enum (
  'read:tasks', 'write:tasks',
  'read:projects', 'write:projects',
  'read:clients', 'write:clients',
  'read:invoices', 'write:invoices',
  'read:time_entries', 'write:time_entries',
  'read:webhooks', 'write:webhooks',
  'admin'
);

create table api_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  /* The visible 8-char prefix (e.g. "atl_a1b2c3d4") used to look the row up
     before hashing — token hashing is too slow to scan over. */
  prefix text not null,
  /* SHA-256 of the full plaintext, hex-encoded. The plaintext itself lives
     in Vault if the deploy uses real mode; in demo mode it's never stored. */
  hash text not null,
  scopes api_token_scope[] not null default array[]::api_token_scope[],
  expires_at timestamptz,
  is_active boolean not null default true,
  rate_limit_per_minute int not null default 600,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (organization_id, prefix)
);
create index api_tokens_org_idx on api_tokens (organization_id, is_active);
create index api_tokens_prefix_idx on api_tokens (prefix);

create table api_token_usage (
  token_id uuid not null references api_tokens(id) on delete cascade,
  bucket_minute timestamptz not null,
  request_count int not null default 0,
  primary key (token_id, bucket_minute)
);
create index api_token_usage_recent_idx
  on api_token_usage (token_id, bucket_minute desc);

alter table api_tokens enable row level security;
alter table api_token_usage enable row level security;

create policy api_tokens_admin on api_tokens for all
  using (has_role_in(organization_id, array['super_admin','admin']::org_role[]))
  with check (has_role_in(organization_id, array['super_admin','admin']::org_role[]));

create policy api_token_usage_admin on api_token_usage for select
  using (
    exists (
      select 1 from api_tokens t
      where t.id = api_token_usage.token_id
        and has_role_in(t.organization_id, array['super_admin','admin']::org_role[])
    )
  );

/**
 * Look up + authenticate an API token. Service-role only — the public API
 * middleware calls this once per request to verify the bearer token.
 * Returns NULL on failure; rate-limit + scope enforcement happens in app code.
 */
create or replace function api_token_authenticate(p_prefix text, p_hash text)
returns table (token_id uuid, organization_id uuid, scopes api_token_scope[], rate_limit_per_minute int)
language plpgsql
security definer
as $$
begin
  return query
    select t.id, t.organization_id, t.scopes, t.rate_limit_per_minute
    from api_tokens t
    where t.prefix = p_prefix
      and t.hash = p_hash
      and t.is_active
      and (t.expires_at is null or t.expires_at > now());
end;
$$;

revoke all on function api_token_authenticate(text, text) from public, anon, authenticated;
grant execute on function api_token_authenticate(text, text) to service_role;
