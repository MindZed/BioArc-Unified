// components/dashboard/DemoShowcaseCard.tsx
// High-Impact Demo Showcase Display replacing the Actuator Matrix during Demo Cycle

"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { 
  Sun, 
  Wind, 
  RotateCw, 
  Activity, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  CheckCircle2, 
  XOctagon, 
  Droplets,
  Waves,
  Sparkles
} from "lucide-react";

interface PhaseConfig {
  step: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  accent: string;
  badgeBg: string;
}

const PHASES: Record<number, PhaseConfig> = {
  1: {
    step: 1,
    title: "Sunlight & Air",
    subtitle: "Dual photosynthetic light spectrum and sparging aeration activated.",
    icon: Sun,
    accent: "text-amber-400",
    badgeBg: "bg-amber-400/10 border-amber-400/30 text-amber-300"
  },
  2: {
    step: 2,
    title: "Cooling Fan",
    subtitle: "Centrifugal exhaust fan balancing bioreactor core temperature.",
    icon: Wind,
    accent: "text-cyan-400",
    badgeBg: "bg-cyan-400/10 border-cyan-400/30 text-cyan-300"
  },
  3: {
    step: 3,
    title: "Mixing Water",
    subtitle: "Magnetic agitation active for homogeneous nutrient circulation.",
    icon: RotateCw,
    accent: "text-indigo-400",
    badgeBg: "bg-indigo-400/10 border-indigo-400/30 text-indigo-300"
  },
  4: {
    step: 4,
    title: "Algae Health Check",
    subtitle: "Multi-spectral optical scan measuring biomass density & Chlorophyll-a.",
    icon: Activity,
    accent: "text-emerald-400",
    badgeBg: "bg-emerald-400/10 border-emerald-400/30 text-emerald-300"
  },
  5: {
    step: 5,
    title: "Harvesting (10% Drain)",
    subtitle: "Precision 10% culture extraction via high-flow peristaltic drain pump.",
    icon: ArrowDownCircle,
    accent: "text-rose-400",
    badgeBg: "bg-rose-400/10 border-rose-400/30 text-rose-300"
  },
  6: {
    step: 6,
    title: "Refilling Tank",
    subtitle: "Fresh medium intake pump replenishing reservoir back to starting level.",
    icon: ArrowUpCircle,
    accent: "text-blue-400",
    badgeBg: "bg-blue-400/10 border-blue-400/30 text-blue-300"
  },
  7: {
    step: 7,
    title: "Demo Complete",
    subtitle: "Routine finished successfully. Reservoir depth restored to baseline.",
    icon: CheckCircle2,
    accent: "text-emerald-400",
    badgeBg: "bg-emerald-400/10 border-emerald-400/30 text-emerald-300"
  }
};

