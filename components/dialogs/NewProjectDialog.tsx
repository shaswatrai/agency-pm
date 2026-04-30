"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { addMonths, format } from "date-fns";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  TEMPLATES_BY_PARENT,
  getTemplate,
  type ProjectTemplate,
} from "@/lib/templates/projectTemplates";
import {
  Globe,
  Smartphone,
  Megaphone,
  Sparkles,
  Wrench,
  CircleHelp,
} from "lucide-react";
import type {
  BillingModel,
  ProjectType,
  Phase,
} from "@/types/domain";
import type { TaskPriority } from "@/lib/design/tokens";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
}

const TYPE_META: Record<
  ProjectType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    phases: string[];
    duration: number;
    budget: number;
  }
> = {
  web_dev: {
    label: "Web development",
    icon: Globe,
    color: "from-status-progress/20",
    phases: [
      "Discovery & Planning",
      "Information Architecture",
      "Wireframing",
      "UI Design",
      "Frontend Development",
      "Backend Development",
      "Content Integration",
      "QA & Testing",
      "Launch",
    ],
    duration: 4,
    budget: 80000,
  },
  app_dev: {
    label: "App development",
    icon: Smartphone,
    color: "from-status-review/20",
    phases: [
      "Discovery & Research",
      "UX Design",
      "UI Design",
      "Architecture & Setup",
      "Sprint Development",
      "QA & Testing",
      "Beta Testing",
      "Launch",
    ],
    duration: 6,
    budget: 200000,
  },
  digital_marketing: {
    label: "Digital marketing",
    icon: Megaphone,
    color: "from-status-revisions/20",
    phases: [
      "Audit & Research",
      "Strategy Development",
      "Content Creation",
      "Campaign Execution",
      "Reporting",
    ],
    duration: 3,
    budget: 24000,
  },
  branding: {
    label: "Branding",
    icon: Sparkles,
    color: "from-primary/20",
    phases: [
      "Discovery",
      "Research & Moodboarding",
      "Concept Development",
      "Logo Design",
      "Brand System",
      "Guidelines & Delivery",
    ],
    duration: 2,
    budget: 45000,
  },
  maintenance: {
    label: "Maintenance retainer",
    icon: Wrench,
    color: "from-muted/40",
    phases: ["Triage", "Implementation", "QA", "Release"],
    duration: 12,
    budget: 36000,
  },
  other: {
    label: "Other",
    icon: CircleHelp,
    color: "from-muted/40",
    phases: ["Planning", "Execution", "Review"],
    duration: 2,
    budget: 12000,
  },
};

