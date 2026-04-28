"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Synthetic invite payload — in real impl, looked up server-side from the token
  const invite = {
    workspaceName: "Atelier Studio",
    inviterName: "Avery Chen",
    inviteeEmail: "newteammate@studio.com",
    role: "Project manager",
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || password.length < 8) {
      toast.error("Add your name and a password (8+ characters)");
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    toast.success(`Welcome to ${invite.workspaceName}`);
    router.push("/atelier/dashboard");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6 rounded-lg border bg-gradient-to-br from-primary/10 to-transparent p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              You've been invited to
            </p>
            <p className="truncate text-base font-semibold">
              {invite.workspaceName}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">From</span>
            <span className="font-medium">{invite.inviterName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Your role</span>
            <span className="font-medium">{invite.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="inline-flex items-center gap-1 font-mono">
              <Mail className="size-3" /> {invite.inviteeEmail}
            </span>
          </div>
        </div>
      </div>

      <h1 className="text-xl font-semibold tracking-tight">
        Set up your account
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Just a couple details to get you in.
      </p>

      <form onSubmit={handleAccept} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How should the team call you?"
            required
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="password">Create a password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            className="mt-1.5"
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            `Join ${invite.workspaceName}`
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        Wrong account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in instead
        </Link>{" "}
        · Token: <span className="font-mono">{params.token}</span>
      </p>
    </motion.div>
  );
}
