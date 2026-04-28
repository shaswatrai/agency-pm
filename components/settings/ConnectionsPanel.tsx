"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useRuntimeConfig,
  testSupabaseConnection,
  testResendConnection,
} from "@/lib/config/runtime";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function StatusBadge({
  status,
  message,
}: {
  status: "untested" | "testing" | "connected" | "failed";
  message?: string;
}) {
  const map = {
    untested: { cls: "bg-muted text-muted-foreground", label: "Not tested" },
    testing: { cls: "bg-status-progress/15 text-status-progress", label: "Testing…" },
    connected: { cls: "bg-status-done/15 text-status-done", label: "Connected" },
    failed: { cls: "bg-status-blocked/15 text-status-blocked", label: "Failed" },
  } as const;
  const meta = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-[11px] font-medium",
        meta.cls,
      )}
      title={message}
    >
      {status === "testing" ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <span className="size-1.5 rounded-full bg-current" />
      )}
      {meta.label}
    </span>
  );
}

function SecretField({
  id,
  label,
  value,
  onChange,
  placeholder,
  helper,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  helper?: string;
}) {
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <Label htmlFor={id} className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1.5 flex items-center gap-1.5">
        <div className="relative flex-1">
          <Input
            id={id}
            type={reveal ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
            className="pr-10 font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={reveal ? "Hide" : "Show"}
          >
            {reveal ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={copy}
          disabled={!value}
          aria-label="Copy"
        >
          {copied ? (
            <Check className="size-3.5 text-status-done" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>
      {helper ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

export function ConnectionsPanel() {
  const config = useRuntimeConfig();

  const [testingSupabase, setTestingSupabase] = useState(false);
  const [testingResend, setTestingResend] = useState(false);

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    config.setField("supabaseStatus", { status: "testing" });
    const result = await testSupabaseConnection(
      config.supabaseUrl,
      config.supabaseAnonKey,
    );
    config.setField("supabaseStatus", {
      status: result.ok ? "connected" : "failed",
      message: result.message,
      lastCheckedAt: Date.now(),
    });
    if (result.ok) toast.success(`Supabase: ${result.message}`);
    else toast.error(`Supabase: ${result.message}`);
    setTestingSupabase(false);
  };

  const handleTestResend = async () => {
    setTestingResend(true);
    config.setField("resendStatus", { status: "testing" });
    const result = await testResendConnection(
      config.resendApiKey,
      config.resendFrom,
    );
    config.setField("resendStatus", {
      status: result.ok ? "connected" : "failed",
      message: result.message,
      lastCheckedAt: Date.now(),
    });
    if (result.ok) toast.success(`Resend: ${result.message}`);
    else toast.error(`Resend: ${result.message}`);
    setTestingResend(false);
  };

  const supabaseConfigured = config.isSupabaseConfigured();
  const supabaseConnected = config.supabaseStatus.status === "connected";

  return (
    <div className="space-y-6">
      {/* Mode banner */}
      <div
        className={cn(
          "rounded-md border p-4",
          config.useSupabase && supabaseConnected
            ? "border-status-done/30 bg-status-done/5"
            : "border-status-revisions/30 bg-status-revisions/5",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-md",
              config.useSupabase && supabaseConnected
                ? "bg-status-done/15 text-status-done"
                : "bg-status-revisions/15 text-status-revisions",
            )}
          >
            {config.useSupabase && supabaseConnected ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {config.useSupabase && supabaseConnected
                ? "Connected mode"
                : "Demo mode"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {config.useSupabase && supabaseConnected
                ? "Your data is being read from and written to Supabase."
                : "All data is in-memory and resets on reload. Configure Supabase below to persist across sessions and collaborate with real users."}
            </p>
          </div>
          <div className="shrink-0">
            <Switch
              checked={config.useSupabase}
              disabled={!supabaseConnected}
              onCheckedChange={(checked) => {
                config.setField("useSupabase", checked);
                toast.success(
                  checked ? "Switched to Connected mode" : "Switched to Demo mode",
                );
              }}
            />
          </div>
        </div>
        {config.useSupabase && !supabaseConnected ? (
          <p className="mt-3 ml-11 text-[11px] text-status-blocked">
            Supabase isn't connected. Test the connection below before enabling.
          </p>
        ) : null}
      </div>

      {/* Supabase */}
      <section className="rounded-lg border bg-card">
        <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
              <Database className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Supabase</h3>
              <p className="text-xs text-muted-foreground">
                Postgres database, auth, storage, and realtime
              </p>
            </div>
          </div>
          <StatusBadge
            status={config.supabaseStatus.status}
            message={config.supabaseStatus.message}
          />
        </header>

        <div className="space-y-4 px-5 py-5">
          <div>
            <Label
              htmlFor="sb-url"
              className="text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              Project URL
            </Label>
            <Input
              id="sb-url"
              value={config.supabaseUrl}
              onChange={(e) =>
                config.setField("supabaseUrl", e.target.value.trim())
              }
              placeholder="https://your-project.supabase.co"
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 font-mono text-xs"
            />
          </div>

          <SecretField
            id="sb-anon"
            label="Anon (public) key"
            value={config.supabaseAnonKey}
            onChange={(v) => config.setField("supabaseAnonKey", v.trim())}
            placeholder="eyJhbGciOiJIUzI1NiIs..."
            helper="Safe to store client-side. Row-level security gates everything."
          />

          <SecretField
            id="sb-service"
            label="Service role key (optional)"
            value={config.supabaseServiceRoleKey}
            onChange={(v) =>
              config.setField("supabaseServiceRoleKey", v.trim())
            }
            placeholder="eyJhbGciOiJIUzI1NiIs..."
            helper="Required only to apply the schema migration. Clear it once that's done."
          />

          {config.supabaseServiceRoleKey ? (
            <div className="flex items-start gap-2 rounded-md border border-status-revisions/30 bg-status-revisions/5 p-3 text-xs">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-status-revisions" />
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  Service role key is currently stored.
                </span>{" "}
                This key bypasses RLS — anyone who can read your browser's
                localStorage can read your entire database. Clear it after
                running the migration.
              </p>
            </div>
          ) : null}

          <AnimatePresence>
            {config.supabaseStatus.message ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "rounded-md border p-3 text-xs",
                  config.supabaseStatus.status === "connected"
                    ? "border-status-done/30 bg-status-done/5 text-status-done"
                    : config.supabaseStatus.status === "failed"
                      ? "border-status-blocked/30 bg-status-blocked/5 text-status-blocked"
                      : "border-border bg-muted/30 text-muted-foreground",
                )}
              >
                {config.supabaseStatus.message}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleTestSupabase}
              disabled={!supabaseConfigured || testingSupabase}
            >
              {testingSupabase ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Test connection
            </Button>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-pill border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent"
            >
              Supabase dashboard <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </section>

      {/* Resend */}
      <section className="rounded-lg border bg-card">
        <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
              <Mail className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Resend</h3>
              <p className="text-xs text-muted-foreground">
                Email notifications, invites, invoice deliveries
              </p>
            </div>
          </div>
          <StatusBadge
            status={config.resendStatus.status}
            message={config.resendStatus.message}
          />
        </header>

        <div className="space-y-4 px-5 py-5">
          <SecretField
            id="rs-key"
            label="API key"
            value={config.resendApiKey}
            onChange={(v) => config.setField("resendApiKey", v.trim())}
            placeholder="re_..."
            helper="The key is sent to our /api/resend/* routes per request, never stored server-side."
          />

          <div>
            <Label
              htmlFor="rs-from"
              className="text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              From address
            </Label>
            <Input
              id="rs-from"
              value={config.resendFrom}
              onChange={(e) => config.setField("resendFrom", e.target.value)}
              placeholder='Atelier <noreply@yourdomain.com>'
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 text-xs"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Domain must be verified in your Resend account.
            </p>
          </div>

          <AnimatePresence>
            {config.resendStatus.message ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "rounded-md border p-3 text-xs",
                  config.resendStatus.status === "connected"
                    ? "border-status-done/30 bg-status-done/5 text-status-done"
                    : config.resendStatus.status === "failed"
                      ? "border-status-blocked/30 bg-status-blocked/5 text-status-blocked"
                      : "border-border bg-muted/30 text-muted-foreground",
                )}
              >
                {config.resendStatus.message}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleTestResend}
              disabled={!config.isResendConfigured() || testingResend}
            >
              {testingResend ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Test connection
            </Button>
            <a
              href="https://resend.com/domains"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-pill border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent"
            >
              Resend domains <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </section>

      {/* Realtime */}
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Cross-tab realtime</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Demo mode broadcasts state changes between tabs of the same
              browser via <code className="font-mono">BroadcastChannel</code>.
              When connected to Supabase, this swaps to{" "}
              <code className="font-mono">supabase.channel()</code>.
            </p>
          </div>
          <Switch
            checked={config.useRealtime}
            onCheckedChange={(checked) =>
              config.setField("useRealtime", checked)
            }
          />
        </div>
      </section>

      {/* Reset */}
      <section className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-4">
        <div>
          <p className="text-sm font-medium">Reset to demo mode</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Clears all stored credentials and disables Connected mode.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm("Clear all stored credentials? This can't be undone.")) {
              useRuntimeConfig.getState().reset();
              toast.success("Reset to demo mode");
            }
          }}
        >
          <RotateCcw className="size-4" /> Reset
        </Button>
      </section>
    </div>
  );
}
