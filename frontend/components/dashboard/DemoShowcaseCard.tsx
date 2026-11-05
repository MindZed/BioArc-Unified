// components/dashboard/DemoShowcaseCard.tsx
// High-Impact Autonomous Screen Kiosk replacing Actuator Matrix during Demo Cycle

"use client";

import React, { useEffect, useState, useRef } from "react";
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
  Sparkles,
  Timer,
  Play
} from "lucide-react";

interface PhaseConfig {
  step: number;
  title: string;
  subtitle: string;
  durationSec: number;
  icon: React.ElementType;
  accent: string;
  badgeBg: string;
  activeRelays: {
    light?: boolean;
    air?: boolean;
    fan?: boolean;
    agitator?: boolean;
    outtake?: boolean;
    intake?: boolean;
  };
}

const PHASES: Record<number, PhaseConfig> = {
  1: {
    step: 1,
    title: "Sunlight & Air",
    subtitle: "Dual photosynthetic light spectrum and sparging aeration activated.",
    durationSec: 6,
    icon: Sun,
    accent: "text-amber-400",
    badgeBg: "bg-amber-400/15 border-amber-400/40 text-amber-300",
    activeRelays: { light: true, air: true }
  },
  2: {
    step: 2,
    title: "Cooling Fan",
    subtitle: "Centrifugal exhaust fan balancing bioreactor core temperature.",
    durationSec: 6,
    icon: Wind,
    accent: "text-cyan-400",
    badgeBg: "bg-cyan-400/15 border-cyan-400/40 text-cyan-300",
    activeRelays: { light: true, air: true, fan: true }
  },
  3: {
    step: 3,
    title: "Mixing Water",
    subtitle: "Magnetic agitation active for homogeneous nutrient circulation.",
    durationSec: 6,
    icon: RotateCw,
    accent: "text-indigo-400",
    badgeBg: "bg-indigo-400/15 border-indigo-400/40 text-indigo-300",
    activeRelays: { light: true, air: true, agitator: true }
  },
  4: {
    step: 4,
    title: "Algae Health Check",
    subtitle: "Multi-spectral optical scan measuring biomass density & Chlorophyll-a.",
    durationSec: 6,
    icon: Activity,
    accent: "text-emerald-400",
    badgeBg: "bg-emerald-400/15 border-emerald-400/40 text-emerald-300",
    activeRelays: { light: true, air: true }
  },
  5: {
    step: 5,
    title: "Harvesting (10% Drain)",
    subtitle: "Precision 10% culture extraction via high-flow peristaltic drain pump.",
    durationSec: 12,
    icon: ArrowDownCircle,
    accent: "text-rose-400",
    badgeBg: "bg-rose-400/15 border-rose-400/40 text-rose-300",
    activeRelays: { outtake: true }
  },
  6: {
    step: 6,
    title: "Refilling Tank",
    subtitle: "Fresh medium intake pump replenishing reservoir back to starting level.",
    durationSec: 12,
    icon: ArrowUpCircle,
    accent: "text-blue-400",
    badgeBg: "bg-blue-400/15 border-blue-400/40 text-blue-300",
    activeRelays: { intake: true }
  },
  7: {
    step: 7,
    title: "Demo Complete",
    subtitle: "Routine finished successfully. Reservoir depth restored to baseline.",
    durationSec: 5,
    icon: CheckCircle2,
    accent: "text-emerald-400",
    badgeBg: "bg-emerald-400/15 border-emerald-400/40 text-emerald-300",
    activeRelays: {}
  }
};

