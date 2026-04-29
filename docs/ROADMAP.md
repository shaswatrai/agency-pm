# Roadmap — what's left

This document tracks everything that's been **deferred** from the original PRD and the audit done at the end of the visual MVP phase. Status is honest as of the most recent commit.

Legend:
- ✅ done
- 🟡 partially done / shell exists, no real backing
- ⛔ not started

---

## Pass 1 (current) — Configurable backend & adapter contract

The user shouldn't need to set env vars to swap from demo mode to a real backend. Everything goes through Settings → Connections.

- ✅ Runtime config store (Supabase URL / anon / service-role / Resend / from), persisted to `localStorage`
- ✅ Settings → Connections panel with secret reveal, copy, status badges
- ✅ `Test connection` for Supabase (auth health endpoint)
- ✅ `Test connection` for Resend (via `/api/resend/test` proxy that never stores the key)
- ✅ Connection-status badge in the topbar (Demo mode ↔ Connected)
- ✅ Data adapter stub (`lib/db/adapter.ts`) — exposes `useBackendMode()` so future code can branch
- ✅ This roadmap doc

## Pass 2 — Real auth & persistence (the spine) [DONE]

Goal: enable Connected mode to actually persist data.

**Done in chunk 1 (auth + tasks slice + seeding + hydration):**

- ✅ Local Supabase running via `supabase start` (Postgres + Auth + Storage + Realtime + Studio + Mailpit on `localhost:54321–54324`)
- ✅ Migration `0001_init.sql` applied end-to-end — 14 tables with RLS verified live
- ✅ Browser-side Supabase client (`lib/supabase/client.ts`) reads from runtime config — no env vars
- ✅ `/api/email/send` route (Resend send via per-request API key, never persisted)
- ✅ Adapter helpers (`useBackendMode`, `getSupabaseClient`, `sendEmail`)
- ✅ Local-setup doc (`docs/LOCAL_BACKEND.md`)
- ✅ `/login` + `/signup` actually call `supabase.auth.*` when Connected mode is on (demo-mode redirect kept as fallback)
- ✅ Connected-mode banner on both auth pages so it's obvious which backend is hit
- ✅ `lib/auth/index.ts` — full signup flow: auth signup → profile → org → membership → demo seed
- ✅ `lib/db/seedSupabase.ts` — seeds 5 clients + 5 projects + ~50 phases + 20 tasks + assignees into the new org
- ✅ `lib/db/hydrateFromSupabase.ts` — pulls org + members + clients + projects + phases + tasks (with assignees) from Postgres
- ✅ `<SupabaseHydration />` mounts in the org layout; runs once when Connected + signed-in
- ✅ Real `signOut` wired to the topbar avatar dropdown
- ✅ **Task mutations dual-write to Postgres** (addTask / updateTask / moveTask / removeTask / duplicateTask) — instant Zustand update + best-effort `lib/db/taskSync.ts` mirror. Task IDs are now real UUIDs.

**Done in chunk 2 (other slices dual-write):**

- ✅ `lib/db/recordSync.ts` — generic per-slice insert/update helpers (clients, projects, phases, comments, time entries, plus a tasks bulk-insert for quote-conversion)
- ✅ `addClient` / `addProject` / `addComment` / `addTimeEntry` mirror to Postgres on every call; entity IDs are now real UUIDs
- ✅ `convertQuoteToProject` dual-writes the project + phases + tasks atomically (project first → phases → tasks bulk insert)
- ✅ Hydration extended to fetch `comments` + `time_entries` from Postgres; recomputes `task.commentCount` and `task.actualHours` from real rows
- ✅ Demo seed extended: comments + time entries on first signup populate the `My Tasks` and `Timesheet` pages with real data the user can build on

**Done in chunk 3 (Realtime):**

- ✅ `lib/db/realtime.ts` — `supabase.channel("org:<id>")` subscription with `postgres_changes` listeners on `tasks` (INSERT / UPDATE / DELETE), `comments` (INSERT), `time_entries` (INSERT), and `task_assignees` (INSERT / DELETE). Echo dedupe by id check.
- ✅ Mounted in `<SupabaseHydration />` — fires after initial fetch finishes
- ✅ `BroadcastChannel` sync auto-skips when Connected mode is on so we don't double-update

**Done in chunk 4 (full):**

