"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore, useCurrentUser } from "@/lib/db/store";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface RequestBudgetChangeDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestBudgetChangeDialog({
  projectId,
  open,
  onOpenChange,
}: RequestBudgetChangeDialogProps) {
  const project = useStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );
  const client = useStore((s) =>
    project ? s.clients.find((c) => c.id === project.clientId) : undefined,
  );
  const addBudgetChange = useStore((s) => s.addBudgetChange);
  const currentUser = useCurrentUser();

  const [direction, setDirection] = useState<"increase" | "decrease">(
    "increase",
  );
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!project) return null;
  const currency = client?.currency ?? "USD";
  const currentBudget = project.totalBudget ?? 0;
  const numAmount = Number(amount) || 0;
  const delta = direction === "increase" ? numAmount : -numAmount;
  const newBudget = currentBudget + delta;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) return toast.error("Enter a positive amount");
    if (!reason.trim()) return toast.error("Add a reason for the change");
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    addBudgetChange({
      projectId,
      requestedBy: currentUser.id,
      delta,
      reason: reason.trim(),
    });
    toast.success(
      `Budget change request submitted to admin & client for review`,
      { description: `${direction === "increase" ? "+" : "−"}${formatCurrency(numAmount, currency)}` },
    );
    setSubmitting(false);
    setAmount("");
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="border-b bg-gradient-to-br from-primary/5 to-transparent px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
              <Wallet className="size-4" />
            </span>
            Request budget change
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Sent to internal admin + client for approval. The project budget
            updates automatically once approved.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection("increase")}
              className={cn(
                "flex items-center gap-2 rounded-md border p-3 text-left transition-all",
                direction === "increase"
                  ? "border-status-done/40 bg-status-done/5 ring-1 ring-status-done/30"
                  : "hover:bg-accent",
              )}
            >
              <TrendingUp className="size-4 text-status-done" />
              <div>
                <p className="text-sm font-medium">Increase</p>
                <p className="text-[11px] text-muted-foreground">
                  Scope expansion
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDirection("decrease")}
              className={cn(
                "flex items-center gap-2 rounded-md border p-3 text-left transition-all",
                direction === "decrease"
                  ? "border-status-blocked/40 bg-status-blocked/5 ring-1 ring-status-blocked/30"
                  : "hover:bg-accent",
              )}
            >
              <TrendingDown className="size-4 text-status-blocked" />
              <div>
                <p className="text-sm font-medium">Decrease</p>
                <p className="text-[11px] text-muted-foreground">
                  Credit / scope cut
                </p>
              </div>
            </button>
          </div>

          <div>
            <Label htmlFor="bcr-amount">Amount ({currency})</Label>
            <Input
              id="bcr-amount"
              type="number"
              step="100"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="14000"
              required
              className="mt-1.5 font-mono"
            />
          </div>

          <div>
            <Label htmlFor="bcr-reason">Reason</Label>
            <textarea
              id="bcr-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="What changed in scope, and what's the impact?"
              rows={3}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Preview */}
          {numAmount > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md border bg-muted/30 p-3 text-xs"
            >
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current budget</span>
                <span className="font-mono">
                  {formatCurrency(currentBudget, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change</span>
                <span
                  className={cn(
                    "font-mono font-medium",
                    delta > 0 ? "text-status-done" : "text-status-blocked",
                  )}
                >
                  {delta > 0 ? "+" : ""}
                  {formatCurrency(delta, currency)}
                </span>
              </div>
              <div className="mt-1 flex justify-between border-t pt-1.5 font-medium">
                <span>New budget if approved</span>
                <span className="font-mono">
                  {formatCurrency(newBudget, currency)}
                </span>
              </div>
            </motion.div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Submit for review"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
