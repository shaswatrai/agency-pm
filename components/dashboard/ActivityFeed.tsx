"use client";

import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
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

export function ActivityFeed() {
  const users = useStore((s) => s.users);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold">Recent activity</h3>
          <p className="text-[11px] text-muted-foreground">
            Across all your projects
          </p>
        </div>
        <span className="size-2 rounded-full bg-status-done animate-pulse" />
      </div>
      <ul className="divide-y">
        {FEED.map((item, i) => {
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
