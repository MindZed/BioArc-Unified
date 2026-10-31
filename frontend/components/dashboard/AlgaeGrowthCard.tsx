// components/dashboard/AlgaeGrowthCard.tsx
// Algae Growth Velocity & Net Carbon Sequestration Bento Card

"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { Leaf, ArrowUpRight } from "lucide-react";

export function AlgaeGrowthCard() {
  const { telemetry } = useStore();

  const growthRate = (telemetry.algaeGrowthRate !== undefined && telemetry.algaeGrowthRate !== 0
    ? (telemetry.algaeGrowthRate > 1 ? telemetry.algaeGrowthRate : telemetry.algaeGrowthRate * 100)
    : 8.0);

  const co2Absorbed = (growthRate * 12.4).toFixed(1);
  const o2Produced = (growthRate * 15.2).toFixed(1);

  return (
    <div className="col-span-1 md:col-span-1 lg:col-span-1 bg-surface-container-lowest text-on-surface rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between motion-card font-clash border border-outline-variant opacity-0 hover:border-outline/50 transition-colors duration-300">
      
      {/* Background biological gradient curve */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="growthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d="M0 100 L0 85 Q 25 75, 50 60 T 100 20 L 100 100 Z" fill="url(#growthGrad)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between">
          <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">
            Algae Growth
          </h3>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-[10px] border border-primary/20">
            <Leaf className="w-3 h-3" /> Net (+)
          </span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline">
            <span className="text-[36px] font-bold text-primary leading-none tracking-tight">
              {growthRate.toFixed(1)}
            </span>
            <span className="text-lg text-primary/80 ml-1 font-normal">% / day</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-on-surface-variant mt-1.5 font-sans">
            <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
            <span>Accumulating biomass</span>
          </div>
        </div>

        {/* Carbon Capture Footnote */}
        <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
          <span>CO₂: <strong className="text-on-surface font-semibold">{co2Absorbed}g</strong></span>
          <span>O₂: <strong className="text-secondary font-semibold">{o2Produced}g</strong></span>
        </div>
      </div>
    </div>
  );
}
