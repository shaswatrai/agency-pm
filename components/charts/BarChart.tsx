"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BarChartProps {
  data: { label: string; value: number; secondary?: number }[];
  formatValue?: (n: number) => string;
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  highlightLast?: boolean;
}

export function BarChart({
  data,
  formatValue = (n) => n.toLocaleString(),
  height = 180,
  primaryColor = "hsl(var(--primary))",
  secondaryColor = "hsl(var(--muted))",
  highlightLast = false,
}: BarChartProps) {
  const max = Math.max(
    ...data.flatMap((d) => [d.value, d.secondary ?? 0]),
    1,
  );
  return (
    <div>
      <div
        className="flex items-end gap-1.5"
        style={{ height: `${height}px` }}
      >
        {data.map((d, i) => (
          <div
            key={i}
            className="group relative flex flex-1 flex-col items-center justify-end gap-0.5"
          >
            {d.secondary !== undefined ? (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(d.secondary / max) * 100}%` }}
                transition={{ delay: i * 0.04, duration: 0.5 }}
                className="w-full rounded-t opacity-50"
                style={{ backgroundColor: secondaryColor }}
              />
            ) : null}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / max) * 100}%` }}
              transition={{
                delay: i * 0.04 + 0.1,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={cn(
                "relative w-full rounded-t transition-all",
                highlightLast && i === data.length - 1
                  ? ""
                  : "opacity-90 group-hover:opacity-100",
              )}
              style={{
                backgroundColor:
                  highlightLast && i === data.length - 1
                    ? primaryColor
                    : `${primaryColor}40`,
                ...(highlightLast && i !== data.length - 1
                  ? { backgroundColor: `${primaryColor}40` }
                  : {}),
              }}
            />
            <div className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-[10px] font-medium opacity-0 shadow-md transition-opacity group-hover:opacity-100 whitespace-nowrap">
              {formatValue(d.value)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
