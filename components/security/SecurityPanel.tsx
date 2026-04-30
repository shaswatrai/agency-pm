"use client";

import { useMemo, useState } from "react";
import {
  Shield,
  KeyRound,
  Globe,
  Plus,
  Trash2,
  Download,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/db/store";
import {
  downloadUserDataExport,
  anonymizeUser,
} from "@/lib/security/gdpr";
import { toast } from "sonner";
import type { OrgRole } from "@/types/domain";

const ROLE_LABELS: Record<OrgRole, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  pm: "Project manager",
  member: "Team member",
  finance: "Finance",
  qa: "QA",
  client: "Client",
};

/**
 * Security settings panel (PRD §7). Three sections:
 *   1. IP allowlist — admin restricts login to listed CIDRs
 *   2. MFA — toggle role-required, list enrolled users, enroll yourself
 *   3. GDPR data export + anonymize — per-member self-service
 */
export function SecurityPanel() {
  const settings = useStore((s) => s.securitySettings);
  const updateSettings = useStore((s) => s.updateSecuritySettings);
  const addEntry = useStore((s) => s.addIpAllowlistEntry);
  const removeEntry = useStore((s) => s.removeIpAllowlistEntry);
  const toggleMfaRole = useStore((s) => s.toggleMfaRequiredForRole);
  const enrollMfa = useStore((s) => s.enrollMfa);
  const removeMfa = useStore((s) => s.removeMfaEnrollment);
  const enrollments = useStore((s) => s.mfaEnrollments);
  const users = useStore((s) => s.users);
  const meId = useStore((s) => s.currentUserId);

  const [newCidr, setNewCidr] = useState("");
  const [newCidrLabel, setNewCidrLabel] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [sessionInput, setSessionInput] = useState(
    settings.sessionTimeoutMinutes?.toString() ?? "",
  );
  const [retentionInput, setRetentionInput] = useState(
    settings.churnDataRetentionDays.toString(),
  );

  const myEnrollment = useMemo(
    () => enrollments.find((e) => e.userId === meId),
    [enrollments, meId],
  );

  function addCidr() {
    const cidr = newCidr.trim();
    if (!cidr) return;
    if (!/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(cidr)) {
      toast.error("Use a single IP (1.2.3.4) or a CIDR (1.2.3.0/24)");
      return;
    }
    addEntry({ cidr, label: newCidrLabel.trim() || undefined });
    setNewCidr("");
    setNewCidrLabel("");
    toast.success("Allowlist entry added");
  }

  return (
    <div className="space-y-5">
      {/* IP allowlist */}
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">IP allowlist</h3>
          <p className="ml-auto text-[11px] text-muted-foreground">
            {settings.ipAllowlist.length === 0
              ? "Open · no restriction"
              : `${settings.ipAllowlist.length} entr${settings.ipAllowlist.length === 1 ? "y" : "ies"}`}
          </p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          When non-empty, login is blocked from outside the listed CIDRs.
        </p>

        {settings.ipAllowlist.length > 0 && (
          <ul className="mt-3 space-y-1">
            {settings.ipAllowlist.map((e) => (
              <li
                key={e.cidr}
                className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs"
              >
                <span className="font-mono">{e.cidr}</span>
                {e.label && (
                  <span className="text-muted-foreground">· {e.label}</span>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  added {e.addedAt.slice(0, 10)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeEntry(e.cidr)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 grid grid-cols-[1fr_180px_auto] gap-2">
          <Input
            value={newCidr}
            onChange={(e) => setNewCidr(e.target.value)}
            placeholder="1.2.3.0/24"
            className="font-mono text-xs"
          />
          <Input
            value={newCidrLabel}
            onChange={(e) => setNewCidrLabel(e.target.value)}
            placeholder="Office VPN"
            className="text-xs"
          />
          <Button size="sm" onClick={addCidr} disabled={!newCidr.trim()}>
            <Plus className="size-3.5" /> Add
          </Button>
        </div>
      </section>

      {/* MFA */}
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Two-factor authentication</h3>
        </div>

        <div className="mt-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Require MFA for these roles
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              ["super_admin", "admin", "finance", "pm", "member", "qa"] as OrgRole[]
            ).map((r) => {
              const required = settings.mfaRequiredForRoles.includes(r);
              return (
                <button
                  key={r}
                  onClick={() => toggleMfaRole(r)}
                  className={`rounded-pill border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    required
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {required ? "✓ " : ""}
                  {ROLE_LABELS[r]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 size-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Your authenticator</p>
              {myEnrollment ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Enrolled {myEnrollment.enrolledAt.slice(0, 10)} ·{" "}
                  {myEnrollment.recoveryCodeHashes.length} recovery codes saved
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Not enrolled — add a TOTP authenticator to harden your account
                </p>
              )}
            </div>
            {myEnrollment ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  removeMfa(meId);
                  toast.success("MFA removed");
                }}
              >
                Remove
              </Button>
            ) : (
              <Button size="sm" onClick={() => setEnrolling(true)}>
                <KeyRound className="mr-1 size-3.5" /> Enroll
              </Button>
            )}
          </div>
        </div>

        {enrollments.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Enrolled members
            </p>
            <ul className="mt-1 space-y-1">
              {enrollments.map((e) => {
                const u = users.find((x) => x.id === e.userId);
                return (
                  <li
                    key={e.userId}
                    className="flex items-center gap-2 text-[11px]"
                  >
                    <CheckCircle2 className="size-3 text-status-done" />
                    <span>{u?.fullName ?? e.userId}</span>
                    <span className="text-muted-foreground">
                      · {e.method.toUpperCase()} · enrolled{" "}
                      {e.enrolledAt.slice(0, 10)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Session + retention */}
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Session &amp; retention</h3>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Session timeout (minutes)</Label>
            <Input
              type="number"
              min={0}
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              placeholder="0 = no auto-logout"
            />
          </div>
          <div>
            <Label className="text-xs">Churn data retention (days)</Label>
            <Input
              type="number"
              min={0}
              value={retentionInput}
              onChange={(e) => setRetentionInput(e.target.value)}
              placeholder="0 = forever"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              const session = sessionInput.trim()
                ? Number(sessionInput)
                : null;
              const retention = retentionInput.trim()
                ? Number(retentionInput)
                : 0;
              updateSettings({
                sessionTimeoutMinutes: Number.isFinite(session) && session !== null && session > 0 ? session : null,
                churnDataRetentionDays: Number.isFinite(retention) ? retention : 0,
              });
              toast.success("Saved");
            }}
          >
            <Save className="mr-1 size-3.5" /> Save
          </Button>
        </div>
      </section>

      {/* GDPR */}
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Data privacy (GDPR)</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Self-service data export and the right to deletion. Available to
          every team member for their own record.
        </p>

        <ul className="mt-3 divide-y rounded-md border">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <span className="flex-1 truncate font-medium">{u.fullName}</span>
              <span className="text-[11px] text-muted-foreground">{u.email}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  downloadUserDataExport(u.id);
                  toast.success(`Exported ${u.fullName}'s data`);
                }}
                title="Download all records as JSON"
              >
                <Download className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setConfirmingDelete(u.id);
                  setConfirmName("");
                }}
                title="Anonymize (right to deletion)"
              >
                <UserX className="size-3.5 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {/* MFA enrollment dialog */}
      <Dialog open={enrolling} onOpenChange={setEnrolling}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll authenticator</DialogTitle>
            <DialogDescription>
              Scan the otpauth URI in any TOTP app (1Password, Authy, Google
              Authenticator). Save the recovery codes — you'll need them if
              you lose the device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-md border bg-muted/30 p-3 font-mono text-[11px] break-all">
              otpauth://totp/Atelier:{users.find((u) => u.id === meId)?.email}
              ?secret=DEMO-SECRET-{meId.slice(0, 8).toUpperCase()}
              &issuer=Atelier
            </div>
            <p className="text-[11px] text-muted-foreground">
              Demo mode shows a static URI. Real mode generates a unique
              shared secret server-side and never sends it to the browser
              after enrollment completes.
            </p>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Recovery codes
              </p>
              <pre className="mt-1 rounded-md border bg-muted/30 p-3 font-mono text-[10px]">
                {Array.from({ length: 6 })
                  .map((_, i) =>
                    `xxxx-${Math.random().toString(36).slice(2, 6)}-${(i + 1).toString().padStart(2, "0")}`,
                  )
                  .join("\n")}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrolling(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                // SHA-256 stub of the demo secret
                const secret = `DEMO-SECRET-${meId}`;
                const enc = new TextEncoder().encode(secret);
                const digest = await crypto.subtle.digest("SHA-256", enc);
                const arr = new Uint8Array(digest);
                let hex = "";
                for (let i = 0; i < arr.length; i++) {
                  hex += arr[i].toString(16).padStart(2, "0");
                }
                enrollMfa({
                  userId: meId,
                  method: "totp",
                  secretHash: hex,
                  recoveryCodeHashes: Array.from({ length: 6 }, (_, i) =>
                    `demo-recovery-${meId}-${i}`,
                  ),
                });
                toast.success("Authenticator enrolled");
                setEnrolling(false);
              }}
            >
              I've saved the codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anonymize confirm dialog */}
      <Dialog
        open={confirmingDelete !== null}
        onOpenChange={(o) => !o && setConfirmingDelete(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Anonymize user
            </DialogTitle>
            <DialogDescription>
              This replaces the user's name + email + avatar with deletion
              markers. Tasks, comments, and time entries are kept intact for
              accounting + audit purposes but reference the anonymized
              record. This is irreversible.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs">
              Type{" "}
              <span className="font-mono">
                {confirmingDelete
                  ? users.find((u) => u.id === confirmingDelete)?.fullName
                  : ""}
              </span>{" "}
              to confirm
            </Label>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Type the user's full name"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                !confirmingDelete ||
                confirmName !==
                  users.find((u) => u.id === confirmingDelete)?.fullName
              }
              onClick={() => {
                if (!confirmingDelete) return;
                if (anonymizeUser(confirmingDelete)) {
                  toast.success("User anonymized");
                }
                setConfirmingDelete(null);
                setConfirmName("");
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <UserX className="mr-1 size-3.5" /> Anonymize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
