// components/dashboard/ActuatorMatrixCard.tsx
// Tactile 6-relay Actuator Deck with Dev Mode & Admin Safeguards

"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { useSession } from "next-auth/react";
import { ShieldAlert, Wrench, Timer, Droplet, Lock, LockOpen, OctagonAlert, Monitor } from "lucide-react";

export function ActuatorMatrixCard() {
  const { fsm, fsmCurrentState, sendActionCommand, telemetry } = useStore();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const isManual = fsmCurrentState === 'MANUAL' || fsmCurrentState === 'DEV' || fsm.devMode;
  const isDevActive = fsm.devMode || fsmCurrentState === 'DEV';
  const activeCount = Object.values(fsm).filter(v => v === true).length;

  return (
    <div className="col-span-2 md:col-span-3 lg:col-span-2 lg:row-span-2 bg-surface-container-lowest border border-outline-variant flex flex-col motion-card min-h-[380px] font-clash shadow-md p-4 rounded-2xl opacity-0 hover:border-outline/50 transition-colors duration-300 relative overflow-hidden">
      
      {/* Admin Access Lock Overlay (Bypassed if Dev Mode was activated) */}
      {!isAdmin && !isDevActive && (
        <div className="absolute inset-0 z-20 bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
          <div className="w-12 h-12 rounded-full bg-error/10 border border-error/20 flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6 text-error" />
          </div>
          <h4 className="text-sm font-bold text-on-surface">Admin Access Required</h4>
          <p className="text-[11px] text-on-surface-variant font-satoshi mt-1 max-w-[200px]">
            Hardware actuator toggles and Dev Bench controls are locked for operator safety.
          </p>
        </div>
      )}

      {/* Card Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">
            Actuator Matrix
          </h3>
          {isDevActive && (
            <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
              DEV BENCH
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant font-mono">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>{activeCount} Active</span>
        </div>
      </div>

      {/* Actuator Relay Items Grid */}
      <ul className={`flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1.5 ${!isAdmin && !isDevActive ? 'opacity-20 pointer-events-none' : ''}`}>
        <ActuatorRow
          name="Inlet Pump"
          icon="water_drop"
          active={fsm.inletPump}
          isInteractive={isManual}
          onClick={() => sendActionCommand(fsm.inletPump ? 'intake_off' : 'intake_on')}
        />
        <ActuatorRow
          name="Outlet Pump"
          icon="valve"
          active={fsm.outletPump}
          isInteractive={isManual}
          onClick={() => sendActionCommand(fsm.outletPump ? 'outtake_off' : 'outtake_on')}
        />
        <ActuatorRow
          name="Air Compressor"
          icon="air"
          active={fsm.airCompressor}
          isInteractive={isManual}
          onClick={() => sendActionCommand(fsm.airCompressor ? 'air_off' : 'air_on')}
        />
        <ActuatorRow
          name="Grow Light Panels"
          icon="light_mode"
          active={fsm.ledPanels}
          isInteractive={isManual}
          onClick={() => sendActionCommand(fsm.ledPanels ? 'light_off' : 'light_on')}
        />
        <ActuatorRow
          name="Agitator Motor"
          icon="cyclone"
          active={fsm.agitator}
          isInteractive={isManual}
          onClick={() => sendActionCommand(fsm.agitator ? 'agitator_off' : 'agitator_on')}
        />
        <ActuatorRow
          name="12V Exhaust Fan"
          icon="mode_fan"
          active={fsm.exhaustFan}
          isInteractive={isManual}
          onClick={() => sendActionCommand(fsm.exhaustFan ? 'fan_off' : 'fan_on')}
        />
      </ul>

      {/* Action Footers */}
      {(isAdmin || isDevActive) && (
        <div className="mt-3 pt-3 border-t border-outline-variant/50 flex flex-col gap-2">
          
          {/* Commissioning Fill Button (When Standby) */}
          {(fsmCurrentState === 'AWAIT' || fsmCurrentState === 'AWAITING_COMMISSION') && (
            <button
              onClick={() => sendActionCommand('fill')}
              className="w-full py-2.5 rounded-xl text-[11px] font-bold tracking-wider uppercase bg-emerald-500 hover:bg-emerald-600 text-white shadow-md flex items-center justify-center gap-2 animate-pulse transition-all cursor-pointer"
            >
              <Droplet className="w-4 h-4" />
              Start Commissioning Fill
            </button>
          )}

          {/* Dev Mode & Manual Override Toggles */}
          <div className="flex gap-1.5">
            <button
              onClick={() => sendActionCommand(isDevActive ? 'dev_mode_off' : 'dev_mode_on')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                isDevActive
                  ? 'bg-amber-500 text-black shadow-md font-extrabold'
                  : 'bg-surface-container hover:bg-surface-variant text-on-surface-variant border border-outline-variant/40'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              {isDevActive ? 'Dev Mode: ACTIVE' : 'Enable Dev Mode'}
            </button>

            <button
              onClick={() => sendActionCommand(fsmCurrentState === 'MANUAL' ? 'manual_mode_off' : 'manual_mode_on')}
              className={`py-1.5 px-3 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer ${
                fsmCurrentState === 'MANUAL'
                  ? 'bg-primary text-on-primary shadow-sm hover:bg-primary/90'
                  : 'bg-surface-container hover:bg-surface-variant text-on-surface-variant border border-outline-variant/40'
              }`}
              title="Toggle manual override state"
            >
              {fsmCurrentState === 'MANUAL' ? <LockOpen className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {fsmCurrentState === 'MANUAL' ? 'Manual' : 'Auto'}
            </button>
          </div>

          {/* OLED Showcase (Always-On) vs Burn-in Auto-Sleep Toggle */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-container/60 border border-outline-variant/30 text-[10px]">
            <div className="flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-satoshi text-on-surface-variant font-medium">OLED Display Shield</span>
            </div>
            <button
              onClick={() => sendActionCommand(telemetry.oledAlwaysOn ? 'oled_auto_sleep' : 'oled_always_on')}
              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                telemetry.oledAlwaysOn
                  ? 'bg-amber-500 text-black shadow-sm font-extrabold'
                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
              title={telemetry.oledAlwaysOn ? "Click to enable 2-min auto-sleep (prevents pixel burn-in)" : "Click to keep OLED lit continuously for showcase"}
            >
              {telemetry.oledAlwaysOn ? 'SHOWCASE: ALWAYS ON' : 'AUTO-SLEEP (2M)'}
            </button>
          </div>

          {/* Dev Bench Quick Jog Tools: Inlet 5s, Outlet 5s, Halt All */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => sendActionCommand('pulse_intake')}
              className="py-1.5 px-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-surface-container hover:bg-surface-variant text-on-surface-variant border border-outline-variant/40 flex items-center justify-center gap-1 cursor-pointer transition-colors"
              title="Prime inlet pump for 5 seconds"
            >
              <Timer className="w-3 h-3 text-cyan-400" />
              Inlet 5s
            </button>

            <button
              onClick={() => sendActionCommand('pulse_outtake')}
              className="py-1.5 px-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-surface-container hover:bg-surface-variant text-on-surface-variant border border-outline-variant/40 flex items-center justify-center gap-1 cursor-pointer transition-colors"
              title="Pulse harvest outlet pump for 5 seconds"
            >
              <Timer className="w-3 h-3 text-amber-400" />
              Outlet 5s
            </button>

            <button
              onClick={() => sendActionCommand('stop_all')}
              className="py-1.5 px-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-error/15 hover:bg-error/25 text-error border border-error/30 flex items-center justify-center gap-1 cursor-pointer transition-colors"
              title="Halt all actuators immediately"
            >
              <OctagonAlert className="w-3 h-3 text-error" />
              Halt All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActuatorRow({
  name,
  icon,
  active,
  isInteractive,
  onClick
}: {
  name: string;
  icon: string;
  active: boolean;
  isInteractive: boolean;
  onClick: () => void;
}) {
  return (
    <li
      onClick={isInteractive ? onClick : undefined}
      className={`flex items-center justify-between p-2 rounded-xl transition-all duration-200 select-none ${
        isInteractive
          ? 'hover:bg-primary/10 cursor-pointer border border-primary/20 hover:border-primary/40'
          : 'hover:bg-surface-container/50 cursor-default border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
          active ? 'bg-primary/20 text-primary shadow-sm' : 'bg-surface-container text-on-surface-variant'
        }`}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </div>
        <span className="text-[13px] text-on-surface font-medium">{name}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-primary animate-pulse' : 'bg-surface-container-high'}`} />
          <span className={`text-[10px] font-semibold font-mono ${active ? 'text-primary' : 'text-on-surface-variant'}`}>
            {active ? 'RUNNING' : 'IDLE'}
          </span>
        </div>

        {isInteractive && (
          <div className="ml-1.5">
            <div className={`w-7 h-3.5 rounded-full flex items-center p-0.5 transition-colors duration-200 ${
              active ? 'bg-primary' : 'bg-surface-container-highest'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform duration-200 ${
                active ? 'translate-x-3' : 'translate-x-0'
              }`} />
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
