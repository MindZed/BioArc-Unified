// app/page.tsx
// Upgraded BioArc Enterprise Bento-Grid Dashboard with Central Digital Twin

"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { motion, stagger, useAnimate } from "framer-motion";
import { useSession } from "next-auth/react";
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Settings, 
  Play, 
  Pause, 
  Square, 
  ShieldAlert,
  Wind,
  Droplets,
  Compass,
  Radio,
  Wrench,
  Lock
} from "lucide-react";

// Modular Bento Dashboard Components
import { ReactorTwinCard } from "@/components/dashboard/ReactorTwinCard";
import { VitalTempCard } from "@/components/dashboard/VitalTempCard";
import { AlgaeGrowthCard } from "@/components/dashboard/AlgaeGrowthCard";
import { VirtualSensorsCard } from "@/components/dashboard/VirtualSensorsCard";
import { ActuatorMatrixCard } from "@/components/dashboard/ActuatorMatrixCard";
import { DemoShowcaseCard } from "@/components/dashboard/DemoShowcaseCard";
import { BiomassChartCard } from "@/components/dashboard/BiomassChartCard";
import { HardwareVitalsCard } from "@/components/dashboard/HardwareVitalsCard";
import { SystemLogsCard } from "@/components/dashboard/SystemLogsCard";
import { CommissioningModal } from "@/components/dashboard/CommissioningModal";
import { ControlPanelModal } from "@/components/dashboard/ControlPanelModal";
import { AdminPasswordModal } from "@/components/dashboard/AdminPasswordModal";
import { PumpConfirmModal } from "@/components/dashboard/PumpConfirmModal";

