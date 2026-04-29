# Local backend setup

This is the one-time setup to run the **real backend** locally — Postgres + auth + storage + realtime — via the Supabase CLI. After this, Connected mode in the app actually persists data.

## Prerequisites

- **Docker Desktop** running (Supabase CLI uses it under the hood)
- **Supabase CLI** — install with `brew install supabase/tap/supabase` on macOS, or see the [official docs](https://supabase.com/docs/guides/local-development/cli/getting-started)

## One-time setup

From the project root:

```bash
# 1. Start the local stack (Postgres, auth, storage, realtime, studio)
#    The migration in supabase/migrations/0001_init.sql applies automatically.
supabase start

# 2. Note the printed credentials; you'll need:
#    API URL  → http://127.0.0.1:54321
#    anon key → eyJ...
#    service_role key → eyJ... (only needed once for admin tasks)
```

`supabase start` prints a block like:

```
API URL: http://127.0.0.1:54321
GraphQL URL: http://127.0.0.1:54321/graphql/v1
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
Inbucket URL: http://127.0.0.1:54324
JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
anon key: eyJhbGciOiJIUzI1NiIs...
service_role key: eyJhbGciOiJIUzI1NiIs...
```

## Configure the app

1. Run the app: `npm run dev`
2. Open http://localhost:3000/atelier/settings
3. Open the **Connections** section
4. Paste:
   - Project URL → `http://127.0.0.1:54321`
   - Anon key → from the CLI output
   - Service-role key → from the CLI output (used once for the migration; clear it after)
5. Click **Test connection** — should say "Connected"
6. Toggle **Connected mode** ON

The data layer adapter (`lib/db/adapter.ts`) detects Connected mode and routes through Supabase. Refresh: data now persists across reloads.

## Optional — Resend

For real email (invites, mentions, milestone-approval auto-invoices):

1. Sign up at [resend.com](https://resend.com) (free tier)
2. Add and verify a domain
3. Generate an API key
4. Paste into Settings → Connections → Resend
5. Click **Test connection** — confirms domain status

The app sends through `/api/email/send` (a server route that takes the API key per request, so the key is never persisted server-side).

## Day-to-day commands

```bash
supabase start    # start local stack (re-applies migrations if changed)
supabase stop     # shut down (preserves DB volume)
supabase status   # see ports + creds again
supabase db reset # nuke local DB and re-run migrations from scratch
supabase studio   # opens http://127.0.0.1:54323 (Postgres GUI)
```

## When you're ready for hosted

Same exact flow against a hosted Supabase project:

1. Sign up at [supabase.com](https://supabase.com), create a project (free tier)
2. Project Settings → API → copy URL + anon key + service-role key
3. SQL Editor → paste & run `supabase/migrations/0001_init.sql`
4. Paste the credentials into Settings → Connections in the app
5. Toggle Connected mode

## Migration plan

The full Pass 2 wiring sequence (status: not yet shipped, but scaffolding is in place):

| Slice | Today | Pass 2 |
|---|---|---|
| Auth | `/login` and `/signup` redirect to demo | Real `supabase.auth.signInWithPassword` / `signUp` |
| Tasks / projects / clients / etc. | Zustand in-memory | Postgres queries through `lib/db/store.ts` adapter |
| Realtime sync | `BroadcastChannel` between same-browser tabs | `supabase.channel(...)` on `tasks` + `comments` table changes |
| File uploads | Stub — UI only | Supabase Storage bucket per project |
| Activity log | Hardcoded events in seed | Triggers / server actions write to `activity_log` table |
| Notifications | Hardcoded list | Subscribe to `activity_log` + automation runs |

The wire format for sync (`SliceMessage` in `lib/db/sync.ts`) is intentionally compatible with Supabase Realtime broadcast events, so the swap is mechanical.
