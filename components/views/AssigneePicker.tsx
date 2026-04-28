"use client";

import { useState } from "react";
import { Check, Search, UserPlus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { UserAvatar, AvatarStack } from "@/components/UserAvatar";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";

interface AssigneePickerProps {
  taskId: string;
  assigneeIds: string[];
  onChange: (next: string[]) => void;
}

export function AssigneePicker({
  taskId,
  assigneeIds,
  onChange,
}: AssigneePickerProps) {
  const users = useStore((s) => s.users);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = users.filter((u) =>
    u.fullName.toLowerCase().includes(query.toLowerCase()),
  );

  const assignees = users.filter((u) => assigneeIds.includes(u.id));

  const toggle = (userId: string) => {
    if (assigneeIds.includes(userId)) {
      onChange(assigneeIds.filter((id) => id !== userId));
    } else {
      onChange([...assigneeIds, userId]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "group flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-accent",
          )}
        >
          {assignees.length > 0 ? (
            <>
              <AvatarStack
                users={assignees.map((u) => ({
                  name: u.fullName,
                  avatarUrl: u.avatarUrl,
                }))}
                max={3}
                size="xs"
              />
              <span className="text-xs text-muted-foreground truncate flex-1 text-left">
                {assignees.length === 1
                  ? assignees[0].fullName
                  : `${assignees.length} people`}
              </span>
            </>
          ) : (
            <>
              <span className="grid size-6 place-items-center rounded-full border border-dashed text-muted-foreground">
                <UserPlus className="size-3" />
              </span>
              <span className="text-xs text-muted-foreground">Assign</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team…"
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1 scrollbar-thin">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No matches
            </p>
          ) : (
            filtered.map((u) => {
              const selected = assigneeIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => toggle(u.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors",
                    selected
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-accent",
                  )}
                >
                  <UserAvatar
                    user={{ name: u.fullName, avatarUrl: u.avatarUrl }}
                    size="xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {u.fullName}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground capitalize">
                      {u.role.replace("_", " ")}
                    </p>
                  </div>
                  {selected ? (
                    <Check className="size-3.5 text-primary" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
