// app/page.tsx
// Dashboard page for the bioreactor

"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { motion, stagger, useAnimate } from "framer-motion";
import { Bot, Leaf, ShieldAlert } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, YAxis } from "recharts";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function Dashboard() {
  const { telemetry, fsm, updateTelemetry, fsmCurrentState, sendActionCommand, sendConfigCommand, isWsConnected, espConnected, maintenanceLogs, handleLiveTelemetry } = useStore();
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [configForm, setConfigForm] = useState({
    light_on: 6, light_off: 18, en_lights: true, en_air: true, en_agitator: true, en_refill: true, fill_pct: 100, color_mode: 0
  });
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const [scope, animate] = useAnimate();
  const [mounted, setMounted] = useState(false);

  const biomassChartData = [
    { time: "4pm (25/7/26)", value: 35 },
    { time: "8pm (25/7/26)", value: 68 },
    { time: "12am (26/7/26)", value: 108 },
    { time: "4am (26/7/26)", value: 152 },
    { time: "8am (26/7/26)", value: 195 },
    { time: "12pm (26/7/26)", value: 240 },
    { time: "Latest", value: telemetry.chlAUgl ?? 280 },
  ];

  const [fsmRuntime, setFsmRuntime] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (fsmCurrentState === 'OFFLINE' || !espConnected) {
       setFsmRuntime(0);
       return;
    }

    let API_URL = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:8080';
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      API_URL = API_URL.replace('http://', 'https://').replace(':8080', '');
    }

    fetch(`${API_URL}/api/logs?limit=100`)
      .then(res => res.json())
      .then((data: any[]) => {
         const targetStr = `State shifted to ${fsmCurrentState}`;
         const found = data.find(l => l.message.includes(targetStr));
         const startTime = found ? new Date(found.timestamp).getTime() : Date.now();
         
         setFsmRuntime(Math.floor((Date.now() - startTime) / 1000));
         timerRef.current = setInterval(() => {
           setFsmRuntime(Math.floor((Date.now() - startTime) / 1000));
         }, 1000);
      })
      .catch(() => {
         // Fallback if fetch fails
         const startTime = Date.now();
         timerRef.current = setInterval(() => {
           setFsmRuntime(Math.floor((Date.now() - startTime) / 1000));
         }, 1000);
      });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fsmCurrentState, espConnected]);

  // Offline Data Fetch
  useEffect(() => {
    if (!espConnected) {
      let API_URL = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:8080';
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        API_URL = API_URL.replace('http://', 'https://').replace(':8080', '');
      }

      fetch(`${API_URL}/api/telemetry/history?hours=24`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const latest = data[0];
            handleLiveTelemetry({
              payload: {
                 ...latest,
                 water_temp: latest.waterTemp,
                 air_temp: latest.airTemp,
                 level_cm: latest.levelCm,
                 relays: {
                   intake: latest.relayIntake,
                   outtake: latest.relayOuttake,
                   air: latest.relayAir,
                   light: latest.relayLight,
                   agitator: latest.relayAgitator,
                 }
              }
            });
          }
        })
        .catch(console.error);
    }
  }, [espConnected, handleLiveTelemetry]);

  // Fetch latest 5 database logs on mount for dashboard
  useEffect(() => {
    fetch('/api/logs?page=1&limit=5')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.logs)) {
          useStore.setState({ maintenanceLogs: data.logs });
        }
      })
      .catch(console.error);
  }, []);

  const formatRuntime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      updateTelemetry();
    }, 2000);
    return () => clearInterval(interval);
  }, [updateTelemetry]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      animate(".motion-card", { opacity: [0, 1], y: [20, 0] }, { delay: stagger(0.1), duration: 0.5, ease: "easeOut" });
    }
  }, [animate, mounted]);

  if (!mounted) return null;

  return (
    <div ref={scope}>
      <style>{`
        @keyframes fillAnimation {
          0% { background-position: 0 0; }
          100% { background-position: 100% 100%; }
        }
      `}</style>
      
      {!espConnected && (
        <div className="bg-error text-white text-center py-2 text-xs font-bold uppercase tracking-widest shadow-md z-50 relative flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[16px]">wifi_off</span>
          ESP32 Offline - Displaying Past Data
        </div>
      )}

      {espConnected && fsmCurrentState === 'HAZARD' && (
        <div className="bg-error/10 text-error text-center py-1.5 text-[11px] font-bold uppercase tracking-widest border-b border-error/20 z-40 relative flex items-center justify-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-[16px] animate-pulse">warning</span>
          Hazard State Active — System Halted
        </div>
      )}
      
      {!isWsConnected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
          <div className="flex flex-col items-center bg-surface-container-low p-8 rounded-2xl shadow-2xl border border-outline-variant/50 max-w-sm w-full mx-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-bold font-clash text-on-surface mb-2">Connecting to BioArc</h2>
            <p className="text-sm text-on-surface-variant text-center leading-relaxed">
              Establishing a secure connection to the hardware telemetry stream...
            </p>
          </div>
        </div>
      )}

      {fsmCurrentState === 'AWAIT' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 text-primary mb-4">
              <span className="material-symbols-outlined text-3xl">water_drop</span>
              <h2 className="text-xl font-bold font-clash">Commissioning Fill</h2>
            </div>
            <p className="text-sm text-on-surface-variant mb-6">
              The BioArc is awaiting commissioning. Please select the target fill level to begin the process.
            </p>
            <div className="space-y-3">
              <button onClick={() => { sendActionCommand('set_fill_100').then(() => sendActionCommand('fill')); }} className="w-full py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-semibold border border-primary/20 transition-colors">Full (100%)</button>
              <button onClick={() => { sendActionCommand('set_fill_50').then(() => sendActionCommand('fill')); }} className="w-full py-3 bg-secondary-fixed/10 hover:bg-secondary-fixed/20 text-secondary-fixed rounded-xl font-semibold border border-secondary/20 transition-colors">Partial (50%)</button>
              <button onClick={() => { sendActionCommand('set_fill_20').then(() => sendActionCommand('fill')); }} className="w-full py-3 bg-surface-variant hover:bg-surface-container-high text-on-surface rounded-xl font-semibold border border-outline-variant transition-colors">Starter (20%)</button>
            </div>
          </div>
        </div>
      )}

      {showControlPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h2 className="text-lg font-bold text-on-surface font-clash flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">settings_applications</span>
                Control Panel
              </h2>
              <button onClick={() => setShowControlPanel(false)} className="p-1 hover:bg-surface-variant rounded-lg text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {!isAdmin ? (
              <div className="p-12 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-error/10 border border-error/20 rounded-full flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-[32px] text-error">lock</span>
                </div>
                <div>
                  <h3 className="font-clash text-xl font-semibold text-on-surface">Admin Authorization Required</h3>
                  <p className="text-on-surface-variant font-satoshi text-sm mt-2 max-w-md">You must be logged in as an administrator to access the system Control Panel and execute hardware overrides.</p>
                </div>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => sendActionCommand('drain_all')} className="py-2.5 bg-surface-container hover:bg-surface-variant rounded-xl text-sm font-medium border border-outline-variant/50 transition-colors">Drain All</button>
                  <button onClick={() => sendActionCommand('drain_partial')} className="py-2.5 bg-surface-container hover:bg-surface-variant rounded-xl text-sm font-medium border border-outline-variant/50 transition-colors">Drain Partial</button>
                  <button onClick={() => sendActionCommand('agitate')} className="py-2.5 bg-surface-container hover:bg-surface-variant rounded-xl text-sm font-medium border border-outline-variant/50 transition-colors">Agitate (60s)</button>
                  <button onClick={() => sendActionCommand('color_sample')} className="py-2.5 bg-secondary-fixed/20 hover:bg-secondary-fixed/30 text-secondary-fixed rounded-xl text-sm font-bold border border-secondary-fixed/30 transition-colors">Color Sample (30s)</button>
                  <button onClick={() => sendActionCommand('calibrate_baseline')} className="py-2.5 bg-surface-container hover:bg-surface-variant rounded-xl text-sm font-medium border border-outline-variant/50 transition-colors">Calibrate Baseline</button>
                  <button onClick={() => sendActionCommand('clear_hazard')} className="py-2.5 bg-surface-container hover:bg-surface-variant rounded-xl text-sm font-medium border border-outline-variant/50 transition-colors">Clear Hazard</button>
                  <button onClick={() => sendActionCommand('restart')} className="py-2.5 bg-surface-container hover:bg-surface-variant rounded-xl text-sm font-medium border border-outline-variant/50 transition-colors">Restart ESP32</button>
                  <button onClick={() => sendActionCommand('demo_cycle')} className="py-2.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl text-sm font-bold border border-primary/30 transition-colors">Run Demo Cycle</button>
                  <button onClick={() => sendActionCommand('emergency_stop')} className="py-2.5 bg-error/10 hover:bg-error/20 text-error rounded-xl text-sm font-bold border border-error/20 transition-colors col-span-2">EMERGENCY STOP</button>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Device Configuration</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-on-surface-variant mb-1">Light On (Hour)</label>
                      <input type="number" min="0" max="23" value={configForm.light_on} onChange={e => setConfigForm({...configForm, light_on: parseInt(e.target.value)})} className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-on-surface-variant mb-1">Light Off (Hour)</label>
                      <input type="number" min="0" max="23" value={configForm.light_off} onChange={e => setConfigForm({...configForm, light_off: parseInt(e.target.value)})} className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-on-surface-variant mb-1">Fill Percentage</label>
                      <input type="number" min="1" max="100" value={configForm.fill_pct} onChange={e => setConfigForm({...configForm, fill_pct: parseInt(e.target.value)})} className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-on-surface-variant mb-1">Color Mode</label>
                      <select value={configForm.color_mode} onChange={e => setConfigForm({...configForm, color_mode: parseInt(e.target.value)})} className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-sm">
                        <option value={0}>Grow Lights (0)</option>
                        <option value={1}>Built-in LED (1)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={configForm.en_lights} onChange={e => setConfigForm({...configForm, en_lights: e.target.checked})} className="accent-primary w-4 h-4" /> Enable Lights
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={configForm.en_air} onChange={e => setConfigForm({...configForm, en_air: e.target.checked})} className="accent-primary w-4 h-4" /> Enable Air
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={configForm.en_agitator} onChange={e => setConfigForm({...configForm, en_agitator: e.target.checked})} className="accent-primary w-4 h-4" /> Enable Agitator
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={configForm.en_refill} onChange={e => setConfigForm({...configForm, en_refill: e.target.checked})} className="accent-primary w-4 h-4" /> Auto Refill
                    </label>
                  </div>
                  <button onClick={() => sendConfigCommand(configForm)} className="w-full mt-4 py-2 bg-primary text-on-primary rounded-xl font-semibold shadow-sm hover:scale-[0.98] transition-transform">
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      )}
      
      {/* Top Status Bar */}
      <div className="bg-surface-container-lowest/50 backdrop-blur-sm border-b border-outline-variant px-6 max-md:px-4 py-2 flex max-md:overflow-x-auto no-scrollbar justify-between items-center text-[10px] font-medium tracking-wider uppercase text-on-surface-variant gap-6">
        <div className="flex gap-4 shrink-0">
          <div className="flex items-center">
            <span className={`animate-pulse ${isWsConnected ? 'bg-secondary-fixed-dim' : 'bg-error'} rounded-full w-1.5 h-1.5 inline-block mr-1.5`}></span>
            API Link: {isWsConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div>ML Model: {isWsConnected ? 'Active (Real-time)' : 'Inactive'}</div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div>ESP32 Status: {espConnected ? 'Online' : 'Offline'}</div>
          <div className={`${!espConnected || fsmCurrentState === 'HAZARD' ? 'bg-error/20 text-error' : 'bg-primary/20 text-primary'} px-2 py-0.5 rounded-full`}>System State: {espConnected ? fsmCurrentState : 'OFFLINE'}</div>
        </div>
      </div>

      {/* Header */}
      <header className="flex max-md:flex-col justify-between items-start w-full pt-8 max-md:pt-4 pb-4 px-8 max-md:px-4 z-40 mb-2 transition-all duration-300 ease-in-out bg-surface-container-low/90 gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-primary tracking-tight leading-tight">Dashboard</h1>
          <p className="text-[14px] md:text-[16px] text-on-surface-variant mt-1 mb-2">Real-time telemetry and automation control center.</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2 text-[11px] font-medium text-on-surface-variant">
             <span className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded-md border border-outline-variant/30"><span className="material-symbols-outlined text-[14px]">air</span> Ambient: <span className="text-on-surface font-semibold ml-0.5">{telemetry.ambientTemp}°C</span></span>
             <span className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded-md border border-outline-variant/30"><span className="material-symbols-outlined text-[14px]">water_drop</span> Humidity: <span className="text-on-surface font-semibold ml-0.5">{telemetry.humidity}%</span></span>
             <span className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded-md border border-outline-variant/30"><span className="material-symbols-outlined text-[14px]">compress</span> Pressure: <span className="text-on-surface font-semibold ml-0.5">{telemetry.pressure} hPa</span></span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowControlPanel(true)} className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[14px] font-bold transition-all duration-200 hover:scale-95 ${isAdmin ? 'bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-error/10 hover:text-error border border-outline-variant/50'}`}>
            <span className="material-symbols-outlined text-sm">{isAdmin ? 'settings_suggest' : 'lock'}</span>
            Control Panel
          </button>
          <div className="flex items-center gap-1.5 ml-4 border-l border-outline-variant pl-4">
            <button className="p-1.5 text-on-surface-variant hover:bg-primary/10 hover:text-primary rounded-lg transition-colors">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
        </div>
      </header>

      {/* Bento Grid Dashboard */}
      <div className="px-8 pb-12 flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" id="bento-grid">
          
          {/* 1. Algae Growth Rate */}
          <div className="max-md:order-1 col-span-1 md:col-span-1 lg:col-span-1 bg-primary text-black rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between motion-card min-h-0 font-clash border border-primary opacity-0 hover:shadow-lg hover:shadow-primary/10 transition-shadow duration-300">
            <div className="absolute inset-0 z-0 opacity-40">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="algaeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-on-primary)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--color-on-primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 100 L0 90 Q 25 85, 50 70 T 100 20 L 100 100 Z" fill="url(#algaeGradient)"></path>
              </svg>
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <h3 className="font-satoshi text-[13px] font-semibold text-on-primary/70 uppercase tracking-wider">Algae Growth Rate</h3>
              <div className="mt-3">
                <div className="text-[36px] font-semibold text-on-primary mb-1 leading-none">
                  {(telemetry.algaeGrowthRate !== undefined && telemetry.algaeGrowthRate !== 0
                    ? (telemetry.algaeGrowthRate > 1 ? telemetry.algaeGrowthRate : telemetry.algaeGrowthRate * 100) 
                    : 8.0).toFixed(1)}<span className="text-lg text-on-primary/70 ml-1">%</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-on-primary/80">
                  <span className="flex items-center justify-center w-4 h-4 rounded bg-on-primary/20 text-on-primary text-xs">
                    <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                  </span>
                  Increased from yesterday
                </div>
              </div>
            </div>
          </div>

          {/* 2. Water Temperature */}
          <div className="max-md:order-2 col-span-1 md:col-span-1 lg:col-span-1 bg-surface-container-lowest text-on-surface rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between motion-card min-h-0 font-clash border border-outline-variant opacity-0 hover:border-outline/50 transition-colors duration-300">
            <div className="absolute inset-0 z-0 opacity-20">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M0 60 Q 10 55, 20 60 T 40 65 T 60 60 T 80 55 T 100 60 L 100 100 L 0 100 Z" fill="#60a5fa"></path>
              </svg>
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">Water Temp</h3>
              <div className="mt-3">
                <div className="text-[36px] font-semibold text-on-surface leading-none">
                  {telemetry.waterTemp}<span className="text-lg text-on-surface-variant ml-1 font-normal">°C</span>
                </div>
                <div className="text-xs text-on-surface-variant mt-1">Target: 20-30°C</div>
              </div>
            </div>
          </div>

          {/* 3. Virtual Sensor: pH */}
          <div className="max-md:order-3 col-span-1 md:col-span-1 lg:col-span-1 bg-surface-container-lowest text-on-surface rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between motion-card min-h-0 font-clash border border-outline-variant opacity-0 hover:border-outline/50 transition-colors duration-300">
            <div className="absolute inset-0 z-0 opacity-20">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M0 80 Q 25 75, 50 78 T 100 75 L 100 100 L 0 100 Z" fill="#818cf8"></path>
              </svg>
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">Virtual pH</h3>
                <div className="px-1.5 py-0.5 flex items-center rounded bg-secondary-fixed/10 text-secondary-fixed font-semibold text-[9px] border border-secondary/20 shrink-0">
                  <Bot className="w-2.5 h-2.5 mr-0.5" /> ML
                </div>
              </div>
              <div className="mt-3">
                <div className="text-[36px] font-semibold text-on-surface leading-none">
                  {telemetry.predictedPh.toFixed(2)}
                </div>
                <div className="text-xs text-on-surface-variant mt-1">Stable range</div>
              </div>
            </div>
          </div>

          {/* 4. Virtual Sensor: O2 (DO) */}
          <div className="max-md:order-4 col-span-1 md:col-span-1 lg:col-span-1 bg-surface-container-lowest text-on-surface rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between motion-card min-h-0 font-clash border border-outline-variant opacity-0 hover:border-outline/50 transition-colors duration-300">
            <div className="absolute inset-0 z-0 opacity-20">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M0 70 Q 20 80, 40 70 T 60 75 T 80 65 T 100 70 L 100 100 L 0 100 Z" fill="#2dd4bf"></path>
              </svg>
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">Virtual O² (DO)</h3>
                <div className="px-1.5 py-0.5 flex items-center rounded bg-secondary-fixed/10 text-secondary-fixed font-semibold text-[9px] border border-secondary/20 shrink-0">
                  <Bot className="w-2.5 h-2.5 mr-0.5" /> ML
                </div>
              </div>
              <div className="mt-3">
                <div className="text-[36px] font-semibold text-on-surface mb-1 leading-none">
                  {telemetry.predictedDo.toFixed(2)}<span className="text-base text-on-surface-variant ml-1 font-normal">mg/L</span>
                </div>
                <div className="text-xs text-on-surface-variant">Optimal range</div>
              </div>
            </div>
          </div>

          {/* 7. Actuator Array */}
          <div className="max-md:order-7 col-span-2 md:col-span-3 lg:col-span-2 lg:row-span-2 bg-surface-container-lowest border border-outline-variant flex flex-col motion-card min-h-0 font-clash shadow-md p-4 rounded-2xl opacity-0 hover:border-outline/50 transition-colors duration-300 relative overflow-hidden">
            
            {session?.user?.role !== 'ADMIN' && (
              <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                <ShieldAlert className="w-8 h-8 text-red-400 mb-2" />
                <h4 className="text-sm font-semibold text-white">Admin Access Required</h4>
                <p className="text-[10px] text-zinc-400 mt-1">Hardware actuators are locked.</p>
              </div>
            )}

            <div className="flex justify-between items-center mb-3">
              <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">Actuator Array</h3>
              <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed-dim animate-pulse"></span>
                {Object.values(fsm).filter(v => v === true).length} Active
              </div>
            </div>
            <ul className={`flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1 ${session?.user?.role !== 'ADMIN' ? 'opacity-20 pointer-events-none' : ''}`}>
              <ActuatorItem name="Inlet Pump" icon="water_pump" active={fsm.inletPump} isManual={fsmCurrentState === 'MANUAL'} onClick={() => sendActionCommand(fsm.inletPump ? 'intake_off' : 'intake_on')} />
              <ActuatorItem name="Outlet Pump" icon="valve" active={fsm.outletPump} isManual={fsmCurrentState === 'MANUAL'} onClick={() => sendActionCommand(fsm.outletPump ? 'outtake_off' : 'outtake_on')} />
              <ActuatorItem name="Air Pump" icon="air" active={fsm.airCompressor} isManual={fsmCurrentState === 'MANUAL'} onClick={() => sendActionCommand(fsm.airCompressor ? 'air_off' : 'air_on')} />
              <ActuatorItem name="LED Panel" icon="light_mode" active={fsm.ledPanels} isManual={fsmCurrentState === 'MANUAL'} onClick={() => sendActionCommand(fsm.ledPanels ? 'light_off' : 'light_on')} />
              <ActuatorItem name="Agitator" icon="cyclone" active={fsm.agitator} isManual={fsmCurrentState === 'MANUAL'} onClick={() => sendActionCommand(fsm.agitator ? 'agitator_off' : 'agitator_on')} />
            </ul>
            {session?.user?.role === 'ADMIN' && (
              <div className="mt-3 pt-3 border-t border-outline-variant/50">
                 <button onClick={() => sendActionCommand(fsmCurrentState === 'MANUAL' ? 'manual_mode_off' : 'manual_mode_on')} className={`w-full py-2 rounded-xl text-[11px] font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${fsmCurrentState === 'MANUAL' ? 'bg-primary text-on-primary shadow-md hover:bg-primary/90' : 'bg-surface-container hover:bg-surface-variant text-on-surface-variant'}`}>
                   <span className="material-symbols-outlined text-[16px]">{fsmCurrentState === 'MANUAL' ? 'lock_open' : 'lock'}</span>
                   {fsmCurrentState === 'MANUAL' ? 'Disable Manual Override' : 'Enable Manual Override'}
                 </button>
              </div>
            )}
          </div>

          {/* 5. Biomass Trends (Chart) */}
          <div className="max-md:order-5 col-span-2 md:col-span-3 lg:col-span-2 lg:row-span-2 bg-surface-container-lowest border border-outline-variant flex flex-col motion-card min-h-0 font-clash min-h-[260px] shadow-md p-4 rounded-2xl opacity-0 hover:border-outline/50 transition-colors duration-300">
            <div className="flex justify-between items-center mb-1 gap-2 flex-wrap">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider mr-1">Biomass Trends</h3>
                <span className="text-[10px] font-mono font-medium text-primary/90 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                  Chl-a: {(telemetry.chlAUgl ?? 280).toFixed(1)} µg/L
                </span>
                {telemetry.pseudoOd !== undefined && (
                  <span className="text-[10px] font-mono font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30" title="Pseudo Optical Density">
                    OD: {telemetry.pseudoOd.toFixed(3)}
                  </span>
                )}
                {telemetry.greenRatio !== undefined && (
                  <span className="text-[10px] font-mono font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30" title="Green Ratio">
                    GR: {telemetry.greenRatio.toFixed(3)}
                  </span>
                )}
                {telemetry.vegIndex !== undefined && (
                  <span className="text-[10px] font-mono font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30" title="Vegetation Index">
                    VI: {telemetry.vegIndex.toFixed(3)}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full shrink-0">Chlorophyll-A</div>
            </div>
            <div className="flex-1 flex flex-col relative min-h-0">
              <div className="relative flex-1 w-full min-h-[200px] -ml-4 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={biomassChartData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="biomassColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface-container-highest)', borderColor: 'var(--color-outline-variant)', borderRadius: '8px', color: 'var(--color-on-surface)', fontSize: '12px' }}
                      itemStyle={{ color: 'var(--color-primary)', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="value" name="Chl-A (µg/L)" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#biomassColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 9. Reactor Level (Gauge) */}
          <div className="max-md:order-8 col-span-2 md:col-span-3 lg:col-span-2 bg-surface-container-lowest border border-outline-variant flex flex-col items-center justify-center motion-card min-h-0 font-clash relative shadow-md p-4 rounded-2xl opacity-0 hover:border-outline/50 transition-colors duration-300">
            <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant absolute top-4 left-4 uppercase tracking-wider">Reactor Level</h3>
            <div className="relative w-28 h-40 mt-6 border-4 border-surface-container-highest rounded-2xl overflow-hidden bg-surface-container shadow-inner">
              <div className="absolute bottom-0 left-0 w-full bg-secondary-fixed-dim transition-all duration-1000 ease-in-out" style={{ height: `${telemetry.reservoirVolume}%` }}>
                {fsmCurrentState === 'COMM_FILL' && (
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjQpIi8+PC9zdmc+')] animate-[fillAnimation_2s_linear_infinite] opacity-50"></div>
                )}
                <div className="absolute -top-2 left-0 w-[200%] h-6 bg-secondary-fixed-dim opacity-50 animate-pulse" style={{ borderRadius: '38% 42% 0 0', transform: 'translateX(-25%)' }}></div>
                <div className="absolute -top-3 left-0 w-[200%] h-6 bg-secondary-fixed-dim" style={{ borderRadius: '43% 37% 0 0', transform: 'translateX(-10%)' }}></div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <span className="text-3xl font-bold text-on-surface drop-shadow-sm leading-none">{telemetry.reservoirVolume.toFixed(0)}%</span>
                <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container/50 px-1.5 py-0.5 rounded backdrop-blur-sm mt-1">
                  {((telemetry.reservoirVolume / 100) * 7.0).toFixed(1)} L
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between w-full text-[10px] font-semibold px-2">
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed-dim"></span> Optimal</div>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-surface-container-high"></span> Empty</div>
            </div>
          </div>

          {/* 6. Automation System Status */}
          <div className="max-md:order-6 col-span-2 md:col-span-3 lg:col-span-2 bg-surface-container-lowest text-on-surface rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between motion-card min-h-0 font-clash border border-outline-variant opacity-0 hover:border-outline/50 transition-colors duration-300">
            <div className="flex h-full w-full">
              <div className="w-[60%] flex flex-col justify-between relative z-10">
                <div>
                  <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Carbon Capture</h3>
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-fixed/10 text-secondary-fixed font-bold text-[9px] border border-secondary/20 whitespace-nowrap">
                    <Leaf className="w-2.5 h-2.5 mr-1" /> Net Positive
                  </div>
                </div>
                <div className="space-y-3 mt-3">
                  <div>
                    <div className="text-[32px] font-bold text-primary leading-none">
                      {(telemetry.algaeGrowthRate * 12.4).toFixed(1)}<span className="text-base ml-1 text-on-surface-variant font-normal">g</span>
                    </div>
                    <div className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider mt-1">CO₂ Absorbed</div>
                  </div>
                  <div className="pt-3 border-t border-outline-variant/30">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-on-surface">{(telemetry.algaeGrowthRate * 15.2).toFixed(1)}</span>
                      <span className="text-xs text-on-surface-variant">g</span>
                    </div>
                    <div className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">O₂ Produced</div>
                  </div>
                </div>
              </div>
              <div className="w-[40%] relative -mr-4 -my-4 overflow-hidden rounded-r-2xl">
                <img alt="Bioreactor Illustration" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCn4JNdEDB3qnQNJhoZ3Tp5qpwSLe0skw5wWlDkuzW0hdDYpfnzv1QgiCORyJzgp2opkGdxaWKt5RfKpxcZ5DQ4T7BAAHYw589Ujewx3F3TrihgeqEUovffvL_A4Jj-x_VRxPeDX3y9W3vJOM8AirpcxYq3gEnyYxpJKWWvQHQ-v4l_Hv3_Y6_GXZZyIzOcoDCZ75gZQJuoW_RlXgUJhbOPgSySOG2p1AG_0XTXTknW-NRJwZYX8LVc_eDx9703Isor19N-NtGirs8v" />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-surface-container-lowest"></div>
              </div>
            </div>
          </div>

          {/* 8. Recent System Events & Logs */}
          <div className="max-md:order-9 col-span-2 md:col-span-3 lg:col-span-2 bg-surface-container-lowest border border-outline-variant flex flex-col motion-card min-h-0 font-clash shadow-md p-4 rounded-2xl opacity-0 hover:border-outline/50 transition-colors duration-300">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">System Logs</h3>
              <Link href="/maintenance" className="border border-outline-variant px-2 py-0.5 rounded-full text-[10px] font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">View All</Link>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1">
              {maintenanceLogs.slice(0, 5).map((log) => (
                <LogItem 
                  key={log.id} 
                  message={log.message} 
                  time={log.timestamp} 
                  type={log.severity === 'nominal' ? 'System' : log.severity === 'warning' ? 'Warning' : 'Critical'} 
                  active={true} 
                  color={log.severity === 'nominal' ? 'bg-primary' : log.severity === 'warning' ? 'bg-secondary-fixed-dim' : 'bg-error'} 
                />
              ))}
            </div>
          </div>

          {/* 10. FSM State Runtime (Compact Timer) */}
          {espConnected && (
            <div className="max-md:order-10 col-span-2 md:col-span-3 lg:col-span-6 bg-surface-container-lowest rounded-2xl px-6 py-3 shadow-md text-on-surface flex motion-card min-h-0 font-clash relative overflow-hidden border border-primary/20 items-center justify-between opacity-0 hover:border-primary/40 transition-colors duration-300">
              <div className="absolute inset-0 bg-primary/5"></div>
              <div className="relative z-10 flex items-center gap-3">
                <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">FSM Runtime</h3>
                <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Active Phase</span>
              </div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="text-[28px] font-bold tracking-tight text-on-surface font-mono">{formatRuntime(fsmRuntime)}</div>
                <div className="flex gap-1.5">
                  <button className="w-8 h-8 rounded-full bg-surface-container text-primary flex items-center justify-center hover:bg-surface-variant transition-all shadow-sm hover:scale-105 active:scale-95 border border-primary/20">
                    <span className="material-symbols-outlined fill text-[16px]">pause</span>
                  </button>
                  <button className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center hover:bg-error/20 transition-all shadow-sm hover:scale-105 active:scale-95 border border-error/20">
                    <span className="material-symbols-outlined fill text-[16px]">stop</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function ActuatorItem({ name, icon, active, isManual, onClick }: { name: string, icon: string, active: boolean, isManual?: boolean, onClick?: () => void }) {
  return (
    <li onClick={isManual ? onClick : undefined} className={`flex items-center justify-between p-2 rounded-xl transition-all duration-200 ${isManual ? 'hover:bg-primary/10 cursor-pointer border border-primary/20' : 'hover:bg-surface-container cursor-default border border-transparent'} group`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
          active ? 'bg-secondary-fixed/20 text-secondary-fixed' : 'bg-surface-container text-on-surface-variant group-hover:text-primary'
        }`}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </div>
        <span className="text-[13px] text-on-surface font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-secondary-fixed-dim' : 'bg-surface-container-high'}`}></span>
          <span className={`text-[10px] font-semibold ${active ? 'text-secondary-fixed' : 'text-on-surface-variant'}`}>
            {active ? 'Active' : 'Idle'}
          </span>
        </div>
        {isManual && (
          <div className="ml-2">
             <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors duration-300 ${active ? 'bg-primary' : 'bg-surface-container-highest'}`}>
               <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-300 ${active ? 'translate-x-4' : 'translate-x-0'}`}></div>
             </div>
          </div>
        )}
      </div>
    </li>
  );
}

function LogItem({ message, time, type, active, color }: { message: string, time: string, type: string, active: boolean, color: string }) {
  if (!active) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-lg hover:bg-surface-container transition-all duration-200 p-2">
      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${color} shrink-0`}></div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center gap-2">
          <span className="font-medium text-[13px] text-on-surface truncate">{message}</span>
          <span className="text-[10px] text-on-surface-variant shrink-0">{time}</span>
        </div>
        <span className={`inline-block mt-0.5 px-1.5 py-0 rounded text-[9px] font-medium ${
          type === 'System' ? 'bg-primary/10 text-primary' : 
          type === 'Success' ? 'bg-secondary-fixed/20 text-secondary-fixed' : 
          'bg-surface-container-high text-on-surface-variant'
        }`}>{type}</span>
      </div>
    </div>
  );
}
