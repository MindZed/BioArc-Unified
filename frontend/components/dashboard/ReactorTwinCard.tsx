// components/dashboard/ReactorTwinCard.tsx
// High-density Digital Twin Bioreactor Chamber simulation for the Bento Grid

"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Bot, Sparkles, Wind, Waves, Disc } from "lucide-react";

export function ReactorTwinCard() {
  const { telemetry, fsm, fsmCurrentState, espConnected } = useStore();

  const volumePct = Math.min(100, Math.max(0, telemetry.reservoirVolume ?? 0));
  const rawDist = telemetry.rawDistanceCm ?? 15.0;
  const chla = telemetry.chlAUgl ?? 280;

  // Fluid height in pixels inside a 240px tall chamber
  const chamberHeight = 240;
  const liquidHeightPx = Math.max(16, (volumePct / 100) * chamberHeight);

  // Dynamic fluid color based on biomass/chlorophyll-a concentration
  const fluidGradient = useMemo(() => {
    if (chla < 60) {
      // Dilute / starter culture: clear aquatic teal
      return "linear-gradient(180deg, rgba(45, 212, 191, 0.45) 0%, rgba(13, 148, 136, 0.7) 100%)";
    } else if (chla < 180) {
      // Moderate growth: vibrant lime-emerald
      return "linear-gradient(180deg, rgba(52, 211, 153, 0.6) 0%, rgba(16, 185, 129, 0.8) 100%)";
    } else {
      // Dense stationary culture: deep photosynthetic emerald
      return "linear-gradient(180deg, rgba(16, 185, 129, 0.75) 0%, rgba(4, 120, 87, 0.95) 100%)";
    }
  }, [chla]);

  // Deterministic bubble seeds for the aeration sparger
  const bubbleSeeds = useMemo(() => [
    { id: 1, left: "22%", delay: 0.1, duration: 1.8, size: 4 },
    { id: 2, left: "35%", delay: 0.5, duration: 2.2, size: 5 },
    { id: 3, left: "48%", delay: 0.2, duration: 1.6, size: 3 },
    { id: 4, left: "62%", delay: 0.8, duration: 2.0, size: 6 },
    { id: 5, left: "75%", delay: 0.3, duration: 1.7, size: 4 },
    { id: 6, left: "40%", delay: 1.1, duration: 1.9, size: 5 },
    { id: 7, left: "55%", delay: 1.4, duration: 2.3, size: 3 },
    { id: 8, left: "68%", delay: 0.7, duration: 1.5, size: 4 },
  ], []);

  return (
    <div className="col-span-2 md:col-span-3 lg:col-span-2 lg:row-span-2 bg-surface-container-lowest border border-outline-variant flex flex-col motion-card min-h-[380px] font-clash shadow-md p-4 rounded-2xl opacity-0 hover:border-outline/50 transition-colors duration-300 relative overflow-hidden group">
      
      {/* Grow Light Photosynthetic Ambient Glow */}
      {fsm.ledPanels && (
        <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-600/10 via-purple-600/15 to-transparent pointer-events-none z-0 animate-pulse duration-1000" />
      )}

      {/* Card Header */}
      <div className="flex justify-between items-center mb-2 z-10 w-full">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">
            Bioreactor Twin
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-container font-semibold text-on-surface border border-outline-variant/40">
            {volumePct.toFixed(0)}% • {((volumePct / 100) * 7.0).toFixed(1)}L
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            fsmCurrentState === 'HAZARD' ? 'bg-error/20 text-error animate-pulse' :
            fsmCurrentState === 'AWAIT' || fsmCurrentState === 'AWAITING_COMMISSION' ? 'bg-amber-500/20 text-amber-400' :
            'bg-primary/20 text-primary'
          }`}>
            {espConnected ? fsmCurrentState : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Main Simulation Viewport */}
      <div className="relative flex-1 w-full flex items-center justify-center my-1 z-10 min-h-[280px]">
        
        {/* Lateral LED Grow Light Arrays */}
        <div className="absolute left-3 top-10 bottom-8 flex flex-col justify-around py-4 z-20">
          {[...Array(6)].map((_, i) => (
            <div
              key={`led-l-${i}`}
              className={`w-1.5 h-3 rounded-full transition-all duration-300 ${
                fsm.ledPanels 
                  ? 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.9)] animate-pulse' 
                  : 'bg-surface-container-high'
              }`}
            />
          ))}
        </div>
        <div className="absolute right-3 top-10 bottom-8 flex flex-col justify-around py-4 z-20">
          {[...Array(6)].map((_, i) => (
            <div
              key={`led-r-${i}`}
              className={`w-1.5 h-3 rounded-full transition-all duration-300 ${
                fsm.ledPanels 
                  ? 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.9)] animate-pulse' 
                  : 'bg-surface-container-high'
              }`}
            />
          ))}
        </div>

        {/* Physical Bioreactor Column (Width 160px, Height 260px) */}
        <div className="relative w-40 h-[260px] bg-surface-container/40 border-2 border-outline-variant/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
          
          {/* Glass Vessel Reflection Highlights */}
          <div className="absolute inset-y-0 left-2 w-3 bg-gradient-to-r from-white/10 to-transparent pointer-events-none z-30" />
          <div className="absolute inset-y-0 right-2 w-2 bg-gradient-to-l from-white/5 to-transparent pointer-events-none z-30" />

          {/* Top Headplate Assembly */}
          <div className="relative z-30 w-full h-9 bg-surface-container-high border-b border-outline-variant flex items-center justify-between px-2 shadow-sm">
            
            {/* Water Inlet Port */}
            <div className="relative flex items-center justify-center" title="Inlet Nozzle">
              <span className={`material-symbols-outlined text-[15px] transition-colors ${fsm.inletPump ? 'text-primary' : 'text-on-surface-variant'}`}>
                water_drop
              </span>
              {/* Cascade Inlet Stream */}
              {fsm.inletPump && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 260 - liquidHeightPx - 36, opacity: [0.7, 1, 0.8] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="absolute top-7 left-1.5 w-1 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)] z-20"
                />
              )}
            </div>

            {/* 12V Top Exhaust Fan (GPIO 23) */}
            <div className="relative flex flex-col items-center justify-center" title="12V Exhaust Fan (GPIO 23)">
              {/* Upward Air Exhaust Plumes */}
              {fsm.exhaustFan && (
                <div className="absolute -top-3 flex gap-0.5 items-center justify-center">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={`air-plume-${i}`}
                      animate={{ y: [-2, -8], opacity: [0.9, 0] }}
                      transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.18, ease: "easeOut" }}
                      className="w-0.5 h-2 bg-cyan-300 rounded-full"
                    />
                  ))}
                </div>
              )}
              <motion.div
                animate={fsm.exhaustFan ? { rotate: 360 } : { rotate: 0 }}
                transition={fsm.exhaustFan ? { repeat: Infinity, duration: 0.6, ease: "linear" } : { duration: 0.3 }}
                className={`p-0.5 rounded-full ${fsm.exhaustFan ? 'text-cyan-400 bg-cyan-950/40' : 'text-on-surface-variant'}`}
              >
                <Wind className="w-4 h-4" />
              </motion.div>
            </div>

            {/* Ultrasonic Transducer & Beam */}
            <div className="relative flex items-center justify-center" title={`HC-SR04 Air Gap: ${rawDist.toFixed(1)} cm`}>
              <span className="material-symbols-outlined text-[15px] text-amber-400">
                sensors
              </span>
              {/* Ultrasonic Sonic Pulse Beam */}
              <motion.div
                animate={{ opacity: [0.2, 0.7, 0.2] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="absolute top-7 right-1.5 w-0.5 bg-amber-400/50 dashed-beam z-10"
                style={{ height: Math.max(10, 260 - liquidHeightPx - 36) }}
              />
            </div>
          </div>

          {/* Volume Graduation Scale (Right Edge) */}
          <div className="absolute right-1.5 top-11 bottom-6 flex flex-col justify-between items-end text-[8px] font-mono font-bold text-on-surface-variant/70 pointer-events-none z-30 select-none">
            <span>7L -</span>
            <span>5L -</span>
            <span>3L -</span>
            <span>1L -</span>
          </div>

          {/* Dynamic Fluid Column */}
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out z-10 overflow-hidden"
            style={{
              height: `${liquidHeightPx}px`,
              background: fluidGradient,
              boxShadow: "inset 0 4px 12px rgba(0,0,0,0.3)"
            }}
          >
            {/* Sinusoidal Fluid Wave Surface */}
            <div className="absolute top-0 left-0 right-0 h-3 overflow-hidden">
              <motion.svg
                viewBox="0 0 400 20"
                className="w-[200%] h-full fill-current text-emerald-300/40"
                animate={{ x: [0, -160] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
              >
                <path d="M 0 10 Q 40 0, 80 10 T 160 10 T 240 10 T 320 10 T 400 10 L 400 20 L 0 20 Z" />
              </motion.svg>
            </div>

            {/* Central Agitator Shaft & Dual Impellers */}
            <div className="absolute inset-x-0 top-0 bottom-3 flex flex-col items-center justify-around pointer-events-none z-15">
              {/* Vertical Shaft */}
              <div className="w-1 h-full bg-zinc-400/80 shadow-sm" />
              
              {/* Upper Impeller */}
              <motion.div
                animate={fsm.agitator ? { rotate: [0, 180, 360], scaleX: [1, 0.3, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }}
                className={`absolute top-1/3 w-10 h-1.5 rounded-sm shadow-md transition-colors ${
                  fsm.agitator ? 'bg-amber-300' : 'bg-zinc-300'
                }`}
              />

              {/* Lower Impeller */}
              <motion.div
                animate={fsm.agitator ? { rotate: [0, -180, -360], scaleX: [1, 0.3, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }}
                className={`absolute bottom-6 w-12 h-2 rounded-sm shadow-md transition-colors ${
                  fsm.agitator ? 'bg-amber-300' : 'bg-zinc-300'
                }`}
              />
            </div>

            {/* Micro-Bubbles from Bottom Sparger */}
            {fsm.airCompressor && bubbleSeeds.map((bubble) => (
              <motion.div
                key={`bubble-${bubble.id}`}
                className="absolute bg-white/70 rounded-full pointer-events-none shadow-[0_0_3px_rgba(255,255,255,0.8)]"
                style={{
                  left: bubble.left,
                  bottom: "4px",
                  width: `${bubble.size}px`,
                  height: `${bubble.size}px`,
                }}
                animate={{
                  y: [-4, -liquidHeightPx + 10],
                  x: [0, (bubble.id % 2 === 0 ? 3 : -3), 0],
                  opacity: [0.8, 1, 0.2]
                }}
                transition={{
                  repeat: Infinity,
                  duration: bubble.duration,
                  delay: bubble.delay,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>

          {/* Bottom Aeration Sparger Plate & Drain Nozzle */}
          <div className="relative z-30 w-full h-5 bg-surface-container-high border-t border-outline-variant/60 flex items-center justify-between px-3">
            {/* Bottom Sparger Holes */}
            <div className="flex gap-1 items-center" title="Aeration Sparger">
              {[...Array(5)].map((_, i) => (
                <div
                  key={`sparge-${i}`}
                  className={`w-1 h-1 rounded-full ${fsm.airCompressor ? 'bg-cyan-300 animate-ping' : 'bg-zinc-600'}`}
                />
              ))}
            </div>

            {/* Bottom Drain Port */}
            <div className="relative flex items-center justify-center" title="Drain Valve">
              <span className={`material-symbols-outlined text-[13px] ${fsm.outletPump ? 'text-primary animate-pulse' : 'text-on-surface-variant'}`}>
                valve
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Summary Deck */}
      <div className="w-full mt-2 pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[11px] font-mono text-on-surface-variant z-10">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-on-surface-variant/80">Air Gap:</span>
          <span className="text-on-surface font-semibold">{rawDist.toFixed(1)} cm</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-on-surface-variant/80">Water:</span>
          <span className="text-primary font-semibold">{telemetry.waterTemp}°C</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[10px] uppercase font-bold text-primary">Live</span>
        </div>
      </div>
    </div>
  );
}
