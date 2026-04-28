"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
  Eye,
  MessageSquare,
  Upload,
  GitBranch,
  Receipt,
  ArrowRight,
  Filter,
  Activity as ActivityIcon,
  Clock,
} from "lucide-react";
import { useStore } from "@/lib/db/store";
import { Button } from "@/components/ui/button";
import { initials, cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";

type ActivityType =
  | "status_change"
  | "comment"
  | "file_upload"
  | "branch"
  | "approval"
  | "time_logged"
  | "review";

interface ProjectEvent {
  id: string;
  type: ActivityType;
  actorId: string;
  body: string;
  meta?: string;
  createdAt: string;
}

const ICON_MAP: Record<
  ActivityType,
  { icon: React.ComponentType<{ className?: string }>; cls: string; label: string }
> = {
  status_change: {
    icon: CheckCircle2,
    cls: "bg-status-done/15 text-status-done",
    label: "Status",
  },
  comment: {
    icon: MessageSquare,
    cls: "bg-status-progress/15 text-status-progress",
    label: "Comments",
  },
  file_upload: {
    icon: Upload,
    cls: "bg-muted text-muted-foreground",
    label: "Files",
  },
  branch: {
    icon: GitBranch,
    cls: "bg-status-progress/15 text-status-progress",
    label: "Code",
  },
  approval: {
    icon: CheckCircle2,
    cls: "bg-status-done/15 text-status-done",
    label: "Approvals",
  },
  time_logged: {
    icon: Clock,
    cls: "bg-status-revisions/15 text-status-revisions",
    label: "Time",
  },
  review: {
    icon: Eye,
    cls: "bg-status-review/15 text-status-review",
    label: "Reviews",
  },
};

// Synthesize project-scoped events. In a real backend this comes from
// activity_log keyed by entity_id = projectId or task_id ∈ projectTasks.
function buildProjectEvents(projectId: string): ProjectEvent[] {
  const baseLumière: ProjectEvent[] = [
    {
      id: "lev_1",
      type: "review",
      actorId: "u_lina",
      body: "moved \"Editorial homepage hero — concept A\" to In Review",
      meta: "Awaiting Avery",
      createdAt: "2026-04-29T08:42:00Z",
    },
    {
      id: "lev_2",
      type: "comment",
      actorId: "u_marcus",
      body: "commented on \"Build booking flow\"",
      meta: "Need product input on group bookings — split-night editing",
      createdAt: "2026-04-29T08:14:00Z",
    },
    {
      id: "lev_3",
      type: "status_change",
      actorId: "u_nikolai",
      body: "started \"Build booking flow — date picker + room selector\"",
      createdAt: "2026-04-28T11:02:00Z",
    },
    {
      id: "lev_4",
      type: "branch",
      actorId: "u_nikolai",
      body: "opened PR #142",
      meta: "feat/booking-flow-improvements · +247 −82 · 14 files",
      createdAt: "2026-04-28T14:08:00Z",
    },
    {
      id: "lev_5",
      type: "time_logged",
      actorId: "u_lina",
      body: "logged 3.25h on \"Hero v2 — entry animation polish\"",
      createdAt: "2026-04-26T18:18:00Z",
    },
    {
      id: "lev_6",
      type: "approval",
      actorId: "u_marcus",
      body: "client approved Milestone 1",
      meta: "Invoice INV-2026-0014 was auto-drafted",
      createdAt: "2026-04-22T14:00:00Z",
    },
    {
      id: "lev_7",
      type: "file_upload",
      actorId: "u_lina",
      body: "uploaded Hero_v2_export.mp4",
      meta: "18.4 MB · v2",
      createdAt: "2026-04-25T14:00:00Z",
    },
    {
      id: "lev_8",
      type: "status_change",
      actorId: "u_avery",
      body: "completed \"Stakeholder discovery workshops\"",
      createdAt: "2026-03-08T17:30:00Z",
    },
  ];

  const baseHaus: ProjectEvent[] = [
    {
      id: "hev_1",
      type: "review",
      actorId: "u_lina",
      body: "moved \"Logo system — primary mark\" to In Review",
      createdAt: "2026-04-28T13:00:00Z",
    },
    {
      id: "hev_2",
      type: "approval",
      actorId: "u_avery",
      body: "approved \"Logo system — primary mark\"",
      createdAt: "2026-04-28T10:02:00Z",
    },
    {
      id: "hev_3",
      type: "file_upload",
      actorId: "u_lina",
      body: "uploaded Logo_exploration_v3.pdf",
      meta: "6.2 MB · v3",
      createdAt: "2026-04-24T11:00:00Z",
    },
  ];

  const baseMeridian: ProjectEvent[] = [
    {
      id: "mev_1",
      type: "status_change",
      actorId: "u_nikolai",
      body: "completed \"iOS — biometric login + Keychain\"",
      createdAt: "2026-04-28T16:14:00Z",
    },
    {
      id: "mev_2",
      type: "comment",
      actorId: "u_marcus",
      body: "flagged \"Live market data — websocket layer\" as blocked",
      meta: "Vendor sandbox is intermittent — escalating to backend lead",
      createdAt: "2026-04-27T09:42:00Z",
    },
  ];

  const baseOrchid: ProjectEvent[] = [
    {
      id: "oev_1",
      type: "branch",
      actorId: "u_nikolai",
      body: "opened PR #87",
      meta: "feat/headless-cart-checkout · +312 −41",
      createdAt: "2026-04-26T11:18:00Z",
    },
    {
      id: "oev_2",
      type: "comment",
      actorId: "u_lina",
      body: "commented on \"PDP — variant picker animation\"",
      meta: "Ship it after the spring-snap timing tweak.",
      createdAt: "2026-04-26T15:08:00Z",
    },
  ];

  if (projectId === "p_lumiere_site") return baseLumière;
  if (projectId === "p_haus_brand") return baseHaus;
  if (projectId === "p_meridian_app") return baseMeridian;
  if (projectId === "p_orchid_ecom") return baseOrchid;
  return [];
}

export default function ProjectActivityPage() {
  const params = useParams<{ projectId: string }>();
  const users = useStore((s) => s.users);

  const events = useMemo(
    () => buildProjectEvents(params.projectId),
    [params.projectId],
  );

  const [filterType, setFilterType] = useState<ActivityType | "all">("all");

  const types = Array.from(new Set(events.map((e) => e.type)));
  const filtered = events.filter(
    (e) => filterType === "all" || e.type === filterType,
  );

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between gap-3"
      >
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <ActivityIcon className="size-4 text-primary" />
            Activity
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Everything that's happened in this project
          </p>
        </div>
      </motion.div>

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          <Filter className="size-3" /> Filter:
        </span>
        <button
          onClick={() => setFilterType("all")}
          className={cn(
            "rounded-pill border px-2 py-0.5 text-xs font-medium transition-colors",
            filterType === "all"
              ? "border-primary/40 bg-primary/5 text-foreground"
              : "hover:bg-accent",
          )}
        >
          All ({events.length})
        </button>
        {types.map((t) => {
          const meta = ICON_MAP[t];
          const count = events.filter((e) => e.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-xs font-medium transition-colors",
                filterType === t
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "hover:bg-accent",
              )}
            >
              <meta.icon className="size-3" />
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="Nothing yet"
          description="As people work on this project, you'll see status changes, comments, file uploads, approvals, and time logs here."
        />
      ) : (
        <div className="relative">
          {/* Timeline rail */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

          <AnimatePresence>
            <ol className="space-y-4">
              {filtered.map((e, i) => {
                const author = users.find((u) => u.id === e.actorId);
                const meta = ICON_MAP[e.type];
                return (
                  <motion.li
                    key={e.id}
                    layout
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="relative flex gap-4 pl-0"
                  >
                    <div className="relative z-10 shrink-0">
                      <div
                        className={cn(
                          "grid size-8 place-items-center rounded-full ring-4 ring-background",
                          meta.cls,
                        )}
                      >
                        <meta.icon className="size-4" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 pb-2">
                      <div className="flex items-start gap-2">
                        <div
                          className="grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-white"
                          style={{
                            background: `linear-gradient(135deg, hsl(${(i * 47) % 360}, 70%, 55%), hsl(${(i * 47 + 40) % 360}, 70%, 45%))`,
                          }}
                        >
                          {initials(author?.fullName ?? "T")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug">
                            <span className="font-medium">
                              {author?.fullName ?? "Someone"}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {e.body}
                            </span>
                          </p>
                          {e.meta ? (
                            <p className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                              {e.meta}
                            </p>
                          ) : null}
                          <p className="mt-1.5 text-[10px] text-muted-foreground">
                            {format(parseISO(e.createdAt), "MMM d, yyyy · h:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </AnimatePresence>

          <div className="mt-6 flex justify-center">
            <Button variant="ghost" size="sm">
              Load older activity <ArrowRight className="size-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
