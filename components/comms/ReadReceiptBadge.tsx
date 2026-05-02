"use client";

import { useMemo } from "react";
import { Eye } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useStore } from "@/lib/db/store";
import type { ReadReceipt } from "@/types/domain";

interface Props {
  entityType: ReadReceipt["entityType"];
  entityId: string;
  /** Compact version — just the eye icon + count. */
  compact?: boolean;
}

/**
 * Read receipts surface (PRD §5.5.3). Renders nothing when no receipts
 * exist yet (avoids visual noise on every task). When present, shows
 * who viewed and how recently.
 */
export function ReadReceiptBadge({ entityType, entityId, compact }: Props) {
  const receipts = useStore((s) => s.readReceipts);

  const matching = useMemo(
    () =>
      receipts.filter(
        (r) => r.entityType === entityType && r.entityId === entityId,
      ),
    [receipts, entityType, entityId],
  );

  if (matching.length === 0) return null;

  const mostRecent = matching.reduce(
    (a, b) => (a.lastViewedAt > b.lastViewedAt ? a : b),
    matching[0],
  );

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-pill bg-status-progress/15 px-1.5 py-0.5 text-[10px] font-medium text-status-progress"
        title={`Last viewed ${formatDistanceToNow(parseISO(mostRecent.lastViewedAt))} ago`}
      >
        <Eye className="size-2.5" />
        {matching.length}
      </span>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
      <Eye className="mt-0.5 size-3.5 shrink-0 text-status-progress" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          Viewed by {matching.length}{" "}
          {matching.length === 1 ? "person" : "people"}
        </p>
        <ul className="mt-0.5 space-y-0.5 text-[11px] text-muted-foreground">
          {matching.slice(0, 3).map((r) => (
            <li key={r.id}>
              {r.viewerEmail ?? r.viewerUserId ?? "(unknown)"} ·{" "}
              {formatDistanceToNow(parseISO(r.lastViewedAt))} ago
              {r.viewCount > 1 && ` · ${r.viewCount} views`}
            </li>
          ))}
          {matching.length > 3 && (
            <li className="text-muted-foreground">
              and {matching.length - 3} more
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
