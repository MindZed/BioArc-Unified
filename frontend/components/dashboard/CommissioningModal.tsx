// components/dashboard/CommissioningModal.tsx
// Modal for cold-start and standby commissioning fill authorization with Dev Mode bypass

"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { Droplets, ShieldCheck, Wrench, X } from "lucide-react";

export function CommissioningModal() {
  const { fsmCurrentState, sendActionCommand } = useStore();
  const [isDismissed, setIsDismissed] = useState(false);

  const isAwaiting = fsmCurrentState === 'AWAIT' || fsmCurrentState === 'AWAITING_COMMISSION';

  if (!isAwaiting || isDismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 shadow-2xl max-w-md w-full relative">
        
        {/* Dismiss / Close Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
          title="Dismiss to Dashboard (View Only)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 text-primary mb-3 pr-8">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Droplets className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-clash text-on-surface">Bioreactor Commissioning</h2>
            <p className="text-[11px] text-on-surface-variant font-mono">Standby • Ultrasonic Level Verified</p>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant mb-5 font-satoshi leading-relaxed">
          The reactor is currently halted in standby. Select a target liquid commissioning volume to prime the culture and engage the automated FSM, or enter Dev Mode for manual bench testing.
        </p>

        {/* Automated Fill Actions */}
        <div className="space-y-2.5">
          <button
            onClick={() => {
              sendActionCommand('set_fill_100').then(() => sendActionCommand('fill'));
            }}
            className="w-full py-3 px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold border border-primary/30 transition-all flex items-center justify-between group cursor-pointer"
          >
            <span className="font-clash text-sm">Full Volume (100% • 7.0L)</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary text-black font-extrabold uppercase">Recommended</span>
          </button>

          <button
            onClick={() => {
              sendActionCommand('set_fill_50').then(() => sendActionCommand('fill'));
            }}
            className="w-full py-3 px-4 bg-surface-container hover:bg-surface-variant text-on-surface rounded-xl font-semibold border border-outline-variant/60 transition-all flex items-center justify-between cursor-pointer"
          >
            <span className="font-clash text-sm">Partial Volume (50% • 3.5L)</span>
            <span className="text-[10px] font-mono text-on-surface-variant">Batch Fill</span>
          </button>

          <button
            onClick={() => {
              sendActionCommand('set_fill_20').then(() => sendActionCommand('fill'));
            }}
            className="w-full py-3 px-4 bg-surface-container hover:bg-surface-variant text-on-surface rounded-xl font-semibold border border-outline-variant/60 transition-all flex items-center justify-between cursor-pointer"
          >
            <span className="font-clash text-sm">Starter Inoculum (20% • 1.4L)</span>
            <span className="text-[10px] font-mono text-on-surface-variant">Low Volume</span>
          </button>
        </div>

        {/* Dev Mode Bench Access Bypass */}
        <div className="pt-3 border-t border-outline-variant/40 mt-3.5">
          <button
            onClick={async () => {
              await sendActionCommand('dev_mode_on');
              setIsDismissed(true);
            }}
            className="w-full py-2.5 px-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl font-bold border border-amber-500/30 transition-all flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 group-hover:rotate-45 transition-transform duration-200">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="font-clash text-xs block text-amber-200">Enter Development Mode</span>
                <span className="text-[10px] text-amber-300/70 font-mono">Bypass auto-fill • Direct actuator bench testing</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500 text-black font-extrabold uppercase shrink-0">
              Dev Access
            </span>
          </button>
        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Admin Authorized
          </span>
          <span>Intake Pump Safe Prime</span>
        </div>
      </div>
    </div>
  );
}
