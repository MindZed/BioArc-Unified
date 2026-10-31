// components/dashboard/CommissioningModal.tsx
// Modal for cold-start and standby commissioning fill authorization

"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { Droplets, ShieldCheck, X } from "lucide-react";

export function CommissioningModal() {
  const { fsmCurrentState, sendActionCommand } = useStore();

  const isAwaiting = fsmCurrentState === 'AWAIT' || fsmCurrentState === 'AWAITING_COMMISSION';

  if (!isAwaiting) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 shadow-2xl max-w-md w-full relative">
        <div className="flex items-center gap-3 text-primary mb-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Droplets className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-clash text-on-surface">Bioreactor Commissioning</h2>
            <p className="text-[11px] text-on-surface-variant font-mono">Standby • Ultrasonic Level Verified</p>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant mb-6 font-satoshi leading-relaxed">
          The reactor is currently halted in standby. Select a target liquid commissioning volume to prime the culture and engage the automated FSM.
        </p>

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
