"use client";

/**
 * Pure-function custom-report runner.
 *
 * Takes a ReportConfig + the relevant slices of the store and produces
 * an array of `{ key, value, count }` rows. The render layer turns that
 * into a table / bar chart / KPI tile.
 *
 * No store reads inside — callers pass in the data so this stays
 * deterministic and testable.
 */
import type {
  Client,
  CustomReport,
  Invoice,
  Project,
  ReportConfig,
  ReportFilter,
  ReportFilterOp,
  ReportSource,
  Task,
  TimeEntry,
} from "@/types/domain";

export interface ReportInputs {
  tasks: Task[];
  timeEntries: TimeEntry[];
  projects: Project[];
  invoices: Invoice[];
  clients: Client[];
}

export interface ReportRow {
  key: string;
  value: number;
  /** Underlying record count contributing to this row */
  count: number;
}

export interface ReportResult {
  config: ReportConfig;
  rows: ReportRow[];
  /** Total of all `value` across rows (handy for KPI / footer summary) */
  total: number;
  /** Total record count after filters */
  totalCount: number;
}

// ── Field catalog per source ─────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  /** `category` fields can be group-by candidates; `numeric` fields can be summed/avg'd. */
  kind: "category" | "numeric" | "date";
}

export const FIELDS_BY_SOURCE: Record<ReportSource, FieldDef[]> = {
  tasks: [
    { key: "status", label: "Status", kind: "category" },
    { key: "priority", label: "Priority", kind: "category" },
    { key: "projectId", label: "Project", kind: "category" },
    { key: "assigneeId", label: "Assignee (first)", kind: "category" },
    { key: "estimatedHours", label: "Estimated hours", kind: "numeric" },
    { key: "actualHours", label: "Actual hours", kind: "numeric" },
    { key: "createdAt", label: "Created at", kind: "date" },
  ],
  time_entries: [
    { key: "userId", label: "User", kind: "category" },
    { key: "taskId", label: "Task", kind: "category" },
    { key: "billable", label: "Billable", kind: "category" },
    { key: "date", label: "Date", kind: "date" },
    { key: "durationMinutes", label: "Duration (min)", kind: "numeric" },
  ],
  projects: [
    { key: "status", label: "Status", kind: "category" },
    { key: "health", label: "Health", kind: "category" },
    { key: "billingModel", label: "Billing model", kind: "category" },
    { key: "type", label: "Type", kind: "category" },
    { key: "clientId", label: "Client", kind: "category" },
    { key: "totalBudget", label: "Total budget", kind: "numeric" },
    { key: "estimatedHours", label: "Estimated hours", kind: "numeric" },
  ],
  invoices: [
    { key: "status", label: "Status", kind: "category" },
    { key: "type", label: "Type", kind: "category" },
    { key: "currency", label: "Currency", kind: "category" },
    { key: "clientId", label: "Client", kind: "category" },
    { key: "total", label: "Total", kind: "numeric" },
    { key: "amountPaid", label: "Amount paid", kind: "numeric" },
    { key: "issueDate", label: "Issue date", kind: "date" },
  ],
  clients: [
    { key: "status", label: "Status", kind: "category" },
    { key: "contractType", label: "Contract type", kind: "category" },
    { key: "currency", label: "Currency", kind: "category" },
    { key: "industry", label: "Industry", kind: "category" },
  ],
};

export function categoryFieldsFor(source: ReportSource): FieldDef[] {
  return FIELDS_BY_SOURCE[source].filter((f) => f.kind === "category");
}

export function numericFieldsFor(source: ReportSource): FieldDef[] {
  return FIELDS_BY_SOURCE[source].filter((f) => f.kind === "numeric");
}

export function fieldDef(
  source: ReportSource,
  key: string,
): FieldDef | undefined {
  return FIELDS_BY_SOURCE[source].find((f) => f.key === key);
}

// ── Record extraction ────────────────────────────────────────────────

interface NormalizedRecord {
  [key: string]: string | number | boolean | undefined;
}

function recordsFor(
  source: ReportSource,
  inputs: ReportInputs,
): NormalizedRecord[] {
  switch (source) {
    case "tasks":
      return inputs.tasks.map((t) => ({
        status: t.status,
        priority: t.priority,
        projectId: t.projectId,
        assigneeId: t.assigneeIds[0],
        estimatedHours: t.estimatedHours,
        actualHours: t.actualHours,
        createdAt: t.createdAt,
      }));
    case "time_entries":
      return inputs.timeEntries.map((e) => ({
        userId: e.userId,
        taskId: e.taskId,
        billable: e.billable,
        date: e.date,
        durationMinutes: e.durationMinutes,
      }));
    case "projects":
      return inputs.projects.map((p) => ({
        status: p.status,
        health: p.health,
        billingModel: p.billingModel,
        type: p.type,
        clientId: p.clientId,
        totalBudget: p.totalBudget,
        estimatedHours: p.estimatedHours,
      }));
    case "invoices":
      return inputs.invoices.map((i) => ({
        status: i.status,
        type: i.type,
        currency: i.currency,
        clientId: i.clientId,
        total: i.total,
        amountPaid: i.amountPaid,
        issueDate: i.issueDate,
      }));
    case "clients":
      return inputs.clients.map((c) => ({
        status: c.status,
        contractType: c.contractType,
        currency: c.currency,
        industry: c.industry,
      }));
    default:
      return [];
  }
}

