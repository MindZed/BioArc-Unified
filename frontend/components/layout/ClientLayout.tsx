// components/layout/ClientLayout.tsx
// This file will be used to handle the layout of the application

"use client";

import { useStore } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { useEffect, useState } from "react";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import { motion, AnimatePresence } from "framer-motion";

function BioArcLoader() {
  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-[#0A0A0B] flex flex-col items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Outer glow ring */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute w-24 h-24 rounded-full border-2 border-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute w-20 h-20 rounded-full border border-emerald-500/10" />
        
        {/* Spinning arc */}
        <svg className="w-20 h-20 animate-spin" style={{ animationDuration: '1.5s' }} viewBox="0 0 50 50">
          <circle
            cx="25" cy="25" r="20"
            fill="none"
            stroke="url(#loaderGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="80 50"
          />
          <defs>
            <linearGradient id="loaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#0A0A0B" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center logo */}
        <div className="absolute w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-black text-lg shadow-[0_0_25px_rgba(16,185,129,0.4)]">
          B
        </div>
      </div>

      {/* Text */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-white tracking-tight mb-1">BioArc</h2>
        <p className="text-[11px] text-zinc-500 uppercase tracking-[0.3em]">Initializing Systems</p>
      </motion.div>

      {/* Subtle bottom bar */}
      <div className="absolute bottom-8 w-48 h-[2px] bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0 rounded-full"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: "50%" }}
        />
      </div>
    </motion.div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarCollapsed } = useStore();
  const [mounted, setMounted] = useState(false);

  // Establish live WebSocket connection to Go Backend
  useWebSocket();

  useEffect(() => {
    // Small delay to let the loader animation play
    const timer = setTimeout(() => setMounted(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Avoid hydration mismatch by waiting for mount to apply dynamic classes based on store
  const marginLeftClass = !mounted ? "ml-[64px]" : (isSidebarCollapsed ? "ml-[64px]" : "ml-[280px]");

  return (
    <>
      <AnimatePresence mode="wait">
        {!mounted && <BioArcLoader key="loader" />}
      </AnimatePresence>
      
      <div className={`flex overflow-hidden w-full h-full transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <Sidebar />
        <main className={`max-md:ml-0 ${marginLeftClass} flex-1 flex flex-col h-[100dvh] overflow-y-auto bg-surface-container-low transition-all duration-300 ease-in-out w-full`}>
          {children}
        </main>
      </div>
    </>
  );
}
