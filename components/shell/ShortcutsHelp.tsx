"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ShortcutGroup {
  heading: string;
  items: { keys: string[]; label: string }[];
}

const GROUPS: ShortcutGroup[] = [
  {
    heading: "Navigation",
    items: [
      { keys: ["⌘", "K"], label: "Open command palette · search" },
      { keys: ["?"], label: "Show this shortcuts panel" },
      { keys: ["G", "D"], label: "Go to dashboard" },
      { keys: ["G", "P"], label: "Go to projects" },
      { keys: ["G", "T"], label: "Go to my tasks" },
      { keys: ["G", "I"], label: "Go to invoices" },
    ],
  },
  {
    heading: "Create",
    items: [
      { keys: ["C"], label: "Quick capture · new task" },
      { keys: ["⌘", "Enter"], label: "Save the active form" },
    ],
  },
  {
    heading: "Task drawer",
    items: [
      { keys: ["Esc"], label: "Close drawer" },
      { keys: ["Click title"], label: "Edit task title inline" },
      { keys: ["Enter"], label: "Save inline edits" },
    ],
  },
  {
    heading: "Kanban",
    items: [
      { keys: ["Click & drag"], label: "Move card across columns" },
      { keys: ["Click card"], label: "Open task detail drawer" },
    ],
  },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const [pendingG, setPendingG] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isTyping) return;

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }

      // G-prefix navigation
      if ((e.key === "g" || e.key === "G") && !e.metaKey && !e.ctrlKey) {
        setPendingG(Date.now());
        return;
      }
      if (pendingG && Date.now() - pendingG < 1500) {
        const slug = window.location.pathname.split("/")[1];
        let href: string | null = null;
        if (e.key === "d" || e.key === "D") href = `/${slug}/dashboard`;
        if (e.key === "p" || e.key === "P") href = `/${slug}/projects`;
        if (e.key === "t" || e.key === "T") href = `/${slug}/my-tasks`;
        if (e.key === "i" || e.key === "I") href = `/${slug}/invoices`;
        if (e.key === "u" || e.key === "U") href = `/${slug}/utilization`;
        if (e.key === "r" || e.key === "R") href = `/${slug}/reports`;
        if (href) {
          window.location.assign(href);
          setPendingG(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingG]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="border-b bg-gradient-to-br from-primary/5 to-transparent px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
              <Keyboard className="size-4" />
            </span>
            Keyboard shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.heading}>
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {g.heading}
              </h3>
              <ul className="space-y-1.5">
                {g.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-foreground/80">{item.label}</span>
                    <span className="flex shrink-0 gap-1">
                      {item.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className={cn(
                            "rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider shadow-[0_1px_0_0_hsl(var(--border))]",
                          )}
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="border-t bg-muted/30 px-6 py-3 text-[11px] text-muted-foreground">
          Press <kbd className="rounded bg-background px-1 py-0.5 font-mono">?</kbd>{" "}
          anytime to open this panel.
        </div>
      </DialogContent>
    </Dialog>
  );
}
