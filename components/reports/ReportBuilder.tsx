"use client";

/**
 * Custom report builder dialog.
 *
 * Linear flow:
 *   1. Pick a data source
 *   2. Pick a group-by (optional for KPI mode)
 *   3. Pick a measure (count / sum / avg over a numeric field)
 *   4. Add filters (field / operator / value)
 *   5. Choose a visual (table / bar / kpi)
 *   6. Live preview + save
 *
 * Save persists via the store's addCustomReport / updateCustomReport,
 * which dual-write to the custom_reports table.
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Hash,
  LayoutList,
  ListChecks,
  Plus,
  Sigma,
  Table as TableIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/db/store";
import {
  FIELDS_BY_SOURCE,
  categoryFieldsFor,
  fieldDef,
  numericFieldsFor,
  runReport,
  labelForKey,
} from "@/lib/reports/runner";
import { cn } from "@/lib/utils";
import type {
  CustomReport,
  ReportConfig,
  ReportFilter,
  ReportFilterOp,
  ReportSource,
  ReportVisual,
} from "@/types/domain";

const SOURCE_OPTIONS: {
  value: ReportSource;
  label: string;
  description: string;
}[] = [
  { value: "tasks", label: "Tasks", description: "Statuses, priorities, hours" },
  {
    value: "time_entries",
    label: "Time entries",
    description: "Logged minutes, billable",
  },
  { value: "projects", label: "Projects", description: "Health, budget, billing" },
  { value: "invoices", label: "Invoices", description: "Status, total, paid" },
  { value: "clients", label: "Clients", description: "Status, industry, type" },
];

const VISUALS: { value: ReportVisual; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "table", label: "Table", icon: TableIcon },
  { value: "bar", label: "Bar chart", icon: BarChart3 },
  { value: "kpi", label: "KPI tile", icon: Hash },
];

const OP_OPTIONS: { value: ReportFilterOp; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "contains", label: "contains" },
];

function defaultConfig(source: ReportSource): ReportConfig {
  return {
    source,
    groupBy: categoryFieldsFor(source)[0]?.key,
    measure: { kind: "count" },
    filters: [],
    visual: "bar",
    sortDir: "desc",
    limit: 10,
  };
}

export function ReportBuilder({
  open,
  onOpenChange,
  editingReport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingReport?: CustomReport | null;
}) {
  const tasks = useStore((s) => s.tasks);
  const timeEntries = useStore((s) => s.timeEntries);
  const projects = useStore((s) => s.projects);
  const invoices = useStore((s) => s.invoices);
  const clients = useStore((s) => s.clients);
  const users = useStore((s) => s.users);
  const addCustomReport = useStore((s) => s.addCustomReport);
  const updateCustomReport = useStore((s) => s.updateCustomReport);

  const initial = editingReport;

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [config, setConfig] = useState<ReportConfig>(
    initial?.config ?? defaultConfig("tasks"),
  );

  const inputs = useMemo(
    () => ({ tasks, timeEntries, projects, invoices, clients }),
    [tasks, timeEntries, projects, invoices, clients],
  );

  const result = useMemo(() => runReport(config, inputs), [config, inputs]);

  const setSource = (source: ReportSource) => {
    // Reset group/measure/filters when source changes
    setConfig(defaultConfig(source));
  };

  const updateConfig = <K extends keyof ReportConfig>(
    key: K,
    value: ReportConfig[K],
  ) => setConfig((c) => ({ ...c, [key]: value }));

  const addFilter = () => {
    const firstField = FIELDS_BY_SOURCE[config.source][0]?.key ?? "";
    setConfig((c) => ({
      ...c,
      filters: [
        ...c.filters,
        { field: firstField, op: "eq", value: "" } satisfies ReportFilter,
      ],
    }));
  };

  const updateFilter = (idx: number, patch: Partial<ReportFilter>) => {
    setConfig((c) => ({
      ...c,
      filters: c.filters.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    }));
  };

  const removeFilter = (idx: number) => {
    setConfig((c) => ({
      ...c,
      filters: c.filters.filter((_, i) => i !== idx),
    }));
  };

  const close = () => onOpenChange(false);

  const save = () => {
    if (!name.trim()) return;
    if (initial) {
      updateCustomReport(initial.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        config,
      });
    } else {
      addCustomReport({
        name: name.trim(),
        description: description.trim() || undefined,
        config,
      });
    }
    close();
  };

  const numericFields = numericFieldsFor(config.source);

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit report" : "New custom report"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Name + description */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Report name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tasks by status — last 30 days"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Description (optional)
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this answers"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Source */}
          <Section number={1} title="Data source">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {SOURCE_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSource(s.value)}
                  className={cn(
                    "rounded-md border bg-card p-2 text-left transition-colors hover:border-primary/40",
                    config.source === s.value &&
                      "border-primary/50 bg-primary/5",
                  )}
                >
                  <p className="text-xs font-medium">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.description}
                  </p>
                </button>
              ))}
            </div>
          </Section>

          {/* Group + measure */}
          <Section number={2} title="Group + measure">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Group by
                </Label>
                <select
                  value={config.groupBy ?? ""}
                  onChange={(e) =>
                    updateConfig("groupBy", e.target.value || undefined)
                  }
                  className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">No grouping (single value)</option>
                  {categoryFieldsFor(config.source).map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Measure
                </Label>
                <select
                  value={config.measure.kind}
                  onChange={(e) => {
                    const kind = e.target.value as
                      | "count"
                      | "sum"
                      | "avg";
                    if (kind === "count") {
                      updateConfig("measure", { kind: "count" });
                    } else {
                      const first =
                        numericFields[0]?.key ??
                        FIELDS_BY_SOURCE[config.source][0]?.key ??
                        "";
                      updateConfig("measure", { kind, field: first });
                    }
                  }}
                  className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="count">Count of records</option>
                  <option value="sum" disabled={numericFields.length === 0}>
                    Sum of …
                  </option>
                  <option value="avg" disabled={numericFields.length === 0}>
                    Average of …
                  </option>
                </select>
              </div>
              {config.measure.kind !== "count" ? (
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Field
                  </Label>
                  <select
                    value={
                      (config.measure as { field: string }).field ?? ""
                    }
                    onChange={(e) =>
                      updateConfig("measure", {
                        kind: config.measure.kind,
                        field: e.target.value,
                      } as ReportConfig["measure"])
                    }
                    className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {numericFields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-end">
                  <span className="rounded-md border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                    <Sigma className="mr-1 inline-block size-3" /> Counts every
                    record after filters
                  </span>
                </div>
              )}
            </div>
          </Section>

          {/* Filters */}
          <Section number={3} title="Filters" optional>
            {config.filters.length > 0 ? (
              <div className="space-y-1.5">
                {config.filters.map((f, i) => (
                  <FilterRow
                    key={i}
                    source={config.source}
                    filter={f}
                    onChange={(patch) => updateFilter(i, patch)}
                    onRemove={() => removeFilter(i)}
                  />
                ))}
              </div>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={addFilter}
              className="mt-2 h-7 text-[11px]"
            >
              <Plus className="size-3" /> Add filter
            </Button>
          </Section>

          {/* Visual */}
          <Section number={4} title="Visual">
            <div className="grid grid-cols-3 gap-2">
              {VISUALS.map((v) => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => updateConfig("visual", v.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border bg-card p-2.5 text-left transition-colors hover:border-primary/40",
                      config.visual === v.value &&
                        "border-primary/50 bg-primary/5",
                    )}
                  >
                    <Icon className="size-4 text-primary" />
                    <span className="text-xs font-medium">{v.label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Preview */}
          <Section number={5} title="Preview" className="bg-muted/20">
            <ReportRenderer
              config={config}
              result={result}
              users={users}
              inputs={inputs}
            />
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button disabled={!name.trim()} onClick={save}>
            {initial ? "Save changes" : "Save report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function Section({
  number,
  title,
  optional,
  className,
  children,
}: {
  number: number;
  title: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("rounded-md border p-3", className)}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          {number}
        </span>
        <h4 className="text-xs font-semibold">{title}</h4>
        {optional ? (
          <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Optional
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FilterRow({
  source,
  filter,
  onChange,
  onRemove,
}: {
  source: ReportSource;
  filter: ReportFilter;
  onChange: (patch: Partial<ReportFilter>) => void;
  onRemove: () => void;
}) {
  const fields = FIELDS_BY_SOURCE[source];
  const def = fieldDef(source, filter.field);
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5">
      <select
        value={filter.field}
        onChange={(e) => onChange({ field: e.target.value })}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      >
        {fields.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        value={filter.op}
        onChange={(e) => onChange({ op: e.target.value as ReportFilterOp })}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      >
        {OP_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Input
        value={String(filter.value ?? "")}
        onChange={(e) => {
          const raw = e.target.value;
          // Coerce to number when the field is numeric
          if (def?.kind === "numeric") {
            const n = Number(raw);
            onChange({ value: isFinite(n) && raw !== "" ? n : raw });
          } else {
            onChange({ value: raw });
          }
        }}
        placeholder="value"
        className="h-8 text-xs"
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onRemove}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

// Public: render any saved report inline on the /reports page
export function ReportRenderer({
  config,
  result,
  users,
  inputs,
}: {
  config: ReportConfig;
  result: ReturnType<typeof runReport>;
  users: { id: string; fullName: string }[];
  inputs: Parameters<typeof runReport>[1];
}) {
  if (result.rows.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        No matching records — adjust the filters or pick a different source.
      </div>
    );
  }
  if (config.visual === "kpi") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2">
        <div className="rounded-md border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {config.measure.kind === "count"
              ? "Records"
              : `${config.measure.kind} of ${
                  (config.measure as { field: string }).field
                }`}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            {formatNumber(result.total)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            across {result.totalCount} record{result.totalCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    );
  }
  if (config.visual === "bar") {
    const max = Math.max(...result.rows.map((r) => r.value), 1);
    return (
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {result.rows.map((row) => (
            <motion.div
              key={row.key}
              initial={{ opacity: 0, scaleX: 0.95, transformOrigin: "left" }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-[120px_1fr_60px] items-center gap-2"
            >
              <span className="truncate text-xs font-medium" title={row.key}>
                {labelForKey(
                  config.source,
                  config.groupBy,
                  row.key,
                  inputs,
                  users,
                )}
              </span>
              <div className="relative h-5 rounded bg-muted/40">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.max(2, (row.value / max) * 100)}%`,
                  }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-y-0 left-0 rounded bg-primary/70"
                />
              </div>
              <span className="text-right font-mono text-xs">
                {formatNumber(row.value)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }
  // Default: table
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="min-w-full divide-y">
        <thead className="bg-muted/40">
          <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2">
              {config.groupBy
                ? fieldDef(config.source, config.groupBy)?.label ?? "Group"
                : "Group"}
            </th>
            <th className="px-3 py-2 text-right">
              {config.measure.kind === "count"
                ? "Count"
                : `${config.measure.kind} ${
                    (config.measure as { field: string }).field
                  }`}
            </th>
            <th className="px-3 py-2 text-right">Records</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {result.rows.map((row) => (
            <tr key={row.key} className="text-sm">
              <td className="px-3 py-2">
                {labelForKey(
                  config.source,
                  config.groupBy,
                  row.key,
                  inputs,
                  users,
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {formatNumber(row.value)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                {row.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000)
    return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
