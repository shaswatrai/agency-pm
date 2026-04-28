"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore, useCurrentUser } from "@/lib/db/store";
import { initials } from "@/lib/utils";
import { toast } from "sonner";
import type { ContractType } from "@/types/domain";

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewClientDialog({
  open,
  onOpenChange,
}: NewClientDialogProps) {
  const router = useRouter();
  const orgSlug = useStore((s) => s.organization.slug);
  const addClient = useStore((s) => s.addClient);
  const currentUser = useCurrentUser();
  const users = useStore((s) => s.users);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [contractType, setContractType] =
    useState<ContractType>("project");
  const [accountManagerId, setAccountManagerId] = useState(currentUser.id);
  const [portalEnabled, setPortalEnabled] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name your client");
    const client = addClient({
      name: name.trim(),
      industry: industry.trim() || undefined,
      primaryContactName: contactName.trim() || undefined,
      primaryContactEmail: contactEmail.trim() || undefined,
      currency,
      contractType,
      status: "active",
      accountManagerId,
      tags: [],
      portalEnabled,
    });
    toast.success(`Added ${client.name}`, { description: client.code });
    onOpenChange(false);
    router.push(`/${orgSlug}/clients/${client.id}`);
    setName("");
    setIndustry("");
    setContactName("");
    setContactEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogHeader className="border-b bg-gradient-to-br from-primary/5 to-transparent px-6 py-4">
          <DialogTitle className="text-base">New client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div
              className="grid size-14 shrink-0 place-items-center rounded-lg text-base font-semibold text-white shadow-md"
              style={{
                background:
                  "linear-gradient(135deg, hsl(220, 80%, 60%), hsl(260, 70%, 50%))",
              }}
            >
              {name ? initials(name) : "?"}
            </div>
            <div className="flex-1">
              <Label htmlFor="nc-name">Client name</Label>
              <Input
                id="nc-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lumière Hotels"
                required
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nc-industry">Industry</Label>
              <Input
                id="nc-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Hospitality"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="nc-currency">Currency</Label>
              <select
                id="nc-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="AED">AED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nc-contact-name">Primary contact</Label>
              <Input
                id="nc-contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Isabelle Rousseau"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="nc-contact-email">Contact email</Label>
              <Input
                id="nc-contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@client.com"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nc-contract">Contract type</Label>
              <select
                id="nc-contract"
                value={contractType}
                onChange={(e) =>
                  setContractType(e.target.value as ContractType)
                }
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="project">Project-based</option>
                <option value="retainer">Retainer</option>
                <option value="hybrid">Hybrid</option>
                <option value="tm">Time & materials</option>
              </select>
            </div>
            <div>
              <Label htmlFor="nc-am">Account manager</Label>
              <select
                id="nc-am"
                value={accountManagerId}
                onChange={(e) => setAccountManagerId(e.target.value)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-card p-3">
            <input
              type="checkbox"
              checked={portalEnabled}
              onChange={(e) => setPortalEnabled(e.target.checked)}
              className="mt-0.5"
            />
            <div className="text-sm">
              <p className="font-medium">Enable client portal</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {name || "Your client"} can view project progress, approve
                deliverables, and access invoices.
              </p>
            </div>
          </label>

          <div className="flex justify-end gap-2 border-t pt-4 -mx-6 -mb-6 px-6 py-4 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add client</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
