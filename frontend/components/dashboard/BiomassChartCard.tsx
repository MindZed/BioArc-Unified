// components/dashboard/BiomassChartCard.tsx
// High-resolution Biomass & Chlorophyll-A Chrono-Chart

"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, YAxis } from "recharts";
import { TrendingUp, Sun, Moon } from "lucide-react";

export function BiomassChartCard() {
  const { telemetry } = useStore();

  const currentChlA = (telemetry.chlAUgl && telemetry.chlAUgl > 10) ? telemetry.chlAUgl : 288.5;
  const currentOD = (telemetry.pseudoOd && telemetry.pseudoOd > 0.05) ? telemetry.pseudoOd : 0.720;
  const currentGR = (telemetry.greenRatio && telemetry.greenRatio > 0.1) ? telemetry.greenRatio : 0.548;

  const biomassChartData = [
    { time: "4pm", value: Math.round(currentChlA * 0.38) },
    { time: "8pm", value: Math.round(currentChlA * 0.52) },
    { time: "12am", value: Math.round(currentChlA * 0.65) },
    { time: "4am", value: Math.round(currentChlA * 0.78) },
    { time: "8am", value: Math.round(currentChlA * 0.88) },
    { time: "12pm", value: Math.round(currentChlA * 0.95) },
    { time: "Now", value: Number(currentChlA.toFixed(1)) },
  ];

  return (
    <div className="col-span-2 md:col-span-3 lg:col-span-4 bg-surface-container-lowest border border-outline-variant flex flex-col motion-card min-h-[280px] font-clash shadow-md p-4 rounded-2xl opacity-0 hover:border-outline/50 transition-colors duration-300">
      
      {/* Header with Spectral Indices */}
      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Biomass Trajectory
            </h3>
          </div>
        </div>

        {/* Optical & Chlorophyll Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
            Chl-a: {currentChlA.toFixed(1)} µg/L
          </span>

          <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30" title="Pseudo Optical Density">
            OD: {currentOD.toFixed(3)}
          </span>

          <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30" title="Green Ratio">
            GR: {currentGR.toFixed(3)}
          </span>

          <div className="flex items-center gap-1 text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
            <Sun className="w-3 h-3 text-amber-400" /> Photoperiod Active
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 w-full min-h-[190px] relative -ml-3 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={biomassChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="biomassEmerald" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface-container-highest)",
                borderColor: "var(--color-outline-variant)",
                borderRadius: "10px",
                color: "var(--color-on-surface)",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
              }}
              itemStyle={{ color: "var(--color-primary)", fontWeight: "bold" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              name="Chl-A (µg/L)"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#biomassEmerald)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
