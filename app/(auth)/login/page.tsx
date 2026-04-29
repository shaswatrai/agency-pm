"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Mail, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRuntimeConfig } from "@/lib/config/runtime";
import { signIn, getPrimaryOrg } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cfg = useRuntimeConfig();
  const connected = cfg.useSupabase && cfg.supabaseUrl && cfg.supabaseAnonKey;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (connected) {
      const result = await signIn(email, password);
      if (!result.ok || !result.user) {
        setSubmitting(false);
        toast.error(result.message);
        return;
      }
      const org = await getPrimaryOrg(result.user.id);
      setSubmitting(false);
      toast.success(`Welcome back${org ? ` to ${org.name}` : ""}`);
      router.push(org ? `/${org.slug}/dashboard` : "/atelier/dashboard");
      return;
    }

    // Demo mode
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    toast.success("Signed in (demo mode)");
    router.push("/atelier/dashboard");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={
          "mb-3 inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[10px] font-medium " +
          (connected
            ? "border-status-done/30 bg-status-done/5 text-status-done"
            : "border-status-revisions/30 bg-status-revisions/5 text-status-revisions")
        }
      >
        <Database className="size-3" />
        {connected
          ? "Auth via your Supabase project"
          : "Demo mode — Settings → Connections to wire Supabase"}
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sign in to continue to your workspace.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1.5"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="#"
              className="text-xs text-primary hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1.5"
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="mt-6 w-full"
        onClick={() => toast.info("Magic-link sign-in (Phase 1+ Supabase)")}
      >
        <Mail className="size-4" /> Email me a magic link
      </Button>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        New to Atelier?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary hover:underline"
        >
          Create a workspace
        </Link>
      </p>
    </motion.div>
  );
}
