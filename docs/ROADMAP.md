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

## Pass 2 — Real auth & persistence (the spine)

Goal: enable Connected mode to actually persist data. No new features; just flip the underlying source.

- ⛔ Apply the existing `supabase/migrations/0001_init.sql` migration (UI-driven)
- ⛔ Browser-side Supabase client wired to runtime config (replaces `NEXT_PUBLIC_*` env consumption)
- ⛔ `/login` and `/signup` actually call `supabase.auth.signInWithPassword` / `signUp`
- ⛔ Session middleware that reads cookies and gates `/[orgSlug]/*`
- ⛔ Org switcher reads `organization_members` from Supabase
- ⛔ `lib/db/store.ts` actions branch on `useBackendMode()` — when `"supabase"`, write through Postgres
- ⛔ Realtime subscription on `tasks`, `comments`, `time_entries` replacing the current `BroadcastChannel`
- ⛔ File uploads land in Supabase Storage with the per-project bucket pattern from the migration
- ⛔ Resend wired to `/api/email/send` for: invite email, mention email, milestone-approved, invoice sent
- ⛔ Activity log auto-generated on every server action; dashboard + project Activity tab read it

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

## Pass 6 — Real automation engine

- 🟡 Automation list page is a visual catalog; rules don't fire
- ⛔ Trigger evaluator (status_change, task_created, budget_threshold, etc.)
- ⛔ Condition evaluator (priority = urgent, type = Design, etc.)
- ⛔ Action executor (send_email via Resend, change_status, assign_user, create_invoice, post_slack via webhook)
- ⛔ Automation logs (which trigger fired, which actions ran, success/error)
- ⛔ Visual rule builder (drag triggers → conditions → actions)

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
