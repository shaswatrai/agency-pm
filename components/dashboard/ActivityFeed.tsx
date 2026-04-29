"use client";

import { motion } from "framer-motion";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Clock,
  GitBranch,
  MessageSquare,
  Receipt,
  Upload,
  UserPlus,
  Eye,
} from "lucide-react";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";
import type { ActivityEvent } from "@/types/domain";

interface ActivityItem {
  id: string;
  type:
    | "task_done"
    | "task_review"
    | "comment"
    | "file_upload"
    | "invoice_paid"
    | "branch_open"
    | "user_added";
  actorId: string;
  body: string;
  meta?: string;
  createdAt: string;
}

const ICON_MAP: Record<
  ActivityItem["type"],
  { icon: React.ComponentType<{ className?: string }>; cls: string }
> = {
  task_done: { icon: CheckCircle2, cls: "text-status-done" },
  task_review: { icon: Eye, cls: "text-status-review" },
  comment: { icon: MessageSquare, cls: "text-status-progress" },
  file_upload: { icon: Upload, cls: "text-muted-foreground" },
  invoice_paid: { icon: Receipt, cls: "text-status-done" },
  branch_open: { icon: GitBranch, cls: "text-status-progress" },
  user_added: { icon: UserPlus, cls: "text-status-review" },
};

const FEED: ActivityItem[] = [
  {
    id: "a_1",
    type: "task_review",
    actorId: "u_lina",
    body: "moved \"Editorial homepage hero — concept A\" to Review",
    meta: "Lumière flagship website",
    createdAt: "2026-04-29T08:42:00Z",
  },
  {
    id: "a_2",
    type: "comment",
    actorId: "u_marcus",
    body: "commented on \"Build booking flow\"",
    meta: "Need product input on group bookings…",
    createdAt: "2026-04-29T08:14:00Z",
  },
  {
    id: "a_3",
    type: "invoice_paid",
    actorId: "u_avery",
    body: "marked INV-2026-0014 as paid",
    meta: "Lumière Hotels · $40,012",
    createdAt: "2026-04-28T17:30:00Z",
  },
  {
    id: "a_4",
    type: "task_done",
    actorId: "u_nikolai",
    body: "completed \"iOS — biometric login + Keychain\"",
    meta: "Meridian app",
    createdAt: "2026-04-28T16:14:00Z",
  },
  {
    id: "a_5",
    type: "branch_open",
    actorId: "u_nikolai",
    body: "opened PR #142 on atelier/lumiere",
    meta: "feat/booking-flow-improvements · +247 −82",
    createdAt: "2026-04-28T14:08:00Z",
  },
  {
    id: "a_6",
    type: "file_upload",
    actorId: "u_lina",
    body: "uploaded Logo_exploration_v3.pdf",
    meta: "Haus of Mode · brand identity",
    createdAt: "2026-04-28T11:24:00Z",
  },
  {
    id: "a_7",
    type: "task_review",
    actorId: "u_avery",
    body: "approved \"Logo system — primary mark\"",
    meta: "Haus of Mode",
    createdAt: "2026-04-28T10:02:00Z",
  },
];

function activityToFeedItem(
  ev: ActivityEvent,
  tasks: { id: string; title: string }[],
): ActivityItem {
  const taskTitle =
    ev.entityType === "task"
      ? tasks.find((t) => t.id === ev.entityId)?.title ?? "a task"
      : null;
  const metaText = ev.metadata as
    | { body?: string; minutes?: number }
    | undefined;

  let type: ActivityItem["type"] = "comment";
  let body = "performed an action";
  if (ev.action === "created" && ev.entityType === "task") {
    type = "task_done";
    body = `created "${taskTitle}"`;
  } else if (ev.action === "completed") {
    type = "task_done";
    body = `completed "${taskTitle}"`;
  } else if (
    ev.action === "moved_to_review" ||
    ev.action === "status_changed"
  ) {
    type = "task_review";
    body = `updated "${taskTitle}"`;
  } else if (ev.action === "added" && ev.entityType === "comment") {
    type = "comment";
    body = `commented · "${(metaText?.body ?? "").slice(0, 60)}…"`;
  } else if (ev.action === "time_logged") {
    type = "task_done";
    body = `logged ${(metaText?.minutes ?? 0)} min on "${taskTitle}"`;
  }

  return {
    id: ev.id,
    type,
    actorId: ev.actorId ?? "",
    body,
    createdAt: ev.createdAt,
  };
}

export function ActivityFeed() {
  const users = useStore((s) => s.users);
  const events = useStore((s) => s.activityEvents);
  const tasks = useStore((s) => s.tasks);

  // Prefer real activity events when present; otherwise show the
  // demo seed so the dashboard isn't empty on a fresh install.
  const realFeed = events
    .slice(0, 12)
    .map((ev) => activityToFeedItem(ev, tasks));
  const items = realFeed.length > 0 ? realFeed : FEED;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold">Recent activity</h3>
          <p className="text-[11px] text-muted-foreground">
            {realFeed.length > 0
              ? "Live across all your projects"
              : "Demo · across all your projects"}
          </p>
        </div>
        <span className="size-2 rounded-full bg-status-done animate-pulse" />
      </div>
      <ul className="divide-y">
        {items.map((item, i) => {
          const user = users.find((u) => u.id === item.actorId);
          const meta = ICON_MAP[item.type];
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex gap-3 px-5 py-3"
            >
              <div className="relative shrink-0">
                <div
                  className="grid size-8 place-items-center rounded-full text-[10px] font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, hsl(${(i * 47) % 360}, 70%, 55%), hsl(${(i * 47 + 40) % 360}, 70%, 45%))`,
                  }}
                >
                  {initials(user?.fullName ?? "T")}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-card ring-2 ring-card",
                    meta.cls,
                  )}
                >
                  <meta.icon className="size-3" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                  <span className="font-medium">
                    {user?.fullName ?? "Someone"}
                  </span>{" "}
                  <span className="text-muted-foreground">{item.body}</span>
                </p>
                {item.meta ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {item.meta}
                  </p>
                ) : null}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {format(parseISO(item.createdAt), "MMM d · h:mm a")}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