- ✅ `lib/db/activitySync.ts` — `logActivity({entityType, entityId, action, metadata})` writes to in-memory `activityEvents` slice and mirrors to Postgres `activity_log` when Connected
- ✅ Activity log retrofit across the meaningful mutations:
  - `addTask` → `created`; `moveTask` → `completed` / `moved_to_review` / `status_changed`; `updateTask` → `<field>_changed` per interesting field; `removeTask` → `deleted`; `duplicateTask` → `duplicated`
  - `addComment` → `added` (entity: comment); `addTimeEntry` → `time_logged`
  - `addClient` → `created` (entity: client); `addProject` → `created` (entity: project); `convertQuoteToProject` → `converted_from_quote`
  - `updateInvoiceStatus` → `sent` / `paid` / `status_<x>` (entity: invoice)
  - `setTimesheetStatus` → `timesheet_<status>`
  - `reviewBudgetChange` → `budget_change_<status>` (entity: project)
- ✅ Dashboard `<ActivityFeed />` prefers real `activityEvents` over the hardcoded demo seed; header label flips to "Live" when real events are present
- ✅ Automation engine `send_email` action actually sends via `/api/email/send` when Resend is configured: resolves recipient (assignee for task events, PM for project events), composes minimal HTML, fires the real Resend call
- ✅ **Supabase Storage uploads** (`lib/db/fileSync.ts`): per-project bucket `project-files/<orgId>/<projectId>/<fileId>-<name>`, real upload from the Files page (multi-file picker, loading spinner), `files` table row insert, signed-URL downloads (1-hour TTL). Bucket declared in `supabase/config.toml`. Hydration pulls existing `files` rows on Connected mode.
- ✅ **SSR session gating** (`proxy.ts`, the renamed-from-middleware Next.js 16 convention): `/[orgSlug]/*` paths require a Supabase auth cookie when `atelier-mode=supabase` is set. Demo mode passes through. Public paths (`/login`, `/signup`, `/accept-invite`, `/share`, `/portal`, `/api/*`) skip the gate. Connections panel writes / clears the `atelier-mode` cookie when toggling Connected mode + on Reset. Verified against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — named `proxy` export + config matcher at project root.
- ✅ **Realtime cross-user activity feed + file uploads** (`lib/db/realtime.ts`): subscribes to `activity_log` INSERT (drives the dashboard "Live" feed across teammates) and `files` INSERT (multi-user upload sync; bumps `task.attachmentCount` when the file is task-attached). Echo dedupe by id check.
- ✅ **Direct task-assignment + mention emails** (`lib/db/notify.ts`): independent of the automation engine — `updateTask({assigneeIds})` and `addTask` with assignees fire one Resend email per newly-added teammate (skipping self-assigns); `addComment` scans the body for `@handle` tokens and emails each matched user. No-op silently when Resend isn't configured or recipient lacks an email.

**Done in chunk 5 (full):**

- ✅ Migration `0003_remaining_slices.sql` adds Postgres tables for every previously in-memory-only slice: `quotes` (header) + `quote_versions` (jsonb line items), `invoices` (header + jsonb line items), `automations`, `automation_runs`, `timesheet_submissions`, `fx_rates` (per-org currency table) + `organizations.base_currency`, `budget_change_requests`, `user_skills`, `time_tracking_configs`. All tenant-scoped via `is_member_of()` RLS, with role-gated writes for automations / FX / time-tracking config.
- ✅ `updateClient` + `updateProject` mutations on the Zustand store, wired through to `recordSync.syncClientUpdate` / `syncProjectUpdate` and emit `client.updated` / `project.updated` activity entries.
- ✅ `reviewBudgetChange` now mirrors the bumped `total_budget` to Postgres on approval (was previously only updating the in-memory project row).
- ✅ Per-project chooser dialog on the Files page — picking files opens a modal where the user selects which project to attach to (defaults to first active, sorted active-first then alphabetical) before the upload kicks off. Demo / Connected hint appears inline.
- ✅ **Tighter Storage RLS** — `project-files` policies switched from "any authenticated user" to org-membership checks against the first path segment (`<orgId>/...`), using the existing `is_member_of(uuid)` helper. Read / upload / delete all gated.

**Done in chunk 6 (Pass 2 closeout — every remaining hole):**

