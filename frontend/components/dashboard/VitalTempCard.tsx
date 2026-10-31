// components/dashboard/VitalTempCard.tsx
// High-contrast Water & Ambient Temperature Bento Card

"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { Thermometer, Wind, AlertTriangle } from "lucide-react";

export function VitalTempCard() {
  const { telemetry } = useStore();
  const isOverheating = (telemetry.waterTemp ?? 25) >= 34.0;

  return (
    <div className="col-span-1 md:col-span-1 lg:col-span-1 bg-surface-container-lowest text-on-surface rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between motion-card font-clash border border-outline-variant opacity-0 hover:border-outline/50 transition-colors duration-300">
      
      {/* Subtle temperature wave backdrop */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M0 60 Q 15 50, 30 60 T 60 65 T 90 55 T 100 60 L 100 100 L 0 100 Z" fill={isOverheating ? "#f87171" : "#60a5fa"} />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between">
          <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">
            Water Temp
          </h3>
          <div className={`p-1.5 rounded-lg ${isOverheating ? 'bg-error/20 text-error' : 'bg-surface-container text-primary'}`}>
            {isOverheating ? <AlertTriangle className="w-4 h-4 animate-pulse" /> : <Thermometer className="w-4 h-4" />}
          </div>
        </div>

        <div className="my-2">
          <div className="flex items-baseline">
            <span className={`text-[36px] font-bold leading-none tracking-tight ${isOverheating ? 'text-error' : 'text-on-surface'}`}>
              {telemetry.waterTemp ?? 25.0}
            </span>
            <span className="text-lg text-on-surface-variant ml-1 font-normal">°C</span>
          </div>

          {isOverheating ? (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-error mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
              Vent Fan Active (≥34°C)
            </div>
          ) : (
            <div className="text-[11px] text-on-surface-variant mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Nominal Range (20–30°C)
            </div>
          )}
        </div>

        {/* Ambient Air & Humidity Footnote */}
        <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1 font-mono">
            <Wind className="w-3 h-3 text-cyan-400" /> Air: {telemetry.ambientTemp ?? 24}°C
          </span>
          <span className="font-mono text-on-surface/80">
            {telemetry.humidity ?? 65}% RH
          </span>
        </div>
      </div>
    </div>
  );
}
