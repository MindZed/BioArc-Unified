// components/dashboard/HardwareVitalsCard.tsx
// Ultrasonic Level, Volume & Barometric Telemetry Bento Card

"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { Gauge, Radio, Compass } from "lucide-react";

export function HardwareVitalsCard() {
  const { telemetry } = useStore();

  const volumePct = Math.min(100, Math.max(0, telemetry.reservoirVolume ?? 0));
  const rawDist = telemetry.rawDistanceCm ?? 15.0;
  const volumeLiters = ((volumePct / 100) * 7.0).toFixed(1);

  return (
    <div className="col-span-1 md:col-span-1 lg:col-span-1 bg-surface-container-lowest text-on-surface rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between motion-card font-clash border border-outline-variant opacity-0 hover:border-outline/50 transition-colors duration-300">
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between">
          <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">
            Tank Level
          </h3>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono text-[10px] border border-outline-variant/30">
            <Radio className="w-3 h-3 text-amber-400" /> Ultrasonic
          </span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline">
              <span className="text-[34px] font-bold text-on-surface leading-none tracking-tight">
                {volumePct.toFixed(0)}
              </span>
              <span className="text-base text-on-surface-variant ml-0.5 font-normal">%</span>
            </div>
            <span className="text-[14px] font-mono font-semibold text-primary">
              {volumeLiters} / 7.0 L
            </span>
          </div>

          {/* Level Progress Indicator */}
          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden mt-2 border border-outline-variant/30">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${volumePct}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-mono mt-1.5">
            <span>Empty (0%)</span>
            <span className="text-amber-400 font-semibold">{rawDist.toFixed(1)} cm air gap</span>
            <span>Full (100%)</span>
          </div>
        </div>

        {/* Ambient Pressure Footnote */}
        <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
          <span className="flex items-center gap-1">
            <Compass className="w-3 h-3 text-indigo-400" /> Pressure:
          </span>
          <span className="text-on-surface font-semibold">
            {telemetry.pressure ?? 1013} hPa
          </span>
        </div>
      </div>
    </div>
  );
}