- ✅ **Real invite email + invitation row** (`lib/auth/invite.ts`): Settings → Members invite button now writes a row into the `invitations` table (Connected mode) and sends a Resend email with the accept-invite link. Role select is wired (member / pm / admin / finance / qa). Demo mode just sends the email if Resend is configured, no row.
- ✅ **Invoice-sent email** + status dual-write: `updateInvoiceStatus(id, "sent")` mirrors to Postgres and fires a Resend email to the client's primary contact with the invoice number, project, total, and due date.
- ✅ **Deliverable-approved email**: when a `clientVisible` task flips to `done` (typical: client portal Approve), `notifyDeliverableApproved` emails the project PM + every assignee.
- ✅ **Dual-writes for every previously-missing slice**:
  - `addInvoice` → `invoices` row insert
  - `addQuote` → `quotes` row + `quote_versions` rows
  - `addQuoteVersion` / `setCurrentQuoteVersion` / `updateQuoteStatus` → respective `quote_versions` insert + `quotes` updates
  - `toggleAutomation` → `automations.is_active` update
  - Automation engine run loop → `automation_runs` insert + `automations` upsert (run count + lastRunAt)
  - `setTimesheetStatus` → `timesheet_submissions` update with the status + reviewer / submission timestamps
  - `setBaseCurrency` → `organizations.base_currency` update
  - `setFxRate` → `fx_rates` upsert
  - `setUserSkill` → `user_skills` upsert (or delete when proficiency drops to 0)
  - `setTimeTrackingConfig` / `toggleLockedWeek` → `time_tracking_configs` upsert
  - `addBudgetChange` → `budget_change_requests` insert
  - `reviewBudgetChange` → `budget_change_requests` update + bumped `projects.total_budget` mirror
- ✅ **Hydration extended** in `hydrateFromSupabase.ts`: pulls quotes (+ versions), invoices, automations + runs, timesheet submissions, fx rates + base currency, budget changes, user skills, and time tracking config on Connected boot. Counts surface in the post-hydration toast.

Pass 2 is now end-to-end real: every mutation path that has a Postgres table writes through, the dashboard "Live" feed and Files page sync across users via Realtime, and email actually fires for the four PRD-promised flows (assignment, mention, invite, deliverable approved + invoice sent).

## Pass 3 — Phase 2 finish (financial) [DONE]

- ✅ Estimate / quote builder (PRD §5.6.1): line items grouped by category, multi-version with timeline, live margin calculator (cost rate vs bill rate per line)
- ✅ Quote-to-project conversion (one click → creates project + phases-from-categories + tasks-from-line-items, links back)
- ✅ Real timesheet approval workflow (PRD §5.3.2): weekly submit, PM approval queue with approve/reject + rejection feedback shown to submitter
- ✅ Skill matrix (per-user skills × team grid, click to cycle proficiency, sort users by skill)
- ✅ Multi-currency FX: org base currency + manual rate table in Settings → Workspace; Reports converts all roll-ups to base currency. Live FX feed sync deferred to Pass 7.
- ✅ Revenue recognition: per-project recognized vs deferred shown on the Budget widget. Milestone projects use sum-of-paid-invoices; others use progress × budget. Two-tone bar visualizes split.
- ✅ Real budget change request workflow: `Request change` button on every project's Budget widget, full review queue at `/atelier/budget-changes`, approval bumps `project.totalBudget` automatically.
- ✅ Time tracking polish: rounding rules (exact / 5 / 15 / 30 min), idle threshold, locked weeks list — all in Settings → Time tracking. Timer reminders deferred (depend on Pass 6 notification engine).
- ✅ Capacity forecast: org-wide stacked-bar curve over the next 8 weeks (allocated vs capacity, peak-load callout) on the Utilization page.
- ✅ Conflict alerts: red banner above the heatmap listing every >100% allocation, with the user / week / hours / capacity / pct.

## Pass 4 — Phase 3 finish (client portal)

- 🟡 Branded portal per client — currently uses workspace branding only; needs per-client logo + accent override
- ⛔ Approval-with-digital-signature (typed name + checkbox saved with timestamp + IP)
- ⛔ Meeting notes + decisions module
- ⛔ Support tickets (post-launch)
- ⛔ Read receipts on shared deliverables
- 🟡 Public share links — works inside the same browser today; needs real backend so an external client URL actually loads

## Pass 5 — Phase 5 finish (advanced)

- 🟡 Sprint module — board + burndown ✅, but no backlog UI, no real sprint planning, no story-points pipeline, no retrospective template
- ⛔ Task dependencies (Finish-to-Start, Start-to-Start, etc.) — type exists, no UI to set, no Gantt arrows
- ⛔ Recurring tasks (cron-style, monthly retainer auto-generation)
- ⛔ SLA module (PRD §5.14): config UI, live timer, escalation chain, SLA dashboard, SLA report per client
- 🟡 Custom report builder — button exists, opens nothing; needs drag-and-drop field picker + chart type + filter + saved/scheduled
- ⛔ Custom dashboard widgets
- ⛔ Release management (group sprints into releases, generate release notes from completed tasks)

