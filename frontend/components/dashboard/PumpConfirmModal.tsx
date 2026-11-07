// components/dashboard/PumpConfirmModal.tsx
// High-Reliability Confirmation Dialog for Dangerous Hydraulic Actuators (Inlet & Outlet Pumps)

"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { 
  AlertTriangle, 
  Droplets, 
  OctagonAlert, 
  X, 
  ArrowRight, 
  Check, 
  Loader2, 
  ShieldAlert, 
  Gauge, 
  Waves
} from "lucide-react";

export function PumpConfirmModal() {
  const { 
    pumpConfirmModal, 
    closePumpConfirmModal, 
    confirmPumpAction, 
    telemetry, 
    fsm 
  } = useStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pumpConfirmModal) {
        closePumpConfirmModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pumpConfirmModal, closePumpConfirmModal]);

  if (!pumpConfirmModal) return null;

  const isOutlet = pumpConfirmModal.pump === "outlet";
  const isJog = !!pumpConfirmModal.isJog;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await confirmPumpAction();
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = pumpConfirmModal.title || (
    isOutlet 
      ? (isJog ? "Pulse Outlet Pump (5s Jog)" : "Turn ON Outlet Pump (Drain)") 
      : (isJog ? "Pulse Inlet Pump (5s Jog)" : "Turn ON Inlet Pump (Fill)")
  );

  const description = pumpConfirmModal.description || (
    isOutlet
      ? "CRITICAL SAFETY WARNING: Turning on the outlet drain pump will actively discharge liquid from the bioreactor chamber. Ensure drain tubing is secure in a waste or harvest collection container to prevent running the vessel completely dry."
      : "HYDRAULIC CAUTION: Turning on the inlet pump will actively pump fresh liquid into the bioreactor chamber. Ensure the fluid supply line is connected and monitor water depth to avoid tank overflow."
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closePumpConfirmModal}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`relative w-full max-w-md bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-black border-2 rounded-2xl shadow-2xl p-6 font-clash overflow-hidden z-10 ${
            isOutlet 
              ? "border-rose-500/60 shadow-[0_0_50px_rgba(244,63,94,0.25)]" 
              : "border-cyan-500/60 shadow-[0_0_50px_rgba(6,182,212,0.25)]"
          }`}
        >
          {/* Ambient Top Glow */}
          <div 
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl pointer-events-none opacity-40 ${
              isOutlet ? "bg-rose-500" : "bg-cyan-500"
            }`} 
          />

          {/* Close Button */}
          <button
            onClick={closePumpConfirmModal}
            disabled={isSubmitting}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="flex items-start gap-3.5 mb-4">
            <div 
              className={`p-3 rounded-2xl border flex items-center justify-center shrink-0 ${
                isOutlet
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                  : "bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              }`}
            >
              {isOutlet ? (
                <OctagonAlert className="w-7 h-7 animate-pulse text-rose-500" />
              ) : (
                <Droplets className="w-7 h-7 animate-bounce text-cyan-400" />
              )}
            </div>

            <div className="flex-1 pr-6">
              <span 
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase mb-1 border ${
                  isOutlet 
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30" 
                    : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                {isOutlet ? "DESTRUCTIVE DRAIN ACTION" : "HYDRAULIC FILL ACTION"}
              </span>

              <h3 className="text-xl font-bold text-white tracking-tight leading-tight">
                {title}
              </h3>
            </div>
          </div>

          {/* Description Warning Body */}
          <p className="text-xs text-zinc-300 font-satoshi leading-relaxed mb-4 pl-1">
            {description}
          </p>

          {/* Live Vessel Depth Telemetry Box */}
          <div className="bg-black/50 border border-white/10 rounded-xl p-3 mb-5 font-mono text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-primary" />
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Current Fluid Column</span>
                <strong className="text-white font-bold text-sm">
                  {telemetry.reservoirVolume}% ({telemetry.rawDistanceCm} cm)
                </strong>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-zinc-400 block uppercase">Hardware Mode</span>
              <span className="text-xs font-semibold text-amber-400">
                {fsm.devMode ? "DEV BENCH" : "MANUAL OVERRIDE"}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={closePumpConfirmModal}
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold font-clash tracking-wider uppercase bg-surface-container hover:bg-surface-variant text-zinc-300 border border-outline-variant/60 transition-colors flex items-center justify-center cursor-pointer"
            >
              Cancel (Esc)
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold font-clash tracking-wider uppercase text-white shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isOutlet
                  ? "bg-rose-600 hover:bg-rose-500 hover:scale-[1.02] shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                  : "bg-cyan-600 hover:bg-cyan-500 hover:scale-[1.02] shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isJog ? "Confirm Jog" : isOutlet ? "Turn ON Outlet" : "Turn ON Inlet"}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
