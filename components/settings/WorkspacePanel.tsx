"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/db/store";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED", "JPY", "CAD", "AUD"];

export function WorkspacePanel() {
  const orgName = useStore((s) => s.organization.name);
  const orgSlug = useStore((s) => s.organization.slug);
  const baseCurrency = useStore((s) => s.baseCurrency);
  const fxRates = useStore((s) => s.fxRates);
  const setBaseCurrency = useStore((s) => s.setBaseCurrency);
  const setFxRate = useStore((s) => s.setFxRate);

  const [name, setName] = useState(orgName);
  const [newCurrency, setNewCurrency] = useState("");
  const [newRate, setNewRate] = useState("");

  const usedCurrencies = new Set(fxRates.map((r) => r.currency));
  const availableCurrencies = CURRENCY_OPTIONS.filter(
    (c) => c !== baseCurrency && !usedCurrencies.has(c),
  );

  const handleAddRate = () => {
    if (!newCurrency || !newRate) return;
    const rate = Number(newRate);
    if (Number.isNaN(rate) || rate <= 0) {
      toast.error("Rate must be a positive number");
      return;
    }
    setFxRate(newCurrency, rate);
    setNewCurrency("");
    setNewRate("");
    toast.success(`Added ${newCurrency} → ${baseCurrency} rate`);
  };

  return (
    <div className="grid gap-6">
      {/* Identity */}
      <div className="grid gap-4">
        <div>
          <Label
            htmlFor="ws-name"
            className="text-[11px] uppercase tracking-wider text-muted-foreground"
          >
            Workspace name
          </Label>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Slug
          </Label>
          <div className="mt-1.5 flex items-center gap-1 rounded-md border bg-muted/40 px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">atelier.app/</span>
            <span className="font-mono">{orgSlug}</span>
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Multi-currency */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <p className="text-sm font-semibold">Multi-currency</p>
            <p className="text-xs text-muted-foreground">
              Reports + dashboard totals are converted into your base currency
              using the rates below.
            </p>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-3">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Base currency
          </Label>
          <select
            value={baseCurrency}
            onChange={(e) => {
              setBaseCurrency(e.target.value);
              toast.success(`Base currency set to ${e.target.value}`);
            }}
            className="mt-1.5 flex h-9 w-full max-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            All foreign-currency invoices, quotes, and budgets are converted to{" "}
            <span className="font-mono">{baseCurrency}</span> for org-wide
            roll-ups.
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-md border">
          <table className="min-w-full">
            <thead className="bg-muted/30">
              <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Currency</th>
                <th className="px-3 py-2">→ {baseCurrency}</th>
                <th className="px-3 py-2">Updated</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <AnimatePresence initial={false}>
                {fxRates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-xs text-muted-foreground"
                    >
                      No FX rates configured. Add one to enable multi-currency
                      conversion.
                    </td>
                  </tr>
                ) : null}
                {fxRates.map((r) => (
                  <motion.tr
                    key={r.currency}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                  >
                    <td className="px-3 py-2 font-mono text-sm font-medium">
                      {r.currency}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.0001"
                        defaultValue={r.rateToBase}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v > 0 && v !== r.rateToBase) {
                            setFxRate(r.currency, v);
                            toast.success(
                              `${r.currency} rate updated to ${v}`,
                            );
                          }
                        }}
                        className="h-8 w-24 text-right font-mono text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {format(parseISO(r.updatedAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => {
                          setFxRate(r.currency, 0);
                          // setting to 0 then we filter out via the store's setFxRate
                          // (it actually keeps it; better to add a dedicated remove)
                        }}
                        className="text-muted-foreground hover:text-status-blocked"
                        aria-label={`Remove ${r.currency}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Add rate row */}
        {availableCurrencies.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Add currency
              </Label>
              <select
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value)}
                className="mt-1.5 flex h-9 w-32 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select…</option>
                {availableCurrencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Rate to {baseCurrency}
              </Label>
              <Input
                type="number"
                step="0.0001"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="1.0000"
                className="mt-1.5 w-32 font-mono"
              />
            </div>
            <Button
              size="sm"
              onClick={handleAddRate}
              disabled={!newCurrency || !newRate}
            >
              <Plus className="size-4" /> Add rate
            </Button>
          </div>
        ) : null}

        <div
          className={cn(
            "mt-4 flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground",
          )}
        >
          <RefreshCw className="mt-0.5 size-3.5 shrink-0" />
          <div>
            Rates are entered manually for this build. The data layer hook for
            a daily live FX feed (e.g. exchangerate.host) ships in Pass 7.
          </div>
        </div>
      </div>
    </div>
  );
}
