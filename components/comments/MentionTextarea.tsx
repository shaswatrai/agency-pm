"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useStore } from "@/lib/db/store";
import { suggestMentions, tokenFor } from "@/lib/mentions";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (next: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

/**
 * Textarea wrapper with @-mention autocomplete. When the user types
 * "@" followed by a letter, a popup of matching users appears; arrow
 * keys + Enter inserts the canonical "@firstname.lastname" token.
 */
export const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(
  function MentionTextarea(
    { value, onChange, onSubmit, placeholder, className, rows = 2 },
    ref,
  ) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const users = useStore((s) => s.users);
    const meId = useStore((s) => s.currentUserId);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIdx, setActiveIdx] = useState(0);
    const triggerStartRef = useRef<number>(-1);

    const suggestions = open ? suggestMentions(query, users, meId, 6) : [];

    // Detect "@…" before the caret on every keystroke
    useEffect(() => {
      const ta = innerRef.current;
      if (!ta) return;
      const caret = ta.selectionStart;
      const before = value.slice(0, caret);
      const m = before.match(/(^|\s)@([a-z][a-z0-9._-]*)$/i);
      if (m) {
        triggerStartRef.current = caret - m[2].length - 1;
        setQuery(m[2]);
        setOpen(true);
        setActiveIdx(0);
      } else {
        setOpen(false);
        triggerStartRef.current = -1;
      }
    }, [value]);

    function insertSuggestion(idx: number) {
      const user = suggestions[idx];
      if (!user) return;
      const ta = innerRef.current;
      if (!ta) return;
      const start = triggerStartRef.current;
      const caret = ta.selectionStart;
      if (start < 0) return;
      const before = value.slice(0, start);
      const after = value.slice(caret);
      const insertion = `${tokenFor(user)} `;
      const next = `${before}${insertion}${after}`;
      onChange(next);
      // Move caret after insertion on the next tick
      queueMicrotask(() => {
        const newCaret = before.length + insertion.length;
        ta.focus();
        ta.setSelectionRange(newCaret, newCaret);
      });
      setOpen(false);
    }

    return (
      <div className="relative flex-1">
        <textarea
          ref={innerRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
            className,
          )}
          onKeyDown={(e) => {
            if (open && suggestions.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIdx((i) => (i + 1) % suggestions.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertSuggestion(activeIdx);
                return;
              }
              if (e.key === "Escape") {
                setOpen(false);
                return;
              }
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSubmit?.();
            }
          }}
        />
        {open && suggestions.length > 0 && (
          <div className="absolute left-0 z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
            <ul className="max-h-56 overflow-y-auto p-1">
              {suggestions.map((u, i) => (
                <li
                  key={u.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertSuggestion(i);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm",
                    i === activeIdx ? "bg-accent" : "hover:bg-accent/60",
                  )}
                >
                  <UserAvatar
                    user={{ name: u.fullName, avatarUrl: u.avatarUrl }}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.fullName}</p>
                    <p className="truncate text-[11px] text-muted-foreground font-mono">
                      {tokenFor(u)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t px-2 py-1 text-[10px] text-muted-foreground">
              ↑↓ to navigate · ⏎ to insert · esc to dismiss
            </div>
          </div>
        )}
      </div>
    );
  },
);
