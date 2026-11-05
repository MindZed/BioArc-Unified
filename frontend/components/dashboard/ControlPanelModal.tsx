// components/dashboard/ControlPanelModal.tsx
// Admin Control Panel & Device Hardware Configuration Modal

"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { useSession } from "next-auth/react";
import { Settings, X, Lock, AlertOctagon, RotateCw, Play, ShieldAlert, Timer, Activity } from "lucide-react";

interface ControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ControlPanelModal({ isOpen, onClose }: ControlPanelModalProps) {
  const { sendActionCommand, sendConfigCommand, openAdminAuthModal } = useStore();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [configForm, setConfigForm] = useState({
    light_on: 6,
    light_off: 18,
    en_lights: true,
    en_air: true,
    en_agitator: true,
    en_refill: true,
    fill_pct: 100,
    color_mode: 0
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface font-clash">System Control Panel</h2>
              <p className="text-[11px] text-on-surface-variant font-mono">Hardware Overrides & Schedule Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-variant rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isAdmin ? (
          <div className="p-12 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-error/10 border border-error/20 rounded-full flex items-center justify-center mb-2">
              <Lock className="w-8 h-8 text-error" />
            </div>
            <div>
              <h3 className="font-clash text-xl font-semibold text-on-surface">Admin Authorization Required</h3>
              <p className="text-on-surface-variant font-satoshi text-sm mt-2 max-w-md">
                You must be authenticated with administrative privileges to execute hardware overrides and configure schedule parameters.
              </p>
            </div>
            <button
              onClick={() => openAdminAuthModal()}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold font-clash uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Unlock with Admin Password
            </button>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Quick Hardware Actions */}
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 font-mono">
                Hardware Actions
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => sendActionCommand('pulse_intake')}
                  className="py-2.5 px-3 bg-surface-container hover:bg-surface-variant rounded-xl text-xs font-semibold border border-outline-variant/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Timer className="w-3.5 h-3.5 text-cyan-400" /> Jog Inlet (5s)
                </button>
                <button
                  onClick={() => sendActionCommand('pulse_outtake')}
                  className="py-2.5 px-3 bg-surface-container hover:bg-surface-variant rounded-xl text-xs font-semibold border border-outline-variant/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Timer className="w-3.5 h-3.5 text-amber-400" /> Jog Outlet (5s)
                </button>
                <button
                  onClick={() => sendActionCommand('drain_all')}
                  className="py-2.5 px-3 bg-surface-container hover:bg-surface-variant rounded-xl text-xs font-semibold border border-outline-variant/60 transition-colors cursor-pointer"
                >
                  Drain All (Outtake)
                </button>
                <button
                  onClick={() => sendActionCommand('drain_partial')}
                  className="py-2.5 px-3 bg-surface-container hover:bg-surface-variant rounded-xl text-xs font-semibold border border-outline-variant/60 transition-colors cursor-pointer"
                >
                  Drain Partial
                </button>
                <button
                  onClick={() => sendActionCommand('agitate')}
                  className="py-2.5 px-3 bg-surface-container hover:bg-surface-variant rounded-xl text-xs font-semibold border border-outline-variant/60 transition-colors cursor-pointer"
                >
                  Agitate (60s)
                </button>
                <button
                  onClick={() => sendActionCommand('color_sample')}
                  className="py-2.5 px-3 bg-secondary-fixed/15 hover:bg-secondary-fixed/25 text-secondary-fixed rounded-xl text-xs font-bold border border-secondary/30 transition-colors cursor-pointer"
                >
                  Sample Color (30s)
                </button>
                <button
                  onClick={() => sendActionCommand('diagnose')}
                  className="py-2.5 px-3 bg-surface-container hover:bg-surface-variant rounded-xl text-xs font-semibold border border-outline-variant/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-teal-400" /> Pre-Flight Diag
                </button>
                <button
                  onClick={() => sendActionCommand('clear_hazard')}
                  className="py-2.5 px-3 bg-surface-container hover:bg-surface-variant rounded-xl text-xs font-semibold border border-outline-variant/60 transition-colors cursor-pointer"
                >
                  Clear Hazard
                </button>
                <button
                  onClick={() => sendActionCommand('stop_all')}
                  className="py-2.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Stop All Relays
                </button>
                <button
                  onClick={() => sendActionCommand('restart')}
                  className="py-2.5 px-3 bg-surface-container hover:bg-surface-variant rounded-xl text-xs font-semibold border border-outline-variant/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" /> Restart ESP32
                </button>
                <button
                  onClick={() => sendActionCommand('demo_cycle')}
                  className="py-2.5 px-3 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl text-xs font-bold border border-primary/30 transition-colors col-span-2 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" /> Run Demo Cycle
                </button>
                <button
                  onClick={() => sendActionCommand('emergency_stop')}
                  className="py-2.5 px-3 bg-error/15 hover:bg-error/25 text-error rounded-xl text-xs font-bold border border-error/30 transition-colors col-span-2 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertOctagon className="w-4 h-4" /> EMERGENCY STOP
                </button>
              </div>
            </div>

            {/* Device Automated Parameters */}
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 font-mono">
                Automation Schedule
              </h3>
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-on-surface-variant mb-1">Light On (Hour)</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={configForm.light_on}
                      onChange={e => setConfigForm({...configForm, light_on: parseInt(e.target.value) || 0})}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-sm text-on-surface font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-on-surface-variant mb-1">Light Off (Hour)</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={configForm.light_off}
                      onChange={e => setConfigForm({...configForm, light_off: parseInt(e.target.value) || 0})}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-sm text-on-surface font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-on-surface-variant mb-1">Fill Target (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={configForm.fill_pct}
                    onChange={e => setConfigForm({...configForm, fill_pct: parseInt(e.target.value) || 100})}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-sm text-on-surface font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <label className="flex items-center gap-2 text-xs text-on-surface font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={configForm.en_lights}
                      onChange={e => setConfigForm({...configForm, en_lights: e.target.checked})}
                      className="accent-primary w-4 h-4 cursor-pointer"
                    />
                    Enable Grow Lights
                  </label>
                  <label className="flex items-center gap-2 text-xs text-on-surface font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={configForm.en_air}
                      onChange={e => setConfigForm({...configForm, en_air: e.target.checked})}
                      className="accent-primary w-4 h-4 cursor-pointer"
                    />
                    Enable Aeration
                  </label>
                  <label className="flex items-center gap-2 text-xs text-on-surface font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={configForm.en_agitator}
                      onChange={e => setConfigForm({...configForm, en_agitator: e.target.checked})}
                      className="accent-primary w-4 h-4 cursor-pointer"
                    />
                    Enable Agitation
                  </label>
                  <label className="flex items-center gap-2 text-xs text-on-surface font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={configForm.en_refill}
                      onChange={e => setConfigForm({...configForm, en_refill: e.target.checked})}
                      className="accent-primary w-4 h-4 cursor-pointer"
                    />
                    Auto Refill
                  </label>
                </div>

                <button
                  onClick={() => {
                    sendConfigCommand(configForm);
                    onClose();
                  }}
                  className="w-full mt-3 py-2.5 bg-primary text-black font-bold font-clash text-sm rounded-xl shadow-md hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Deploy Configuration to NVS
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
