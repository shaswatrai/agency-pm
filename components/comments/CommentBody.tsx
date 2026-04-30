"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/db/store";
import { parseMentions } from "@/lib/mentions";
import { UserAvatar } from "@/components/UserAvatar";

interface Props {
  body: string;
}

/**
 * Renders a comment body with @mentions styled as inline chips.
 * Unresolved handles still render but use a muted style so the
 * author can see a typo.
 */
export function CommentBody({ body }: Props) {
  const users = useStore((s) => s.users);
  const segments = useMemo(() => parseMentions(body, users), [body, users]);

  return (
    <p className="mt-1 text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.value}</span>;
        if (!seg.user) {
          return (
            <span
              key={i}
              className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-muted-foreground"
              title={`Unknown user @${seg.handle}`}
            >
              {seg.raw}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 align-middle text-xs font-medium text-primary"
            title={seg.user.email}
          >
            <UserAvatar
              user={{ name: seg.user.fullName, avatarUrl: seg.user.avatarUrl }}
              size="xs"
            />
            {seg.user.fullName}
          </span>
        );
      })}
    </p>
  );
}