export function NewProjectDialog({
  open,
  onOpenChange,
  defaultClientId,
}: NewProjectDialogProps) {
  const router = useRouter();
  const orgSlug = useStore((s) => s.organization.slug);
  const clients = useStore((s) => s.clients);
  const users = useStore((s) => s.users);
  const currentUser = useCurrentUser();
  const addProject = useStore((s) => s.addProject);

  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("web_dev");
  const [clientId, setClientId] = useState(
    defaultClientId ?? clients[0]?.id ?? "",
  );
  const [pmId, setPmId] = useState(currentUser.id);
  const [billingModel, setBillingModel] = useState<BillingModel>("fixed_price");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [startDate, setStartDate] = useState(
    format(new Date("2026-04-29"), "yyyy-MM-dd"),
  );
  const [budget, setBudget] = useState<number>(TYPE_META.web_dev.budget);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const template = templateId ? getTemplate(templateId) : null;
  const availableTemplates = TEMPLATES_BY_PARENT[type] ?? [];

  const meta = TYPE_META[type];
  const durationMonths = template
    ? Math.max(1, Math.round(template.estimatedWeeks / 4))
    : meta.duration;
  const endDate = format(
    addMonths(new Date(startDate), durationMonths),
    "yyyy-MM-dd",
  );

  const handleTypeChange = (t: ProjectType) => {
    setType(t);
    setBudget(TYPE_META[t].budget);
    // Clear template if it doesn't belong to the new parent type
    if (template && template.parentType !== t) {
      setTemplateId(null);
    }
  };

  const handleTemplateChange = (tpl: ProjectTemplate | null) => {
    setTemplateId(tpl?.id ?? null);
    if (tpl) {
      setBudget(tpl.defaultBudget);
      if (tpl.parentType !== type) setType(tpl.parentType);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name your project");
    if (!clientId) return toast.error("Pick a client");

    const phaseSource = template
      ? template.phases.map((p) => p.name)
      : meta.phases;
    const totalEstimatedHours = template
      ? template.phases.reduce(
          (s, p) => s + p.tasks.reduce((ss, t) => ss + t.estimatedHours, 0),
          0,
        )
      : durationMonths * 160;

    const project = addProject({
      clientId,
      name: name.trim(),
      type,
      subType: template?.subType,
      templateId: template?.id,
      startDate,
      endDate,
      status: "active",
      priority,
      projectManagerId: pmId,
      billingModel,
      totalBudget: budget,
      estimatedHours: totalEstimatedHours,
      description: template
        ? template.description
        : `${meta.label} engagement for ${
            clients.find((c) => c.id === clientId)?.name
          }.`,
      tags: [],
    });

    // Auto-create phases (from template if picked, else from broad type)
    const projectPhases: Phase[] = phaseSource.map((phaseName, i) => ({
      id: `${project.id}_phase_${i + 1}`,
      projectId: project.id,
      name: phaseName,
      position: i + 1,
      isComplete: false,
    }));
    useStore.setState((state) => ({
      phases: [...state.phases, ...projectPhases],
    }));

    // If a template was picked, scaffold skeleton tasks per phase
    let skeletonCount = 0;
    if (template) {
      const addTask = useStore.getState().addTask;
      template.phases.forEach((tp, phaseIdx) => {
        const phaseId = projectPhases[phaseIdx]?.id;
        for (const t of tp.tasks) {
          addTask({
            projectId: project.id,
            phaseId,
            title: t.title,
            status: "todo",
            priority: t.priority ?? "medium",
            assigneeIds: [],
            estimatedHours: t.estimatedHours,
            storyPoints: t.storyPoints,
            taskType: t.taskType,
            tags: [template.subType],
            clientVisible: false,
            actualHours: 0,
            commentCount: 0,
            attachmentCount: 0,
            subtaskCount: 0,
            subtasksDone: 0,
          });
          skeletonCount++;
        }
      });
    }

    toast.success(`Created ${project.name}`, {
      description: template
        ? `${project.code} · ${phaseSource.length} phases · ${skeletonCount} starter tasks`
        : `${project.code} · ${phaseSource.length} phases auto-generated`,
    });
    onOpenChange(false);
    router.push(`/${orgSlug}/projects/${project.id}/overview`);
    setName("");
    setTemplateId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="border-b bg-gradient-to-br from-primary/5 to-transparent px-6 py-4">
          <DialogTitle className="text-base">New project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type picker */}
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Project type
            </Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(TYPE_META) as ProjectType[]).map((t) => {
                const m = TYPE_META[t];
                const active = t === type;
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => handleTypeChange(t)}
                    className={cn(
                      "group relative overflow-hidden rounded-md border p-3 text-left transition-all",
                      active
                        ? "border-primary/40 ring-1 ring-primary/30"
                        : "hover:bg-accent",
                    )}
                  >
                    {active ? (
                      <motion.div
                        layoutId="type-bg"
                        className={cn(
                          "absolute inset-0 bg-gradient-to-br to-transparent",
                          m.color,
                        )}
                      />
                    ) : null}
                    <div className="relative flex items-center gap-2">
                      <m.icon className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{m.label}</span>
                    </div>
                    <p className="relative mt-0.5 text-[10px] text-muted-foreground">
                      {m.phases.length} phases · ~{m.duration} mo
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template picker */}
          {availableTemplates.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Start from a template
                </Label>
                {template && (
                  <button
                    type="button"
                    onClick={() => handleTemplateChange(null)}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Clear · use plain {meta.label.toLowerCase()}
                  </button>
                )}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {availableTemplates.map((tpl) => {
                  const active = templateId === tpl.id;
                  const taskTotal = tpl.phases.reduce((s, p) => s + p.tasks.length, 0);
                  return (
                    <button
                      type="button"
                      key={tpl.id}
                      onClick={() => handleTemplateChange(active ? null : tpl)}
                      className={cn(
                        "rounded-md border p-3 text-left transition-all",
                        active
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                          : "hover:bg-accent",
                      )}
                    >
                      <p className="text-sm font-medium">{tpl.displayName}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {tpl.description}
                      </p>
                      <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {tpl.phases.length} phases · {taskTotal} starter tasks ·{" "}
                        {tpl.estimatedWeeks}w
                        {tpl.isRecurring ? " · recurring" : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Basics */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="np-name">Project name</Label>
              <Input
                id="np-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lumière flagship website"
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="np-client">Client</Label>
              <select
                id="np-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="np-start">Start</Label>
              <Input
                id="np-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>End (auto)</Label>
              <div className="mt-1.5 flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-mono text-muted-foreground">
                {endDate}
              </div>
            </div>
            <div>
              <Label htmlFor="np-budget">Budget</Label>
              <Input
                id="np-budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="np-pm">Project manager</Label>
              <select
                id="np-pm"
                value={pmId}
                onChange={(e) => setPmId(e.target.value)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="np-billing">Billing</Label>
              <select
                id="np-billing"
                value={billingModel}
                onChange={(e) => setBillingModel(e.target.value as BillingModel)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="fixed_price">Fixed price</option>
                <option value="time_and_materials">Time & materials</option>
                <option value="retainer">Retainer</option>
                <option value="milestone">Milestone-based</option>
              </select>
            </div>
            <div>
              <Label htmlFor="np-priority">Priority</Label>
              <select
                id="np-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Phase preview */}
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {template
                ? `${template.displayName} · phases + starter tasks`
                : "Auto-generated phases"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(template ? template.phases.map((p) => p.name) : meta.phases).map(
                (phase, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-pill border bg-background px-2 py-0.5 text-[11px]"
                    title={
                      template
                        ? `${template.phases[i]?.tasks.length ?? 0} starter tasks`
                        : ""
                    }
                  >
                    <span className="grid size-3.5 place-items-center rounded-full bg-muted text-[8px] font-mono">
                      {i + 1}
                    </span>
                    {phase}
                    {template && (
                      <span className="text-[9px] text-muted-foreground">
                        · {template.phases[i]?.tasks.length ?? 0}
                      </span>
                    )}
                  </span>
                ),
              )}
            </div>
            {template && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                {template.phases.reduce((s, p) => s + p.tasks.length, 0)} tasks
                will be created in the To-do column · ~
                {template.phases.reduce(
                  (s, p) => s + p.tasks.reduce((ss, t) => ss + t.estimatedHours, 0),
                  0,
                )}
                h estimated
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t pt-4 -mx-6 -mb-6 px-6 py-4 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create project</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