## Pass 6 — Real automation engine [DONE]

- ✅ Trigger evaluator: subscribes to store diffs and emits events for `task_status_change` (with target-status filter), `task_created`, `comment_added`, `approval_received`, `milestone_complete`, `budget_threshold`. Same engine carries to Pass 2 — Supabase Realtime feeds the same evaluator.
- 🟡 Condition evaluator: passes through (no rules in seed have conditions today)
- ✅ Action executor with real outcomes:
  · `send_notification` → success (in-app toast)
  · `assign_user` → mutates `task.assigneeIds`
  · `update_priority` → flips project health on budget overrun
  · `create_invoice` → drafts a real invoice row tied to the approved task
  · `send_email` / `post_slack` / `webhook` / `create_task` → recorded as no-op with reason; ready to call real APIs in Pass 2 / Pass 7
- ✅ Automation runs log: `automationRuns` slice (capped at 200), each with `triggerSummary`, action results (ok/noop/error + detail), timestamp; rule cards show last-fired-relative-time + a `Run history` accordion
- ✅ Engine boot: `<AutomationEngineBoot />` mounts in the org layout and starts the subscription
- ⛔ Visual drag-and-drop rule builder (current rule cards are read-only; the builder UI is queued for a follow-up)

## Pass 7 — Phase 4 (integrations) — pick the highest-value 2

Highest value:
- ⛔ Figma deep integration: file API for thumbnails, webhooks for `FILE_COMMENT` and `FILE_UPDATE`, comment sync both directions, version snapshots at milestones, dev-mode handoff URLs
- ⛔ GitHub/GitLab: PR auto-link by branch naming convention, PR status webhooks, deployment status linking

Stubs only (Settings shows them):
- ⛔ Slack channel notifications + slash commands
- ⛔ Microsoft Teams
- ⛔ Google Drive / Dropbox / OneDrive bi-directional sync
- ⛔ QuickBooks / Xero / FreshBooks invoice sync
- ⛔ HubSpot / Salesforce CRM sync
- ⛔ Google Calendar / Outlook
- ⛔ Google Ads / Meta Ads / GA / Search Console / Mailchimp / Hootsuite / Buffer
- ⛔ Vercel / Netlify deployment status
- ⛔ Jira import (one-way migration)

## Pass 8 — REST API + webhooks + Zapier

- ⛔ OAuth 2.0 token issuance for API access
- ⛔ Versioned REST endpoints for clients/projects/tasks/time/invoices
- ⛔ Outbound webhooks with retry + signature verification
- ⛔ Zapier app (triggers + actions)

## Pass 9 — Mobile (Phase 6)

- ⛔ React Native shared codebase (per the PRD's open question; choice deferred)
- ⛔ Time tracking (start/stop, manual entry, weekly view, home-screen widget)
- ⛔ Task management (My Tasks, status updates, comments)
- ⛔ Push notifications
- ⛔ Approval flow on mobile
- ⛔ Quick capture (voice + photo)
- ⛔ Offline mode + sync

## Pass 10 — AI (Phase 6)

- ⛔ AI time estimation from task description
- ⛔ Smart task assignment based on past assignments + skills
- ⛔ NL task creation (`"add a task to design the booking flow due May 15"`)
- ⛔ Predictive project health scoring

## Cross-cutting non-functional work

- ⛔ WCAG 2.1 AA compliance audit + fixes
- ⛔ Localization framework (i18n routing + message catalogs); RTL support for Arabic
- 🟡 Audit log — `activity_log` table exists in migration, no UI consumes it
- ⛔ Data export (CSV / JSON / PDF) per workspace
- ⛔ Workspace deletion + 30-day data purge
- ⛔ SOC 2 Type II posture (encryption review, key rotation, vendor list)
- ⛔ Configurable data residency per tenant
- ⛔ Penetration test + remediation
- ⛔ Performance pass: `React.memo` on KanbanCard, virtualize Kanban columns when > 50 cards, debounce broadcast on rapid drags
- ⛔ PWA install + service worker for static assets

---

## Tracking discipline

When a pass starts, move its items into a per-pass commit message + close them in this doc with the commit SHA. The audit was done in good faith — anything that says ✅ here should actually work end-to-end.
