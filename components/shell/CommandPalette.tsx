"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  FolderKanban,
  Users,
  CheckSquare,
  Plus,
  LayoutDashboard,
  Clock,
  FileBox,
} from "lucide-react";
import { useStore } from "@/lib/db/store";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const orgSlug = useStore((s) => s.organization.slug);
  const projects = useStore((s) => s.projects);
  const clients = useStore((s) => s.clients);
  const tasks = useStore((s) => s.tasks);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, clients, tasks, or jump to…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick navigation">
          <CommandItem onSelect={() => go(`/${orgSlug}/dashboard`)}>
            <LayoutDashboard /> Dashboard
            <CommandShortcut>⌘1</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go(`/${orgSlug}/projects`)}>
            <FolderKanban /> All projects
            <CommandShortcut>⌘2</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go(`/${orgSlug}/clients`)}>
            <Users /> Clients
          </CommandItem>
          <CommandItem onSelect={() => go(`/${orgSlug}/my-tasks`)}>
            <CheckSquare /> My tasks
          </CommandItem>
          <CommandItem onSelect={() => go(`/${orgSlug}/timesheet`)}>
            <Clock /> Timesheet
          </CommandItem>
          <CommandItem onSelect={() => go(`/${orgSlug}/files`)}>
            <FileBox /> Files
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go(`/${orgSlug}/projects?new=1`)}>
            <Plus /> New project
          </CommandItem>
          <CommandItem onSelect={() => go(`/${orgSlug}/clients?new=1`)}>
            <Plus /> New client
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Projects">
          {projects.slice(0, 6).map((p) => (
            <CommandItem
              key={p.id}
              onSelect={() => go(`/${orgSlug}/projects/${p.id}/overview`)}
            >
              <FolderKanban />
              <span className="flex-1">{p.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {p.code}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Clients">
          {clients.slice(0, 5).map((c) => (
            <CommandItem
              key={c.id}
              onSelect={() => go(`/${orgSlug}/clients/${c.id}`)}
            >
              <Users />
              <span className="flex-1">{c.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {c.code}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Tasks">
          {tasks.slice(0, 5).map((t) => (
            <CommandItem
              key={t.id}
              onSelect={() =>
                go(`/${orgSlug}/projects/${t.projectId}/kanban?task=${t.id}`)
              }
            >
              <CheckSquare />
              <span className="flex-1 truncate">{t.title}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {t.code}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
