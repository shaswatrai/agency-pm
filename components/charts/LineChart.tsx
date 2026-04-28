"use client";

import { motion } from "framer-motion";

interface LineChartProps {
  series: { name: string; color: string; data: number[]; dashed?: boolean }[];
  labels: string[];
  height?: number;
  formatValue?: (n: number) => string;
}

export function LineChart({
  series,
  labels,
  height = 200,
  formatValue = (n) => n.toLocaleString(),
}: LineChartProps) {
  const W = 600;
  const H = height;
  const PAD = { top: 20, right: 16, bottom: 28, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const allValues = series.flatMap((s) => s.data);
  const max = Math.max(...allValues, 1);
  const min = 0;

  const xScale = (i: number) =>
    PAD.left + (i / Math.max(1, labels.length - 1)) * innerW;
  const yScale = (v: number) =>
    PAD.top + innerH - ((v - min) / (max - min)) * innerH;

  const yTicks = 4;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full overflow-visible"
      preserveAspectRatio="none"
    >
      {/* Y grid lines */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const value = min + ((max - min) * i) / yTicks;
        const y = yScale(value);
        return (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke="hsl(var(--border))"
              strokeDasharray="2 4"
              opacity={0.6}
            />
            <text
              x={PAD.left - 6}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[9px] tabular-nums"
            >
              {formatValue(Math.round(value))}
            </text>
          </g>
        );
      })}

      {/* X labels */}
      {labels.map((lbl, i) => (
        <text
          key={i}
          x={xScale(i)}
          y={H - 10}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px] uppercase tracking-wider"
        >
          {lbl}
        </text>
      ))}

      {/* Series */}
      {series.map((s, si) => {
        const path = s.data
          .map(
            (v, i) =>
              `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(v)}`,
          )
          .join(" ");
        return (
          <g key={s.name}>
            <motion.path
              d={path}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={s.dashed ? "4 4" : undefined}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: si * 0.15 }}
            />
            {!s.dashed
              ? s.data.map((v, i) => (
                  <motion.circle
                    key={i}
                    cx={xScale(i)}
                    cy={yScale(v)}
                    r={3}
                    fill={s.color}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.04 + si * 0.1 }}
                  />
                ))
              : null}
          </g>
        );
      })}
    </svg>
  );
}
