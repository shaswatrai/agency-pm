"use client";

import type { FxRate } from "@/types/domain";
import { useStore } from "@/lib/db/store";

/**
 * Convert an amount from `fromCurrency` to the org's base currency.
 * If the rate isn't defined we treat it as 1:1 (degraded but predictable).
 */
export function convertToBase(
  amount: number,
  fromCurrency: string,
  baseCurrency: string,
  rates: FxRate[],
): number {
  if (fromCurrency === baseCurrency) return amount;
  const rate = rates.find((r) => r.currency === fromCurrency);
  if (!rate) return amount; // unknown — assume 1:1
  return amount * rate.rateToBase;
}

/** Format a number as currency. */
export function formatCurrencyAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convert `amount` from `fromCurrency` to base currency and format it.
 * Useful for KPI cards that aggregate across currencies.
 */
export function formatInBase(
  amount: number,
  fromCurrency: string,
  baseCurrency: string,
  rates: FxRate[],
): string {
  const converted = convertToBase(amount, fromCurrency, baseCurrency, rates);
  return formatCurrencyAmount(converted, baseCurrency);
}

/** Hook that returns a stable converter bound to current store state. */
export function useBaseConverter() {
  const baseCurrency = useStore((s) => s.baseCurrency);
  const rates = useStore((s) => s.fxRates);
  return {
    baseCurrency,
    convert: (amount: number, fromCurrency: string) =>
      convertToBase(amount, fromCurrency, baseCurrency, rates),
    format: (amount: number, fromCurrency: string) =>
      formatInBase(amount, fromCurrency, baseCurrency, rates),
  };
}