export function DemoShowcaseCard() {
  const { telemetry, fsm, sendActionCommand } = useStore();

  // Screen state machine:
  // step 0 = 5s preparation countdown
  // steps 1..6 = active demo stages
  // step 7 = completed (holds for 5 seconds then reverts to IDLE)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    return telemetry.demoStep !== undefined && telemetry.demoStep > 0 ? telemetry.demoStep : 0;
  });

  const [prepSeconds, setPrepSeconds] = useState<number>(5);
  const [completionSeconds, setCompletionSeconds] = useState<number>(5);
  const [stageProgressPct, setStageProgressPct] = useState<number>(0);

  const stepStartTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with incoming hardware telemetry if hardware is ahead
  useEffect(() => {
    if (telemetry.demoStep && telemetry.demoStep > currentStep && telemetry.demoStep <= 7) {
      setCurrentStep(telemetry.demoStep);
      stepStartTimeRef.current = Date.now();
      setStageProgressPct(0);
    }
  }, [telemetry.demoStep, currentStep]);

  // Main Screen State Machine Runner
  useEffect(() => {
    // Clear any existing timer loop
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    // -----------------------------------------------------------
    // SCENARIO A: PREPARATION COUNTDOWN (5 seconds)
    // -----------------------------------------------------------
    if (currentStep === 0) {
      setPrepSeconds(5);
      const startAt = Date.now();

      timerIntervalRef.current = setInterval(() => {
        const elapsedSec = (Date.now() - startAt) / 1000;
        const remaining = Math.max(0, 5 - Math.floor(elapsedSec));
        setPrepSeconds(remaining);

        if (remaining <= 0) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          // 5s Countdown Finished -> Send command to ESP32 hardware & advance to Stage 1!
          sendActionCommand("demo_cycle");
          setCurrentStep(1);
          stepStartTimeRef.current = Date.now();
          setStageProgressPct(0);
        }
      }, 200);

      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
    }

    // -----------------------------------------------------------
    // SCENARIO B: ACTIVE DEMO STAGES (1 through 6)
    // -----------------------------------------------------------
    if (currentStep >= 1 && currentStep <= 6) {
      const activePhase = PHASES[currentStep];
      const durationSec = activePhase.durationSec;
      stepStartTimeRef.current = Date.now();

      // Optimistically update FSM relay pills on screen
      useStore.setState((state) => ({
        fsm: {
          ...state.fsm,
          ledPanels: !!activePhase.activeRelays.light,
          airCompressor: !!activePhase.activeRelays.air,
          exhaustFan: !!activePhase.activeRelays.fan,
          agitator: !!activePhase.activeRelays.agitator,
          outletPump: !!activePhase.activeRelays.outtake,
          inletPump: !!activePhase.activeRelays.intake,
        },
        telemetry: {
          ...state.telemetry,
          demoStep: currentStep,
          demoPhase: activePhase.title
        }
      }));

      timerIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - stepStartTimeRef.current) / 1000;
        const progress = Math.min(100, (elapsed / durationSec) * 100);
        setStageProgressPct(progress);

        if (elapsed >= durationSec) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          const nextStep = currentStep + 1;
          setCurrentStep(nextStep);
          stepStartTimeRef.current = Date.now();
          setStageProgressPct(0);
        }
      }, 100);

      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
    }

    // -----------------------------------------------------------
    // SCENARIO C: DEMO COMPLETED (5 seconds hold then revert to IDLE)
    // -----------------------------------------------------------
    if (currentStep === 7) {
      setCompletionSeconds(5);
      const startAt = Date.now();

      // Ensure all relays are turned off
      useStore.setState((state) => ({
        fsm: {
          ...state.fsm,
          ledPanels: false,
          airCompressor: false,
          exhaustFan: false,
          agitator: false,
          outletPump: false,
          inletPump: false,
        },
        telemetry: {
          ...state.telemetry,
          demoStep: 7,
          demoPhase: "Demo Complete"
        }
      }));

      timerIntervalRef.current = setInterval(() => {
        const elapsedSec = (Date.now() - startAt) / 1000;
        const remaining = Math.max(0, 5 - Math.floor(elapsedSec));
        setCompletionSeconds(remaining);

        if (remaining <= 0) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          // 5 seconds Completed Display Expired -> Automatically Revert System Back to IDLE!
          sendActionCommand("stop_all");
          useStore.setState((state) => ({
            fsmCurrentState: state.fsm.devMode ? "DEV" : "IDLE",
            telemetry: {
              ...state.telemetry,
              demoMode: false,
              demoStep: 0,
              demoPhase: "IDLE"
            }
          }));
        }
      }, 200);

      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
    }
  }, [currentStep, sendActionCommand]);

  // Handle Emergency Abort
  const handleAbort = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    sendActionCommand("stop_all");
    useStore.setState((state) => ({
      fsmCurrentState: state.fsm.devMode ? "DEV" : "IDLE",
      telemetry: {
        ...state.telemetry,
        demoMode: false,
        demoStep: 0,
        demoPhase: "IDLE"
      }
    }));
  };

  const phase = PHASES[currentStep] || PHASES[1];
  const PhaseIcon = phase.icon;

  const od = telemetry.pseudoOd || 0.74;
  const chlA = telemetry.chlAUgl || 295;
  const waterLevel = telemetry.reservoirVolume || 61;
  const rawDist = telemetry.rawDistanceCm || 17;

  // -----------------------------------------------------------
  // RENDER SCREEN 1: PREPARATION COUNTDOWN (5 SECONDS)
  // -----------------------------------------------------------
  if (currentStep === 0) {
    return (
      <div className="col-span-2 md:col-span-3 lg:col-span-2 lg:row-span-2 bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-black border-2 border-amber-500/50 flex flex-col motion-card min-h-[380px] font-clash shadow-2xl p-6 rounded-2xl relative overflow-hidden backdrop-blur-xl justify-between">
        {/* Animated Radial Backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15)_0%,transparent_70%)] pointer-events-none animate-pulse" />

        {/* Top Header */}
        <div className="flex justify-between items-center z-10">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            SHOWCASE INITIALIZING
          </span>
          <button
            onClick={handleAbort}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-300 text-xs transition-colors cursor-pointer"
          >
            <XOctagon className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>

        {/* Center Countdown Display */}
        <div className="flex flex-col items-center justify-center text-center my-auto z-10">
          <div className="relative flex items-center justify-center w-28 h-28 mb-3">
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping opacity-30" />
            <div className="absolute inset-0 rounded-full border-4 border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.5)]" />
            <span className="text-6xl font-black font-clash text-amber-300 tracking-tight drop-shadow-md">
              {prepSeconds}
            </span>
          </div>

          <h2 className="text-2xl font-black text-white font-clash tracking-tight">
            Preparing Showcase
          </h2>
          <p className="text-xs text-on-surface-variant font-satoshi max-w-[260px] mt-1 leading-relaxed">
            Priming bioreactor sensors and initializing the 6-stage automated lifecycle in {prepSeconds}s...
          </p>
        </div>

        {/* Bottom Progress Bar */}
        <div className="z-10">
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(245,158,11,0.5)]"
              style={{ width: `${((5 - prepSeconds) / 5) * 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant mt-2">
            <span>STARTING SEQUENCE</span>
            <span>{prepSeconds}s REMAINING</span>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // RENDER SCREEN 3: DEMO COMPLETE (5 SECONDS HOLD BEFORE REVERT)
  // -----------------------------------------------------------
  if (currentStep === 7) {
    return (
      <div className="col-span-2 md:col-span-3 lg:col-span-2 lg:row-span-2 bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-black border-2 border-emerald-500/60 flex flex-col motion-card min-h-[380px] font-clash shadow-2xl p-6 rounded-2xl relative overflow-hidden backdrop-blur-xl justify-between">
        {/* Emerald Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.18)_0%,transparent_70%)] pointer-events-none animate-pulse" />

        {/* Top Header */}
        <div className="flex justify-between items-center z-10">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            SHOWCASE FINISHED
          </span>
          <button
            onClick={handleAbort}
            className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-lg bg-white/5 border border-white/10 transition-colors cursor-pointer"
          >
            Dismiss Now
          </button>
        </div>

        {/* Center Success Presentation */}
        <div className="flex flex-col items-center justify-center text-center my-auto z-10">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mb-3 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
          </div>

          <h2 className="text-3xl font-black text-white font-clash tracking-tight">
            Demo Complete
          </h2>
          <p className="text-xs text-emerald-200/90 font-satoshi max-w-[280px] mt-1.5 leading-relaxed">
            All 6 photobioreactor lifecycle stages executed smoothly. Reservoir depth successfully restored.
          </p>

          <div className="mt-4 px-3 py-1.5 rounded-xl bg-surface-container-high/60 border border-white/10 text-xs font-mono text-zinc-300 flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reverting to live control in <strong className="text-white font-bold text-sm">{completionSeconds}s</strong></span>
          </div>
        </div>

        {/* Bottom Time-to-Revert Bar */}
        <div className="z-10">
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(34,197,94,0.5)]"
              style={{ width: `${(completionSeconds / 5) * 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant mt-2">
            <span>RETURNING TO IDLE</span>
            <span>{completionSeconds}s</span>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // RENDER SCREEN 2: ACTIVE STAGES (1 THROUGH 6)
  // -----------------------------------------------------------
  return (
    <div className="col-span-2 md:col-span-3 lg:col-span-2 lg:row-span-2 bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-black border-2 border-primary/50 flex flex-col motion-card min-h-[380px] font-clash shadow-2xl p-5 rounded-2xl relative overflow-hidden backdrop-blur-xl transition-all duration-300 justify-between">
      
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex justify-between items-center z-10 mb-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-primary/20 text-primary border border-primary/40 animate-pulse">
            <Sparkles className="w-3 h-3 text-primary" />
            DEMO SHOWCASE
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant">
            Live Kiosk
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-surface-container border border-outline-variant/60 text-white">
            STAGE {currentStep} / 6
          </span>
          <button
            onClick={handleAbort}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition-all hover:scale-105 cursor-pointer"
            title="Emergency Abort Demo Cycle"
          >
            <XOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>Abort</span>
          </button>
        </div>
      </div>

      {/* 6-Step Visual Stepper Capsules */}
      <div className="grid grid-cols-6 gap-1.5 mb-3 z-10">
        {[1, 2, 3, 4, 5, 6].map((stepNum) => {
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div
              key={stepNum}
              className={`h-2 rounded-full transition-all duration-500 ${
                isDone
                  ? "bg-primary shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                  : isCurrent
                  ? "bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.7)]"
                  : "bg-surface-container border border-outline-variant/30"
              }`}
              title={`Stage ${stepNum}: ${PHASES[stepNum]?.title}`}
            />
          );
        })}
      </div>

      {/* Hero Active Stage Section with BIG, CLEAN CLASH DISPLAY FONTS */}
      <div className="flex-1 flex flex-col justify-center my-auto p-4 rounded-xl bg-surface-container/50 border border-outline-variant/40 z-10 relative shadow-inner">
        <div className="flex items-center gap-3.5 mb-2">
          <div className={`p-3 rounded-xl border ${phase.badgeBg} shadow-md`}>
            <PhaseIcon className={`w-7 h-7 ${phase.accent} animate-bounce`} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-on-surface-variant uppercase block">
              Stage {currentStep} of 6
            </span>
            <h2 className="text-2xl md:text-[28px] font-black text-white font-clash tracking-tight leading-tight drop-shadow-sm">
              {phase.title}
            </h2>
          </div>
        </div>

        <p className="text-[13px] text-zinc-300 font-satoshi leading-relaxed pl-1 mt-1">
          {phase.subtitle}
        </p>

        {/* Phase-Specific Live Scientific Metrics */}
        {currentStep === 4 && (
          <div className="mt-3 grid grid-cols-3 gap-2 bg-black/40 p-2.5 rounded-lg border border-outline-variant/40 text-center font-mono">
            <div>
              <span className="text-[9px] text-zinc-400 uppercase block">Optical Density</span>
              <strong className="text-xs text-emerald-400 font-bold">{od.toFixed(2)} OD</strong>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 uppercase block">Chlorophyll-a</span>
              <strong className="text-xs text-teal-400 font-bold">{chlA.toFixed(0)} µg/L</strong>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 uppercase block">Water Temp</span>
              <strong className="text-xs text-cyan-400 font-bold">{telemetry.waterTemp}°C</strong>
            </div>
          </div>
        )}

        {(currentStep === 5 || currentStep === 6) && (
          <div className="mt-3 flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <span>Fluid Column:</span>
              <strong className="text-white">{waterLevel}% ({rawDist} cm)</strong>
            </span>
            <span className="text-[11px] font-semibold text-primary">
              {currentStep === 5 ? "Draining 10% volume..." : "Restoring starting level..."}
            </span>
          </div>
        )}

        {/* Stage Timer Progress Line */}
        <div className="mt-3.5 w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-primary to-emerald-300 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(34,197,94,0.4)]"
            style={{ width: `${stageProgressPct}%` }}
          />
        </div>
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