// ── Filtering ────────────────────────────────────────────────────────

function matchesFilter(record: NormalizedRecord, f: ReportFilter): boolean {
  const v = record[f.field];
  return applyOp(v, f.op, f.value);
}

function applyOp(
  field: string | number | boolean | undefined,
  op: ReportFilterOp,
  value: ReportFilter["value"],
): boolean {
  // Treat undefined as never matching except for explicit `neq`
  switch (op) {
    case "eq":
      return field === value;
    case "neq":
      return field !== value;
    case "in":
      return Array.isArray(value)
        ? value.some((v) => v === field)
        : false;
    case "gt":
      return typeof field === "number" && typeof value === "number"
        ? field > value
        : false;
    case "gte":
      return typeof field === "number" && typeof value === "number"
        ? field >= value
        : false;
    case "lt":
      return typeof field === "number" && typeof value === "number"
        ? field < value
        : false;
    case "lte":
      return typeof field === "number" && typeof value === "number"
        ? field <= value
        : false;
    case "contains":
      return typeof field === "string" && typeof value === "string"
        ? field.toLowerCase().includes(value.toLowerCase())
        : false;
    default:
      return false;
  }
}

// ── Grouping + measure ───────────────────────────────────────────────

export function runReport(
  config: ReportConfig,
  inputs: ReportInputs,
): ReportResult {
  const records = recordsFor(config.source, inputs).filter((r) =>
    config.filters.every((f) => matchesFilter(r, f)),
  );

  const buckets = new Map<string, { sum: number; count: number }>();
  const noGroupKey = "__total__";

  for (const r of records) {
    const rawKey = config.groupBy ? r[config.groupBy] : noGroupKey;
    const key =
      rawKey === undefined || rawKey === null
        ? "—"
        : typeof rawKey === "boolean"
          ? rawKey
            ? "Yes"
            : "No"
          : String(rawKey);
    const measureValue =
      config.measure.kind === "count"
        ? 1
        : Number(r[(config.measure as { field: string }).field] ?? 0);
    if (!isFinite(measureValue)) continue;
    const bucket = buckets.get(key) ?? { sum: 0, count: 0 };
    bucket.sum += measureValue;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  let rows: ReportRow[] = Array.from(buckets.entries()).map(
    ([key, { sum, count }]) => ({
      key,
      value:
        config.measure.kind === "avg" ? (count > 0 ? sum / count : 0) : sum,
      count,
    }),
  );

  // Sort + limit
  rows.sort((a, b) => {
    if (config.sortDir === "asc") return a.value - b.value;
    return b.value - a.value;
  });
  if (config.limit && config.limit > 0) rows = rows.slice(0, config.limit);

  const total = rows.reduce((s, r) => s + r.value, 0);
  const totalCount = rows.reduce((s, r) => s + r.count, 0);

  return { config, rows, total, totalCount };
}

/**
 * Resolve a row key to a human-readable label using the underlying
 * inputs (e.g. projectId → project name, clientId → client name).
 */
export function labelForKey(
  source: ReportSource,
  groupBy: string | undefined,
  key: string,
  inputs: ReportInputs,
  users?: { id: string; fullName: string }[],
): string {
  if (key === "—" || key === "__total__") return key === "__total__" ? "Total" : "—";
  if (groupBy === "projectId") {
    return inputs.projects.find((p) => p.id === key)?.name ?? key;
  }
  if (groupBy === "clientId") {
    return inputs.clients.find((c) => c.id === key)?.name ?? key;
  }
  if (groupBy === "taskId") {
    return inputs.tasks.find((t) => t.id === key)?.title ?? key;
  }
  if (groupBy === "userId" || groupBy === "assigneeId") {
    return (
      users?.find((u) => u.id === key)?.fullName ??
      key
    );
  }
  return key;
}

// ── Convenience for callers ──────────────────────────────────────────

export function runSavedReport(
  report: CustomReport,
  inputs: ReportInputs,
): ReportResult {
  return runReport(report.config, inputs);
}
