"use client";

import { useEffect, useState } from "react";
import { Pen, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/db/store";
import { toast } from "sonner";
import type { ApprovalSignature } from "@/types/domain";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "approved" | "revisions_requested" | "rejected";
  entityType: ApprovalSignature["entityType"];
  entityId: string;
  entityTitle: string;
  /** Called after the signature is captured. The caller does the
   *  actual state mutation (e.g. mark task done) since signatures
   *  are decoupled from the underlying status change. */
  onSigned: (sig: ApprovalSignature) => void;
}

/**
 * Digital-signature dialog for client approval flows (PRD §5.5.2).
 * Captures the signer's typed name + role + optional comment, stores
 * an immutable ApprovalSignature row, then hands off to the caller
 * to apply the underlying state change.
 */
export function SignatureDialog({
  open,
  onOpenChange,
  action,
  entityType,
  entityId,
  entityTitle,
  onSigned,
}: Props) {
  const addSignature = useStore((s) => s.addApprovalSignature);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [comment, setComment] = useState("");
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setRole("");
      setComment("");
      setAgree(false);
    }
  }, [open]);

  const meta = {
    approved: {
      title: "Approve & sign",
      Icon: CheckCircle2,
      tone: "text-status-done",
      cta: "Sign & approve",
      ctaCls: "bg-status-done text-white hover:bg-status-done/90",
    },
    revisions_requested: {
      title: "Request revisions",
      Icon: AlertCircle,
      tone: "text-status-revisions",
      cta: "Sign & request changes",
      ctaCls: "bg-status-revisions text-white hover:bg-status-revisions/90",
    },
    rejected: {
      title: "Reject & sign",
      Icon: AlertCircle,
      tone: "text-status-blocked",
      cta: "Sign & reject",
      ctaCls: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    },
  }[action];

  function submit() {
    if (!name.trim()) {
      toast.error("Type your full name to sign");
      return;
    }
    if (!agree) {
      toast.error("Confirm the legal acknowledgment");
      return;
    }
    const sig = addSignature({
      entityType,
      entityId,
      action,
      signedName: name.trim(),
      signedRole: role.trim() || undefined,
      comment: comment.trim() || undefined,
      signatureMethod: "typed_name",
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });
    onSigned(sig);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <meta.Icon className={`size-4 ${meta.tone}`} />
            {meta.title}
          </DialogTitle>
          <DialogDescription>
            {entityTitle} · this is a binding electronic signature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Full legal name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">Title / role (optional)</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Marketing Director"
            />
          </div>
          <div>
            <Label className="text-xs">
              {action === "approved" ? "Approval note (optional)" : "Comment"}
            </Label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={
                action === "revisions_requested"
                  ? "What needs to change?"
                  : "Anything you'd like the team to know?"
              }
            />
          </div>

          <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 size-3.5"
            />
            <span className="text-[11px] text-muted-foreground">
              By typing my name above I agree this constitutes my electronic
              signature and has the same legal effect as a wet-ink signature.
              The signed name, timestamp, and device info will be recorded on
              this {entityType}.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} className={meta.ctaCls}>
            <Pen className="mr-1 size-3.5" />
            {meta.cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
