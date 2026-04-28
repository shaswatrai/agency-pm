"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface UserAvatarUser {
  name: string;
  avatarUrl?: string | null;
}

const sizeClasses: Record<string, string> = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-11 text-sm",
};

export function UserAvatar({
  user,
  size = "md",
  className,
}: {
  user: UserAvatarUser;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <Avatar className={cn(sizeClasses[size], "ring-2 ring-background", className)}>
      {user.avatarUrl ? (
        <AvatarImage src={user.avatarUrl} alt={user.name} />
      ) : null}
      <AvatarFallback>{initials(user.name)}</AvatarFallback>
    </Avatar>
  );
}

export function AvatarStack({
  users,
  max = 3,
  size = "sm",
}: {
  users: UserAvatarUser[];
  max?: number;
  size?: "xs" | "sm" | "md";
}) {
  const visible = users.slice(0, max);
  const overflow = users.length - visible.length;
  return (
    <div className="flex -space-x-1.5">
      {visible.map((u, i) => (
        <UserAvatar key={`${u.name}-${i}`} user={u} size={size} />
      ))}
      {overflow > 0 ? (
        <Avatar className={cn(sizeClasses[size], "ring-2 ring-background")}>
          <AvatarFallback className="bg-muted text-muted-foreground">
            +{overflow}
          </AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}
