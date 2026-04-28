"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, Globe, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/db/store";
import { ProjectHealthCard } from "@/components/dashboard/ProjectHealthCard";
import { Button } from "@/components/ui/button";
import { initials, formatCurrency } from "@/lib/utils";

export default function ClientDetailPage() {
  const params = useParams<{ clientId: string; orgSlug: string }>();
  const allClients = useStore((s) => s.clients);
  const allProjects = useStore((s) => s.projects);
  const client = allClients.find((c) => c.id === params.clientId);
  const projects = allProjects.filter(
    (p) => p.clientId === params.clientId,
  );

  if (!client) {
    return (
      <div className="px-4 py-12 md:px-8 text-center">
        <p className="text-sm text-muted-foreground">Client not found.</p>
        <Link
          href={`/${params.orgSlug}/clients`}
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Back to clients
        </Link>
      </div>
    );
  }

  const totalValue = projects.reduce((s, p) => s + (p.totalBudget ?? 0), 0);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1600px] mx-auto">
      <Link
        href={`/${params.orgSlug}/clients`}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> All clients
      </Link>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="grid size-16 shrink-0 place-items-center rounded-lg text-lg font-semibold text-white shadow-md"
            style={{
              background:
                "linear-gradient(135deg, hsl(220, 80%, 60%), hsl(260, 70%, 50%))",
            }}
          >
            {initials(client.name)}
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {client.code}
            </p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">
              {client.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {client.industry ? <span>{client.industry}</span> : null}
              <span>·</span>
              <span>{client.contractType.toUpperCase()}</span>
              <span>·</span>
              <span>{client.currency}</span>
              {client.portalEnabled ? (
                <span className="inline-flex items-center gap-1 rounded-pill bg-status-progress/10 px-2 py-0.5 text-[10px] font-medium text-status-progress">
                  <Globe className="size-3" /> Portal
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Mail className="size-4" /> Send portal invite
          </Button>
          <Button size="sm">Edit client</Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Projects
          </p>
          <p className="mt-2 text-2xl font-semibold">{projects.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Lifetime value
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(totalValue, client.currency)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Primary contact
          </p>
          <p className="mt-2 text-base font-medium">
            {client.primaryContactName ?? "—"}
          </p>
          {client.primaryContactEmail ? (
            <a
              href={`mailto:${client.primaryContactEmail}`}
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Mail className="size-3" /> {client.primaryContactEmail}
            </a>
          ) : null}
        </div>
      </div>

      <h2 className="mt-10 mb-4 text-lg font-semibold tracking-tight">
        Active projects
      </h2>
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No projects yet for this client.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p, i) => (
            <ProjectHealthCard key={p.id} project={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
