"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Users,
  Palette,
  Plug,
  Shield,
  ChevronDown,
  Check,
  Mail,
  KeyRound,
  Lock,
  Globe,
  GitBranch,
  Slack,
  Sparkles,
  Plug2,
  Repeat,
  Timer,
} from "lucide-react";
import { ConnectionsPanel } from "@/components/settings/ConnectionsPanel";
import { WorkspacePanel } from "@/components/settings/WorkspacePanel";
import { TimeTrackingPanel } from "@/components/settings/TimeTrackingPanel";
import { RecurringRulesPanel } from "@/components/settings/RecurringRulesPanel";
import { SlaPoliciesPanel } from "@/components/settings/SlaPoliciesPanel";
import { IntegrationsPanel } from "@/components/integrations/IntegrationsPanel";
import { SecurityPanel } from "@/components/security/SecurityPanel";
import { useStore } from "@/lib/db/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { OrgRole } from "@/types/domain";

interface Section {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const SECTIONS: Section[] = [
  {
    key: "connections",
    icon: Plug2,
    title: "Connections",
    description:
      "Configure Supabase + Resend backend without env vars · enables Connected mode",
  },
  {
    key: "workspace",
    icon: Building2,
    title: "Workspace",
    description:
      "Organization name, base currency, FX rate table for multi-currency reports",
  },
  {
    key: "time",
    icon: Sparkles,
    title: "Time tracking",
    description:
      "Rounding rules, idle threshold, locked weeks for billed periods",
  },
  {
    key: "recurring",
    icon: Repeat,
    title: "Recurring tasks",
    description:
      "Auto-generate tasks on a daily / weekly / monthly schedule (retainers, QA passes)",
  },
  {
    key: "sla",
    icon: Timer,
    title: "SLA policies",
    description:
      "First-response and resolution targets per priority — org-wide default + per-client overrides",
  },
  {
    key: "members",
    icon: Users,
    title: "Members & roles",
    description: "Invite team members, set roles, manage rates",
  },
  {
    key: "branding",
    icon: Palette,
    title: "Branding",
    description: "Theme accent and client portal branding",
  },
  {
    key: "integrations",
    icon: Plug,
    title: "Integrations & webhooks",
    description:
      "Connect Figma, GitHub, Slack, Drive, accounting, marketing & CRM tools · outbound webhooks for any custom endpoint",
  },
  {
    key: "security",
    icon: Shield,
    title: "Security",
    description: "SSO, MFA, IP restrictions, audit log",
  },
];

const ROLE_LABELS: Record<OrgRole, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  pm: "Project manager",
  member: "Team member",
  finance: "Finance",
  qa: "QA",
  client: "Client",
};

const ACCENTS = [
  { name: "Indigo", h: 221 },
  { name: "Sky", h: 199 },
  { name: "Teal", h: 175 },
  { name: "Emerald", h: 142 },
  { name: "Amber", h: 38 },
  { name: "Rose", h: 350 },
  { name: "Violet", h: 262 },
];

export default function SettingsPage() {
  const orgName = useStore((s) => s.organization.name);
  const orgSlug = useStore((s) => s.organization.slug);
  const users = useStore((s) => s.users);

  const [openKey, setOpenKey] = useState<string | null>("connections");
  const [accent, setAccent] = useState(221);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [inviting, setInviting] = useState(false);

  const setAccentColor = (h: number) => {
    setAccent(h);
    if (typeof window !== "undefined") {
      document.documentElement.style.setProperty(
        "--primary",
        `${h} 83% 53%`,
      );
      document.documentElement.style.setProperty(
        "--ring",
        `${h} 83% 53%`,
      );
    }
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure {orgName} · {users.length} members
        </p>
      </motion.div>

      <div className="space-y-2">
        {SECTIONS.map((s, i) => {
          const isOpen = openKey === s.key;
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="overflow-hidden rounded-lg border bg-card"
            >
              <button
                onClick={() => setOpenKey(isOpen ? null : s.key)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-accent"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <s.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{s.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.description}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="border-t px-5 py-5">
                      {s.key === "connections" && <ConnectionsPanel />}

                      {s.key === "workspace" && <WorkspacePanel />}

                      {s.key === "time" && <TimeTrackingPanel />}

                      {s.key === "recurring" && <RecurringRulesPanel />}

                      {s.key === "sla" && <SlaPoliciesPanel />}

                      {s.key === "members" && (
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Mail className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="teammate@example.com"
                                className="pl-9"
                              />
                            </div>
                            <select
                              value={inviteRole}
                              onChange={(e) =>
                                setInviteRole(e.target.value as OrgRole)
                              }
                              className="rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="member">Team member</option>
                              <option value="pm">Project manager</option>
                              <option value="admin">Admin</option>
                              <option value="finance">Finance</option>
                              <option value="qa">QA</option>
                            </select>
                            <Button
                              size="sm"
                              disabled={inviting || !inviteEmail.trim()}
                              onClick={async () => {
                                if (!inviteEmail.trim())
                                  return toast.error("Add an email first");
                                setInviting(true);
                                const { inviteTeammate } = await import(
                                  "@/lib/auth/invite"
                                );
                                const result = await inviteTeammate({
                                  email: inviteEmail.trim(),
                                  role: inviteRole,
                                });
                                setInviting(false);
                                if (result.ok) {
                                  toast.success(result.message);
                                  setInviteEmail("");
                                } else {
                                  toast.error(result.message);
                                }
                              }}
                            >
                              {inviting ? "Sending…" : "Invite"}
                            </Button>
                          </div>
                          <div className="overflow-hidden rounded-md border">
                            <table className="min-w-full divide-y">
                              <thead className="bg-muted/40">
                                <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                  <th className="px-4 py-2">Member</th>
                                  <th className="px-4 py-2">Role</th>
                                  <th className="px-4 py-2 text-right">
                                    Bill rate
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {users.map((u) => (
                                  <tr key={u.id}>
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-2">
                                        <UserAvatar
                                          user={{
                                            name: u.fullName,
                                            avatarUrl: u.avatarUrl,
                                          }}
                                          size="xs"
                                        />
                                        <div>
                                          <p className="text-sm font-medium">
                                            {u.fullName}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground">
                                            {u.email}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-xs text-muted-foreground">
                                      {ROLE_LABELS[u.role]}
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono text-xs">
                                      $165/h
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {s.key === "branding" && (
                        <div className="space-y-4">
                          <div>
                            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              Accent color
                            </Label>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {ACCENTS.map((a) => (
                                <button
                                  key={a.name}
                                  onClick={() => {
                                    setAccentColor(a.h);
                                    toast.success(`Accent set to ${a.name}`);
                                  }}
                                  className={cn(
                                    "group flex flex-col items-center gap-1.5",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "grid size-10 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                                      accent === a.h
                                        ? "ring-foreground"
                                        : "ring-transparent group-hover:ring-border",
                                    )}
                                    style={{
                                      backgroundColor: `hsl(${a.h} 83% 53%)`,
                                    }}
                                  >
                                    {accent === a.h ? (
                                      <Check className="size-4 text-white" />
                                    ) : null}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {a.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-md border bg-card px-4 py-3">
                            <div>
                              <p className="text-sm font-medium">
                                Client portal branding
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Show your accent color on{" "}
                                <code className="font-mono">/portal/*</code>
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      )}

                      {s.key === "integrations" && <IntegrationsPanel />}

                      {s.key === "security" && <SecurityPanel />}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
