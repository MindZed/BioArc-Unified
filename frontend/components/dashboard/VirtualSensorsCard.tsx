// components/dashboard/VirtualSensorsCard.tsx
// AI/ML Virtual Sensors Bento Card (Predicted pH & Dissolved Oxygen)

"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { Bot, Activity, Droplets } from "lucide-react";

export function VirtualSensorsCard() {
  const { telemetry } = useStore();

  const ph = telemetry.predictedPh ?? 7.8;
  const doValue = telemetry.predictedDo ?? 8.5;

  return (
    <div className="col-span-1 md:col-span-1 lg:col-span-1 bg-surface-container-lowest text-on-surface rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between motion-card font-clash border border-outline-variant opacity-0 hover:border-outline/50 transition-colors duration-300">
      
      {/* Decorative background glow */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M0 75 Q 30 65, 50 75 T 100 70 L 100 100 L 0 100 Z" fill="#818cf8" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between">
          <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">
            Virtual Sensors
          </h3>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary-fixed/10 text-secondary-fixed font-semibold text-[10px] border border-secondary/20">
            <Bot className="w-3 h-3" /> ML Engine
          </span>
        </div>

        {/* Dual Sensor Readouts */}
        <div className="grid grid-cols-2 gap-2 my-2">
          {/* Virtual pH */}
          <div className="bg-surface-container/50 p-2 rounded-xl border border-outline-variant/30">
            <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-sans">
              <Droplets className="w-3 h-3 text-cyan-400" /> pH (Est.)
            </div>
            <div className="text-[24px] font-bold text-on-surface mt-0.5 leading-tight">
              {ph.toFixed(2)}
            </div>
            <div className="text-[9px] text-primary font-mono mt-0.5">7.2–8.5 band</div>
          </div>

          {/* Virtual DO */}
          <div className="bg-surface-container/50 p-2 rounded-xl border border-outline-variant/30">
            <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-sans">
              <Activity className="w-3 h-3 text-emerald-400" /> DO (O₂)
            </div>
            <div className="text-[24px] font-bold text-on-surface mt-0.5 leading-tight">
              {doValue.toFixed(1)}
              <span className="text-[11px] font-normal text-on-surface-variant ml-0.5">mg/L</span>
            </div>
            <div className="text-[9px] text-primary font-mono mt-0.5">Optimal</div>
          </div>
        </div>

        {/* Confidence & Calibration status */}
        <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
          <span>Confidence: <strong className="text-primary font-semibold">94.8%</strong></span>
          <span>Inference: <strong className="text-on-surface font-semibold">Live</strong></span>
        </div>
      </div>
    </div>
  );
}
