"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MessageSquare,
  Sparkles,
  Calendar,
  Loader2,
  Receipt,
  Download,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useStore } from "@/lib/db/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthPill } from "@/components/pills/HealthPill";
import { StatusPill } from "@/components/pills/StatusPill";
import { SignatureDialog } from "@/components/portal/SignatureDialog";
import { SupportTicketsSection } from "@/components/portal/SupportTicketsSection";
import { initials, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function ClientPortalPage() {
  const params = useParams<{ clientId: string }>();
  const allClients = useStore((s) => s.clients);
  const allProjects = useStore((s) => s.projects);
  const allTasks = useStore((s) => s.tasks);
  const allFiles = useStore((s) => s.files);
  const allComments = useStore((s) => s.comments);
  const allInvoices = useStore((s) => s.invoices);
  const users = useStore((s) => s.users);
  const updateTask = useStore((s) => s.updateTask);
  // pending is no longer used — signatures handled via pendingSig below.

  const client = allClients.find((c) => c.id === params.clientId);
  const projects = allProjects.filter((p) => p.clientId === params.clientId);

  if (!client) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm text-muted-foreground">Portal not found.</p>
      </div>
    );
  }

  const project = projects[0];
  const tasks = project
    ? allTasks.filter((t) => t.projectId === project.id && t.clientVisible)
    : [];
  const reviewTasks = tasks.filter((t) => t.status === "in_review");
  const recentFiles = project
    ? allFiles.filter((f) => f.projectId === project.id && f.clientVisible)
    : [];
  // Signatures (PRD §5.5.2): both approve and request-changes capture
  // a typed-name signature before applying the underlying status change.
  const [pendingSig, setPendingSig] = useState<{
    taskId: string;
    title: string;
    action: "approved" | "revisions_requested";
  } | null>(null);

  const handleApprove = (taskId: string, title: string) => {
    setPendingSig({ taskId, title, action: "approved" });
  };

  const handleRequestChanges = (taskId: string, title: string) => {
    setPendingSig({ taskId, title, action: "revisions_requested" });
  };

  const recentComments = project
    ? allComments
        .filter((c) =>
          allTasks.some(
            (t) => t.id === c.taskId && t.projectId === project.id,
          ),
        )
        .slice(-5)
        .reverse()
    : [];

  const accent = client.portalBranding?.accentHue ?? 220;
  const accentSecondary = (accent + 40) % 360;
  const welcomeMessage = client.portalBranding?.welcomeMessage;
  const footerText =
    client.portalBranding?.footerOverride ?? `Atelier Studio · ${client.name} portal`;

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-10 md:px-8"
      style={
        {
          "--portal-accent": `${accent} 80% 55%`,
          "--portal-accent-soft": `${accent} 80% 95%`,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {client.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={client.logoUrl}
              alt={`${client.name} logo`}
              className="size-10 rounded-lg object-cover shadow-md"
            />
          ) : (
            <div
              className="grid size-10 place-items-center rounded-lg font-semibold text-white shadow-md"
              style={{
                background: `linear-gradient(135deg, hsl(${accent}, 80%, 60%), hsl(${accentSecondary}, 70%, 50%))`,
              }}
            >
              {initials(client.name)}
            </div>
          )}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Client portal
            </p>
            <h1 className="text-lg font-semibold">{client.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Sparkles className="size-4" /> Atelier
          </Button>
        </div>
      </header>

      {welcomeMessage && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-lg border p-4 text-sm"
          style={{
            background: `hsl(${accent}, 80%, 97%)`,
            borderColor: `hsl(${accent}, 60%, 85%)`,
            color: `hsl(${accent}, 70%, 25%)`,
          }}
        >
          {welcomeMessage}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-10"
      >
        <p className="text-sm text-muted-foreground">
          {client.primaryContactName ? `Welcome, ${client.primaryContactName.split(" ")[0]}` : "Welcome"}
        </p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">
          Your projects with us
        </h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-xl">
          Review progress, approve deliverables, and download files anytime.
          Everything you need in one place.
        </p>
      </motion.div>

      {/* Project overview cards */}
      <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
        {project ? (
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {project.code}
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">
                  {project.name}
                </h3>
              </div>
              <HealthPill health={project.health} />
            </div>

            {project.description ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {project.description}
              </p>
            ) : null}

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Progress
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold">
                  {Math.round(project.progress * 100)}%
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                  />
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Tasks
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold">
                  {project.taskCounts.done}
                  <span className="text-base text-muted-foreground">
                    /{project.taskCounts.total}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  completed
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Target delivery
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {project.endDate
                    ? format(parseISO(project.endDate), "MMM d, yyyy")
                    : "—"}
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="space-y-4">
          <Card className="p-5">
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Eye className="size-3" /> Awaiting your review
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold">
              {reviewTasks.length}
            </p>
            <p className="text-[11px] text-muted-foreground">
              deliverable{reviewTasks.length !== 1 ? "s" : ""} ready
            </p>
          </Card>
          {project ? (
            <Card className="p-5">
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Calendar className="size-3" /> Investment
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold">
                {project.totalBudget
                  ? formatCurrency(project.totalBudget, client.currency)
                  : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {project.billingModel.replace("_", " ")}
              </p>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Awaiting review */}
      <AnimatePresence>
        {reviewTasks.length > 0 ? (
          <motion.section
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-10"
          >
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-status-review">
              <Eye className="size-4" /> Ready for your approval
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {reviewTasks.map((t, i) => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-base font-semibold">{t.title}</h4>
                        <StatusPill status={t.status} size="sm" />
                      </div>
                      {t.description ? (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {t.description}
                        </p>
                      ) : null}
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleApprove(t.id, t.title)}
                        >
                          <CheckCircle2 className="size-4" /> Approve & sign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleRequestChanges(t.id, t.title)}
                        >
                          Request changes
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-10"
          >
            <Card className="px-6 py-8 text-center">
              <div className="mx-auto grid size-10 place-items-center rounded-full bg-status-done/15 text-status-done">
                <CheckCircle2 className="size-5" />
              </div>
              <p className="mt-3 text-sm font-medium">All caught up</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Nothing waiting for your review right now.
              </p>
            </Card>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Activity + files */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <MessageSquare className="size-4" /> Recent updates
          </h3>
          <Card className="divide-y">
            {recentComments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No recent updates yet.
              </p>
            ) : (
              recentComments.map((c) => {
                const author = users.find((u) => u.id === c.authorId);
                return (
                  <div key={c.id} className="flex gap-3 px-5 py-4">
                    <div
                      className="grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
                      style={{
                        background:
                          "linear-gradient(135deg, hsl(220, 80%, 60%), hsl(260, 70%, 50%))",
                      }}
                    >
                      {initials(author?.fullName ?? "T")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs">
                        <span className="font-medium">
                          {author?.fullName ?? "Team"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          ·{" "}
                          {format(parseISO(c.createdAt), "MMM d, h:mm a")}
                        </span>
                      </p>
                      <p className="mt-1 text-sm">{c.body}</p>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </section>

        <section>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Receipt className="size-4" /> Invoice history
          </h3>
          <Card className="overflow-hidden">
            {(() => {
              const clientInvoices = allInvoices
                .filter((inv) => inv.clientId === client.id)
                .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
              if (clientInvoices.length === 0) {
                return (
                  <p className="px-5 py-6 text-sm text-muted-foreground">
                    No invoices issued yet.
                  </p>
                );
              }
              return (
                <ul className="divide-y">
                  {clientInvoices.map((inv) => {
                    const statusStyles = {
                      paid: "bg-status-done/15 text-status-done",
                      sent: "bg-status-progress/15 text-status-progress",
                      overdue: "bg-status-blocked/15 text-status-blocked",
                      draft: "bg-status-todo/15 text-status-todo",
                      cancelled: "bg-muted text-muted-foreground",
                    } as const;
                    const balance = inv.total - inv.amountPaid;
                    return (
                      <li
                        key={inv.id}
                        className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium font-mono">{inv.number}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(parseISO(inv.issueDate), "MMM d, yyyy")} · due{" "}
                            {format(parseISO(inv.dueDate), "MMM d")}
                          </p>
                        </div>
                        <span
                          className={`rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                            statusStyles[inv.status as keyof typeof statusStyles] ?? statusStyles.draft
                          }`}
                        >
                          {inv.status}
                        </span>
                        <div className="text-right">
                          <p className="font-mono font-semibold">
                            {formatCurrency(inv.total, inv.currency)}
                          </p>
                          {balance > 0 && inv.status !== "draft" && (
                            <p className="text-[10px] text-muted-foreground">
                              {formatCurrency(balance, inv.currency)} due
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" title="Download invoice (coming soon)">
                          <Download className="size-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </Card>
        </section>

        <section>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="size-4" /> Shared files
          </h3>
          <Card className="divide-y">
            {recentFiles.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No files shared yet.
              </p>
            ) : (
              recentFiles.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {f.fileName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        v{f.version} ·{" "}
                        {format(parseISO(f.createdAt), "MMM d")}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Download
                  </Button>
                </div>
              ))
            )}
          </Card>
        </section>

        <section>
          <SupportTicketsSection clientId={client.id} />
        </section>
      </div>

      <footer className="mt-16 flex items-center justify-between text-[11px] text-muted-foreground border-t pt-6">
        <span>{footerText}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" /> Last activity{" "}
          {format(new Date(), "MMM d, h:mm a")}
        </span>
      </footer>

      {pendingSig && (
        <SignatureDialog
          open={true}
          onOpenChange={(o) => !o && setPendingSig(null)}
          action={pendingSig.action}
          entityType="task"
          entityId={pendingSig.taskId}
          entityTitle={pendingSig.title}
          onSigned={(sig) => {
            updateTask(pendingSig.taskId, {
              status: pendingSig.action === "approved" ? "done" : "revisions",
            });
            setPendingSig(null);
            if (pendingSig.action === "approved") {
              toast.success(`${pendingSig.title} approved`, {
                description: `Signed by ${sig.signedName}.`,
              });
            } else {
              toast.message(`Changes requested on ${pendingSig.title}`, {
                description: `Signed by ${sig.signedName}.`,
              });
            }
          }}
        />
      )}
    </div>
  );
}