export function DemoShowcaseCard() {
  const { telemetry, fsm, sendActionCommand } = useStore();

  const currentStep = telemetry.demoStep || 1;
  const phase = PHASES[currentStep] || PHASES[1];
  const PhaseIcon = phase.icon;

  const od = telemetry.pseudoOd || 0.74;
  const chlA = telemetry.chlAUgl || 295;
  const waterLevel = telemetry.reservoirVolume || 61;
  const rawDist = telemetry.rawDistanceCm || 17;

  return (
    <div className="col-span-2 md:col-span-3 lg:col-span-2 lg:row-span-2 bg-surface-container-lowest border-2 border-primary/40 flex flex-col motion-card min-h-[380px] font-clash shadow-2xl p-5 rounded-2xl relative overflow-hidden backdrop-blur-md transition-all duration-300">
      
      {/* Background Ambient Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex justify-between items-center mb-3 z-10">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-primary/20 text-primary border border-primary/30 animate-pulse">
            <Sparkles className="w-3 h-3 text-primary" />
            DEMO SHOWCASE
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant">
            Live Lifecycle
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-surface-container border border-outline-variant/60 text-on-surface">
            STAGE {Math.min(currentStep, 6)} / 6
          </span>
          <button
            onClick={() => sendActionCommand("stop_all")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition-all hover:scale-105 cursor-pointer"
            title="Emergency Abort Demo Cycle"
          >
            <XOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>Abort</span>
          </button>
        </div>
      </div>

      {/* 6-Step Visual Stepper Progress Bar */}
      <div className="grid grid-cols-6 gap-1.5 mb-4 z-10">
        {[1, 2, 3, 4, 5, 6].map((stepNum) => {
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div
              key={stepNum}
              className={`h-2 rounded-full transition-all duration-500 ${
                isDone
                  ? "bg-primary shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                  : isCurrent
                  ? "bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                  : "bg-surface-container border border-outline-variant/30"
              }`}
              title={`Stage ${stepNum}: ${PHASES[stepNum]?.title}`}
            />
          );
        })}
      </div>

      {/* Hero Active Stage Section with Big, Clean Fonts */}
      <div className="flex-1 flex flex-col justify-center my-1 p-4 rounded-xl bg-surface-container/40 border border-outline-variant/40 z-10 relative">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2.5 rounded-xl border ${phase.badgeBg} shadow-inner`}>
            <PhaseIcon className={`w-6 h-6 ${phase.accent} animate-bounce`} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-on-surface-variant uppercase">
              Current Stage
            </span>
            <h2 className="text-2xl md:text-[28px] font-black text-on-surface font-clash tracking-tight leading-tight">
              {phase.title}
            </h2>
          </div>
        </div>

        <p className="text-[13px] text-on-surface-variant font-satoshi leading-relaxed pl-1">
          {phase.subtitle}
        </p>

        {/* Phase-Specific Live Scientific Metrics */}
        {currentStep === 4 && (
          <div className="mt-3 grid grid-cols-3 gap-2 bg-surface-container-high/60 p-2.5 rounded-lg border border-outline-variant/40 text-center font-mono">
            <div>
              <span className="text-[9px] text-on-surface-variant uppercase block">Optical Density</span>
              <strong className="text-xs text-emerald-400 font-bold">{od.toFixed(2)} OD</strong>
            </div>
            <div>
              <span className="text-[9px] text-on-surface-variant uppercase block">Chlorophyll-a</span>
              <strong className="text-xs text-teal-400 font-bold">{chlA.toFixed(0)} µg/L</strong>
            </div>
            <div>
              <span className="text-[9px] text-on-surface-variant uppercase block">Water Temp</span>
              <strong className="text-xs text-cyan-400 font-bold">{telemetry.waterTemp}°C</strong>
            </div>
          </div>
        )}

        {(currentStep === 5 || currentStep === 6) && (
          <div className="mt-3 flex items-center justify-between bg-surface-container-high/60 px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs">
            <span className="flex items-center gap-1.5 text-on-surface-variant">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <span>Fluid Column:</span>
              <strong className="text-on-surface">{waterLevel}% ({rawDist} cm)</strong>
            </span>
            <span className="text-[11px] font-semibold text-primary">
              {currentStep === 5 ? "Draining 10% volume..." : "Restoring starting level..."}
            </span>
          </div>
        )}
      </div>

      {/* Active Actuator Relays Deck */}
      <div className="mt-3 z-10">
        <div className="flex justify-between items-center mb-1.5 text-[10px] font-mono text-on-surface-variant">
          <span>RELAY ACTUATORS</span>
          <span className="flex items-center gap-1">
            <Waves className="w-3 h-3 text-primary animate-pulse" />
            Hardware Synchronized
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          <ActuatorPill label="Light" active={fsm.ledPanels} activeColor="bg-amber-400 text-black border-amber-300" />
          <ActuatorPill label="Air" active={fsm.airCompressor} activeColor="bg-cyan-400 text-black border-cyan-300" />
          <ActuatorPill label="Fan" active={fsm.exhaustFan} activeColor="bg-teal-400 text-black border-teal-300" />
          <ActuatorPill label="Agitator" active={fsm.agitator} activeColor="bg-indigo-400 text-black border-indigo-300" />
          <ActuatorPill label="Drain" active={fsm.outletPump} activeColor="bg-rose-400 text-black border-rose-300" />
          <ActuatorPill label="Intake" active={fsm.inletPump} activeColor="bg-blue-400 text-black border-blue-300" />
        </div>
      </div>

    </div>
  );
}

function ActuatorPill({
  label,
  active,
  activeColor
}: {
  label: string;
  active: boolean;
  activeColor: string;
}) {
  return (
    <div
      className={`flex items-center justify-center py-1.5 px-2 rounded-lg text-[10px] font-bold font-mono transition-all duration-300 border ${
        active
          ? `${activeColor} shadow-md scale-105 font-extrabold`
          : "bg-surface-container text-on-surface-variant/60 border-outline-variant/30"
      }`}
    >
      <span className="truncate">{label}</span>
    </div>
  );
}
