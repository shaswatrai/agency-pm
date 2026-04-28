# Atelier — Agency Project Management

Beautifully crafted project management for agencies that take design seriously. Built as a single Next.js app with five views (Kanban, List, Gantt, Calendar, Mind map), full invoicing, automations, a client portal, and cross-tab realtime sync.

> Status · Phase 1 visual MVP shipped through Phase 5 advanced. 29 routes. In-memory store with `BroadcastChannel` sync — drop-in replaceable with Supabase Realtime + RLS (migration SQL is ready in `supabase/migrations/0001_init.sql`).

## What's in here

**Views** — Kanban (drag-and-drop with `@dnd-kit`), List (TanStack Table + virtualizer), Gantt (custom SVG, weekday lanes, today line, zoom), Calendar (month grid, status-tinted task chips), Mind map (`reactflow` with smoothstep edges), Sprint (Kanban + burndown + velocity).

**Modules** — Dashboard, Project Overview, Clients (list + detail + portal), Projects, My tasks, Timesheet, Resource utilization heatmap, Invoices (list + builder + status workflow), Files, Automations engine, Reports hub (revenue line, task donut, profitability, AR aging, velocity, contributors), Settings (workspace / members / branding accent picker / integrations / security), Profile pages, Auth (login / signup / accept-invite), Read-only public share links, Client portal.

**Polish** — `⌘K` command palette, `C` global Quick Capture, `?` shortcuts panel, `G+letter` go-to navigation, notification center with inline approvals, dark mode, collapsible/mobile sidebar, loading skeletons, animated empty states, live cross-tab presence indicator.

## Stack

- Next.js 16 + React 19 (App Router) — webpack dev, Turbopack available as `npm run dev:turbo`
- Tailwind CSS v4 + custom design tokens (status / priority / health pill system)
- Radix UI primitives + custom shadcn-style components
- Framer Motion for layout transitions, drag lift, pill bounce, page entries
- Zustand (with `useShallow` discipline) for in-memory state
- TanStack Table + Virtual for List view
- `@dnd-kit` for Kanban drag, `reactflow` for Mind map, `react-day-picker` for date pickers
- `BroadcastChannel` for cross-tab realtime — wire-compatible with Supabase Realtime
- Supabase migration ready (`supabase/migrations/0001_init.sql`) with RLS policies for multi-tenant Postgres

## Quick start

```bash
npm install --legacy-peer-deps
npm run dev
```

Open http://localhost:3000 → redirects to the seeded demo workspace `/atelier/dashboard`.

The app starts in **demo mode** (in-memory data, no auth). To switch to real Supabase, set:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
RESEND_API_KEY=...        # for email notifications
EMAIL_FROM="..."
```

Then run the migration in `supabase/migrations/0001_init.sql` against your Supabase project.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js with webpack (low memory) |
| `npm run dev:turbo` | Start with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Demo data

Seeded with 6 team members, 5 clients, 5 projects, 20+ tasks, 6 invoices across statuses, 6 automation rules, and project-scoped activity events. Open two browser tabs to see live cross-tab sync — drag a card in one tab, watch it move in the other.

## Try the polish

- **⌘K** — global search across projects / clients / tasks
- **C** — open Quick Capture from anywhere
- **?** — keyboard shortcuts help
- **G then D / P / T / I / U / R** — navigate to Dashboard / Projects / Tasks / Invoices / Utilization / Reports
- **Right-click** any Kanban card — submenu for status / priority / assignees / duplicate / delete
- **Click any avatar** on a project Overview right rail to open that team member's profile
- **Settings → Branding** — pick a different accent color and watch the whole app re-paint live
- **Project header → Share** — generate a public read-only link

## Deploying

This is a stock Next.js project. Vercel deploys it as-is via `git push` after wiring the GitHub repo to a Vercel project. No environment variables required for demo mode.
