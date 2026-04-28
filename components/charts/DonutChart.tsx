"use client";

import { motion } from "framer-motion";

interface DonutChartProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  segments,
  size = 160,
  thickness = 24,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  let offsetSoFar = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={thickness}
            opacity={0.4}
          />
          {segments.map((seg, i) => {
            const length = (seg.value / total) * circumference;
            const offset = offsetSoFar;
            offsetSoFar += length;
            return (
              <motion.circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeLinecap="butt"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
              />
            );
          })}
        </svg>
        {centerLabel || centerValue ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue ? (
              <span className="font-mono text-2xl font-semibold">
                {centerValue}
              </span>
            ) : null}
            {centerLabel ? (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {centerLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        {segments.map((seg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="ml-auto font-mono font-medium">
              {seg.value.toLocaleString()}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
