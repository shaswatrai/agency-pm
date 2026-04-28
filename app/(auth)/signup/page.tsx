"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 8) {
      toast.error("Fill in all fields, and use 8+ characters for the password");
      return;
    }
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !orgSlug.trim()) {
      toast.error("Pick a workspace name and slug");
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    toast.success(`Workspace created: ${orgName}`);
    router.push("/atelier/dashboard");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6 flex items-center gap-1.5">
        {[1, 2].map((s) => (
          <span
            key={s}
            className={
              "h-1 flex-1 rounded-full " +
              (s <= step ? "bg-primary" : "bg-muted")
            }
          />
        ))}
      </div>

      {step === 1 ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One sign-in works across all your workspaces.
          </p>

          <form onSubmit={handleStep1} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Avery Chen"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="avery@studio.com"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="mt-1.5"
              />
            </div>

            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Building2 className="size-5 text-primary" />
            Name your workspace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your team's home for projects, clients, and finance.
          </p>

          <form onSubmit={handleStep2} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="org">Workspace name</Label>
              <Input
                id="org"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  if (!orgSlug || orgSlug === slugify(orgName))
                    setOrgSlug(slugify(e.target.value));
                }}
                placeholder="Atelier Studio"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="slug">URL slug</Label>
              <div className="mt-1.5 flex items-center gap-1 rounded-md border border-input bg-muted/40 px-3 focus-within:ring-2 focus-within:ring-ring">
                <span className="text-sm text-muted-foreground">
                  atelier.app/
                </span>
                <input
                  id="slug"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(slugify(e.target.value))}
                  placeholder="atelier"
                  required
                  className="h-9 flex-1 bg-transparent font-mono text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Create workspace"
                )}
              </Button>
            </div>
          </form>
        </>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