export default function Dashboard() {
  const { 
    telemetry, 
    fsm,
    fsmCurrentState, 
    updateTelemetry, 
    isWsConnected, 
    espConnected, 
    handleLiveTelemetry,
    toggleDevMode,
    openAdminAuthModal
  } = useStore();

  const [showControlPanel, setShowControlPanel] = useState(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [scope, animate] = useAnimate();
  const [mounted, setMounted] = useState(false);
  const [fsmRuntime, setFsmRuntime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // FSM Runtime Tracker
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
         const found = data.find(l => l.message && l.message.includes(targetStr));
         const startTime = found ? new Date(found.timestamp).getTime() : Date.now();
         
         setFsmRuntime(Math.floor((Date.now() - startTime) / 1000));
         timerRef.current = setInterval(() => {
           setFsmRuntime(Math.floor((Date.now() - startTime) / 1000));
         }, 1000);
      })
      .catch(() => {
         const startTime = Date.now();
         timerRef.current = setInterval(() => {
           setFsmRuntime(Math.floor((Date.now() - startTime) / 1000));
         }, 1000);
      });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fsmCurrentState, espConnected]);

  // Offline Data Fallback Fetch
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

  // Initial maintenance log fetch
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

  // Polling fallback
  useEffect(() => {
    const interval = setInterval(() => {
      updateTelemetry();
    }, 2000);
    return () => clearInterval(interval);
  }, [updateTelemetry]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Framer-motion entrance stagger
  useEffect(() => {
    if (mounted) {
      animate(
        ".motion-card", 
        { opacity: [0, 1], y: [16, 0] }, 
        { delay: stagger(0.06), duration: 0.45, ease: "easeOut" }
      );
    }
  }, [animate, mounted]);

  const formatRuntime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  if (!mounted) return null;

  return (
    <div ref={scope} className="min-h-screen flex flex-col bg-background text-on-surface">
      
      {/* ESP32 Offline Alert Banner */}
      {!espConnected && (
        <div className="bg-error text-white text-center py-2 text-xs font-bold uppercase tracking-widest shadow-md z-50 relative flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          ESP32 Offline — Displaying Cached Telemetry Snapshot
        </div>
      )}

      {/* Hazard State Alert Banner */}
      {espConnected && fsmCurrentState === 'HAZARD' && (
        <div className="bg-error/15 text-error text-center py-2 text-xs font-bold uppercase tracking-widest border-b border-error/30 z-40 relative flex items-center justify-center gap-2 shadow-sm animate-pulse">
          <AlertTriangle className="w-4 h-4" />
          Hazard State Engaged — Hardware Actuators Safety Halted
        </div>
      )}

      {/* WebSocket Connecting Modal */}
      {!isWsConnected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-md">
          <div className="flex flex-col items-center bg-surface-container-low p-8 rounded-2xl shadow-2xl border border-outline-variant max-w-sm w-full mx-4 text-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-5" />
            <h2 className="text-xl font-bold font-clash text-on-surface mb-2">Connecting to BioArc Core</h2>
            <p className="text-sm text-on-surface-variant font-satoshi leading-relaxed">
              Establishing authenticated WebSocket telemetry pipeline to the Go backend...
            </p>
          </div>
        </div>
      )}

      {/* Top Global Operations Status Bar */}
      <div className="bg-surface-container-lowest/70 backdrop-blur-md border-b border-outline-variant px-8 max-md:px-4 py-2 flex max-md:overflow-x-auto no-scrollbar justify-between items-center text-[10px] font-mono tracking-wider uppercase text-on-surface-variant gap-6">
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-primary animate-pulse' : 'bg-error'}`} />
            <span>Telemetry Link: {isWsConnected ? 'Active (WS)' : 'Disconnected'}</span>
          </div>
          <div className="hidden sm:inline-block text-outline-variant">•</div>
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-cyan-400" />
            <span>ESP32: {espConnected ? 'Online (MQTT)' : 'Offline'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`px-2.5 py-0.5 rounded-full font-bold tracking-wider ${
            !espConnected || fsmCurrentState === 'HAZARD'
              ? 'bg-error/20 text-error'
              : (fsm?.devMode || fsmCurrentState === 'DEV')
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-primary/20 text-primary'
          }`}>
            Phase: {espConnected ? (fsm?.devMode || fsmCurrentState === 'DEV' ? 'DEV_BENCH' : fsmCurrentState) : 'OFFLINE'}
          </span>
          <span className="font-bold text-on-surface font-mono">
            {formatRuntime(fsmRuntime)}
          </span>
        </div>
      </div>

      {/* Main Header */}
      <header className="flex max-md:flex-col justify-between items-start w-full pt-6 max-md:pt-4 pb-4 px-8 max-md:px-4 z-40 bg-surface-container-low/60 gap-4 border-b border-outline-variant/30">
        <div>
          <h1 className="text-[26px] font-bold text-primary font-clash tracking-tight leading-tight">
            BioArc Mission Control
          </h1>
          <p className="text-[13px] md:text-[14px] text-on-surface-variant font-satoshi mt-0.5">
            Automated microalgae photobioreactor with real-time digital twin telemetry.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] font-mono text-on-surface-variant">
            <span className="flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/40">
              <Wind className="w-3.5 h-3.5 text-cyan-400" /> Ambient: <strong className="text-on-surface font-semibold ml-0.5">{telemetry.ambientTemp}°C</strong>
            </span>
            <span className="flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/40">
              <Droplets className="w-3.5 h-3.5 text-teal-400" /> Humidity: <strong className="text-on-surface font-semibold ml-0.5">{telemetry.humidity}%</strong>
            </span>
            <span className="flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/40">
              <Compass className="w-3.5 h-3.5 text-indigo-400" /> Pressure: <strong className="text-on-surface font-semibold ml-0.5">{telemetry.pressure} hPa</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (!isAdmin) {
                openAdminAuthModal(() => {
                  toggleDevMode();
                });
              } else {
                toggleDevMode();
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold font-clash tracking-wider uppercase transition-all duration-200 cursor-pointer ${
              fsm?.devMode || fsmCurrentState === 'DEV'
                ? 'bg-amber-500 text-black shadow-md hover:bg-amber-400 font-extrabold'
                : 'bg-surface-container text-on-surface-variant border border-outline-variant/60 hover:text-amber-400 hover:border-amber-400/30'
            }`}
            title={isAdmin ? "Toggle Bench Development Mode" : "Admin password required to enable Dev Mode"}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{fsm?.devMode || fsmCurrentState === 'DEV' ? 'DEV MODE: ACTIVE' : 'DEV MODE'}</span>
            {!isAdmin && <Lock className="w-3 h-3 ml-0.5 opacity-60 text-amber-400" />}
          </button>

          <button
            onClick={() => setShowControlPanel(true)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold font-clash tracking-wider uppercase transition-all duration-200 cursor-pointer ${
              isAdmin
                ? 'bg-primary text-black hover:bg-primary/90 shadow-md hover:scale-[0.98]'
                : 'bg-surface-container text-on-surface-variant border border-outline-variant/60 hover:text-error'
            }`}
          >
            <Settings className="w-4 h-4" />
            Control Panel
          </button>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <main className="px-8 max-md:px-4 py-6 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4" id="bento-grid">
          
          {/* Column 1 & 2: Left Metrics Stack */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2 flex flex-col gap-4">
            <AlgaeGrowthCard />
            <VitalTempCard />
            <VirtualSensorsCard />
          </div>

          {/* Center Column 3 & 4: Dedicated Central Digital Twin Bioreactor Simulation */}
          <ReactorTwinCard />

          {/* Column 5 & 6: Actuator Matrix Deck or Demo Showcase Card */}
          {telemetry.demoMode || fsmCurrentState === 'DEMO' ? (
            <DemoShowcaseCard />
          ) : (
            <ActuatorMatrixCard />
          )}

          {/* Lower Row: Biomass Chrono-Chart (Spans 4 columns) */}
          <BiomassChartCard />

          {/* Lower Row: Hardware Ultrasonic Vitals (Spans 1 column) */}
          <HardwareVitalsCard />

          {/* Lower Row: Realtime System Diagnostics (Spans 1 column) */}
          <SystemLogsCard />

        </div>
      </main>

      {/* Standby Commissioning Fill Modal */}
      <CommissioningModal />

      {/* Admin Device Configuration & Quick Actions Modal */}
      <ControlPanelModal
        isOpen={showControlPanel}
        onClose={() => setShowControlPanel(false)}
      />

      {/* Admin Verification Modal for Dev Mode & Actuator Controls */}
      <AdminPasswordModal />

      {/* Confirmation Dialog for Destructive Pump Actions (Inlet & Outlet) */}
      <PumpConfirmModal />

    </div>
  );
}
