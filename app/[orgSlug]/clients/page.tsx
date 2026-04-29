"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Mail, Globe, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NewClientDialog } from "@/components/dialogs/NewClientDialog";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import { initials, formatCurrency } from "@/lib/utils";
import type { ClientStatus } from "@/types/domain";

const STATUS_LABEL: Record<ClientStatus, { label: string; cls: string }> = {
  prospect: {
    label: "Prospect",
    cls: "bg-status-todo/15 text-status-todo",
  },
  active: { label: "Active", cls: "bg-status-done/15 text-status-done" },
  on_hold: {
    label: "On hold",
    cls: "bg-status-revisions/15 text-status-revisions",
  },
  churned: {
    label: "Churned",
    cls: "bg-status-blocked/15 text-status-blocked",
  },
};

export default function ClientsPage() {
  const router = useRouter();
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const orgSlug = useStore((s) => s.organization.slug);
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const filtered = clients.filter(
    (c) =>
      query === "" ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.code.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Clients
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clients.length} relationships across {projects.length} projects
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="size-4" /> New client
        </Button>
      </motion.div>

      <div className="mb-5 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((client, i) => {
          const clientProjects = projects.filter((p) => p.clientId === client.id);
          const activeProjects = clientProjects.filter((p) => p.status === "active").length;
          const totalValue = clientProjects.reduce(
            (s, p) => s + (p.totalBudget ?? 0),
            0,
          );
          const status = STATUS_LABEL[client.status];

          return (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.24 }}
            >
              <div
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/${orgSlug}/clients/${client.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/${orgSlug}/clients/${client.id}`);
                  }
                }}
                className="group flex h-full cursor-pointer flex-col rounded-lg border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="grid size-12 shrink-0 place-items-center rounded-md font-semibold text-white"
                    style={{
                      background: `linear-gradient(135deg, hsl(${(i * 60) % 360}, 70%, 55%), hsl(${(i * 60 + 40) % 360}, 70%, 45%))`,
                    }}
                  >
                    {initials(client.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {client.code}
                    </div>
                    <h3 className="mt-0.5 truncate text-base font-semibold tracking-tight group-hover:text-primary">
                      {client.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {client.industry ? <span>{client.industry}</span> : null}
                      {client.industry ? <span>·</span> : null}
                      <span
                        className={cn(
                          "rounded-pill px-1.5 py-0.5 text-[10px] font-medium",
                          status.cls,
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>

                {client.primaryContactName ? (
                  <div className="mt-4 space-y-1 text-sm">
                    <div className="text-muted-foreground">
                      {client.primaryContactName}
                    </div>
                    {client.primaryContactEmail ? (
                      <a
                        href={`mailto:${client.primaryContactEmail}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="size-3" />
                        {client.primaryContactEmail}
                      </a>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-auto pt-5">
                  <div className="grid grid-cols-3 gap-2 border-t pt-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">Projects</p>
                      <p className="mt-0.5 font-mono text-sm font-medium">
                        {clientProjects.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Active</p>
                      <p className="mt-0.5 font-mono text-sm font-medium">
                        {activeProjects}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Lifetime</p>
                      <p className="mt-0.5 font-mono text-sm font-medium">
                        {totalValue
                          ? formatCurrency(totalValue, client.currency)
                          : "—"}
                      </p>
                    </div>
                  </div>
                  {client.portalEnabled ? (
                    <div className="mt-3 inline-flex items-center gap-1 rounded-pill bg-status-progress/10 px-2 py-0.5 text-[10px] font-medium text-status-progress">
                      <Globe className="size-3" /> Portal active
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  View detail <ArrowRight className="ml-1 size-3" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <NewClientDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
