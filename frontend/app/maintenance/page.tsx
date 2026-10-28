// app/maintenance/page.tsx
// Maintenance page for the bioreactor

"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Activity, Wrench, AlertTriangle, ShieldCheck, Terminal, Disc3, Database, Lock, Unlock, X, Save, Sparkles, Cpu, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function MaintenancePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const { maintenanceLogs, hardwareLifespan, systemHealthSummary, lastAnalyzedAt, setMaintenanceData, telemetry, sendActionCommand } = useStore();
  const [mounted, setMounted] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [content, setContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Paginated system logs from Prisma database
  const [logs, setLogs] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchLogs = (page: number) => {
    setIsLoadingLogs(true);
    fetch(`/api/logs?page=${page}&limit=15`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.logs)) {
          setLogs(data.logs);
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages || 1);
          }
          if (page === 1) {
            useStore.setState({ maintenanceLogs: data.logs });
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingLogs(false));
  };

  const handleSaveContext = async () => {
    setStatusMessage('');
    if (!keyword || !content) {
      setStatusMessage('Please fill all fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-BioArc-Client': 'true'
        },
        body: JSON.stringify({ keyword, content }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage('Success! Context added.');
        setKeyword('');
        setContent('');
        setTimeout(() => setIsContextModalOpen(false), 2000);
      } else {
        setStatusMessage(data.error || 'Failed to save');
      }
    } catch (e) {
      setStatusMessage('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchAiDiagnostics = (force = false) => {
    if (force) setIsAnalyzing(true);
    fetch(`/api/maintenance/analyze${force ? '?force=true' : ''}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.lifespans) {
          setMaintenanceData(data);
        }
      })
      .catch(console.error)
      .finally(() => { if (force) setIsAnalyzing(false); });
  };

  useEffect(() => {
    setMounted(true);
    fetchAiDiagnostics(false);
  }, []);

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage]);

  if (!mounted) return null;

  const getHealthColor = (percentage: number) => {
    if (percentage > 74) return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
    if (percentage > 39) return 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
    return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
  };

  const getHealthTextColor = (percentage: number) => {
    if (percentage > 74) return 'text-emerald-400';
    if (percentage > 39) return 'text-amber-400';
    return 'text-red-400';
  };

  const formatRuntime = (sec?: number) => {
    if (!sec || sec <= 0) return '0 s';
    if (sec < 60) return `${Math.round(sec)} s`;
    if (sec < 3600) return `${(sec / 60).toFixed(1)} min`;
    return `${(sec / 3600).toFixed(1)} hrs`;
  };

  const agitator = hardwareLifespan.find(hw => hw.name?.includes('Agitator'));
  const agitatorHealth = agitator ? Math.round(agitator.healthPercentage) : 100;
  
  // Radial SVG calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (agitatorHealth / 100) * circumference;

  const hasCritical = hardwareLifespan.some(hw => hw.healthPercentage < 40);
  const hasWarning = hardwareLifespan.some(hw => hw.healthPercentage >= 40 && hw.healthPercentage < 75);
  const overallStatusText = hasCritical ? "Critical Attention Needed" : hasWarning ? "Maintenance Advised" : "All Systems Optimal";
  const overallStatusColor = hasCritical 
    ? "bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
    : hasWarning 
    ? "bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]";

  const formattedLastCheck = lastAnalyzedAt 
    ? new Date(lastAnalyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : 'Recently';

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 min-h-full overflow-y-auto relative custom-scrollbar">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center z-10 shrink-0">
        <h2 className="font-clash text-2xl font-bold text-white tracking-wide">Maintenance</h2>
        <button 
          onClick={() => setIsContextModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800 border border-white/[0.05] hover:border-emerald-500/50 rounded-xl transition-all text-sm font-satoshi text-zinc-300 hover:text-white group"
        >
          <Database className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          Update Knowledge Base
        </button>
      </div>

      {/* TOP SECTION: Diagnostics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
        
        {/* RELAY & PUMP LIFESPANS */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110">
            <Wrench className="w-32 h-32 text-white" />
          </div>
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <Activity className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-clash text-lg font-semibold text-white tracking-wide">Hardware Wear & AI Lifespans</h3>
            </div>
            <button 
              onClick={() => fetchAiDiagnostics(true)}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition-all text-xs font-satoshi text-indigo-300 hover:text-white disabled:opacity-50"
              title="Force AI predictive maintenance re-analysis"
            >
              <Activity className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
            </button>
          </div>

          <div className="space-y-3.5 relative z-10 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            {hardwareLifespan.filter(hw => !hw.name?.includes('Agitator')).map((hw, idx) => {
              const isSensor = hw.type === 'sensor' || hw.name?.toLowerCase().includes('sensor') || hw.name?.toLowerCase().includes('level') || hw.name?.toLowerCase().includes('temp');
              return (
                <motion.div 
                  key={hw.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 font-satoshi text-base">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-white font-semibold tracking-wide text-sm md:text-base">{hw.name}</span>
                      <span className="text-xs md:text-sm font-mono px-2.5 py-1 rounded-md bg-white/[0.08] text-zinc-200 border border-white/[0.1] font-medium shadow-sm">
                        {isSensor 
                          ? `${formatRuntime(hw.totalRuntimeSec)} runtime` 
                          : `${(hw.totalToggles ?? 0).toLocaleString()} toggles • ${formatRuntime(hw.totalRuntimeSec)}`
                        }
                      </span>
                    </div>
                    <span className={`font-bold font-mono text-base md:text-lg ${getHealthTextColor(hw.healthPercentage)}`}>
                      {Math.round(hw.healthPercentage)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/[0.05]" title={hw.aiReason || `${hw.name} operating normally`}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${hw.healthPercentage}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className={`h-full rounded-full ${getHealthColor(hw.healthPercentage)}`}
                    />
                  </div>
                  {hw.aiReason && (
                    <span className="text-xs md:text-sm text-zinc-300 font-satoshi font-normal leading-relaxed pt-0.5">
                      {hw.aiReason}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* RIGHT COLUMN: AGITATOR DIAGNOSTICS & AI REVIEW */}
        <div className="flex flex-col gap-6">
          {/* TCS34725 OPTICAL & COLOR SENSOR DIAGNOSTICS */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between group"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110">
              <Activity className="w-32 h-32 text-emerald-400" />
            </div>

            <div className="flex-1 flex flex-col h-full z-10">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <Activity className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-clash text-lg font-semibold text-white tracking-wide">Optical Spectrophotometry</h3>
                    <p className="text-zinc-400 font-satoshi text-xs">TCS34725 Real-Time Color & Biomass Sensor</p>
                  </div>
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => sendActionCommand('color_sample')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-all text-xs font-satoshi font-semibold text-emerald-400 hover:text-white"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Trigger Color Test (30s)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
                <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl flex flex-col">
                  <span className="text-[10px] uppercase font-mono text-zinc-400">Green Ratio</span>
                  <span className="text-base font-bold font-mono text-emerald-400 mt-1">{(telemetry?.greenRatio ?? 0.386).toFixed(3)}</span>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl flex flex-col">
                  <span className="text-[10px] uppercase font-mono text-zinc-400">Pseudo OD</span>
                  <span className="text-base font-bold font-mono text-indigo-400 mt-1">{(telemetry?.pseudoOd ?? 0.312).toFixed(3)}</span>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl flex flex-col">
                  <span className="text-[10px] uppercase font-mono text-zinc-400">Chl-A (µg/L)</span>
                  <span className="text-base font-bold font-mono text-emerald-400 mt-1">{(telemetry?.chlAUgl ?? 265.5).toFixed(1)}</span>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl flex flex-col">
                  <span className="text-[10px] uppercase font-mono text-zinc-400">Baseline</span>
                  <span className="text-xs font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Calibrated
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI HARDWARE STATUS REVIEW */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex-1 bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between group hover:border-indigo-500/30 transition-all duration-500"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-700" />
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110">
              <Sparkles className="w-32 h-32 text-indigo-300" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 relative z-10 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl shadow-inner">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-clash text-lg font-semibold text-white tracking-wide flex items-center gap-2">
                      AI Hardware Status Review
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${overallStatusColor}`}>
                    {hasCritical ? <AlertTriangle className="w-3 h-3" /> : hasWarning ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    {overallStatusText}
                  </span>
                </div>
              </div>

              <div className="relative z-10 p-4 rounded-2xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/[0.06] mb-4">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/[0.05] text-xs font-mono">
                  <span className="text-indigo-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    Predictive Status Assessment
                  </span>
                  {isAnalyzing ? (
                    <span className="text-amber-400 flex items-center gap-1 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Analyzing live telemetry...
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1" title="Synchronized with hourly hardware lifespan check">
                      <Clock className="w-3 h-3" /> 1-Hour Cycle
                    </span>
                  )}
                </div>
                <p className="text-zinc-300 font-satoshi text-sm leading-relaxed tracking-wide">
                  {isAnalyzing 
                    ? "Evaluating cumulative toggle cycles, continuous sensor operating hours, and recent diagnostic logs across all relays and actuators..." 
                    : (systemHealthSummary || "All bioreactor hardware components and relay actuators are currently operating within nominal parameters with optimal lifespan reserves.")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs font-mono text-zinc-500 pt-3 border-t border-white/[0.05] relative z-10 gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Last Auto-Check: <span className="text-zinc-300 font-medium">{formattedLastCheck}</span>
              </span>
              <span className="text-indigo-400/80 hover:text-indigo-300 transition-colors flex items-center gap-1">
                Linked with Run AI Analysis button →
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* BOTTOM SECTION: TERMINAL LOGS */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex-1 min-h-[480px] shrink-0 flex flex-col bg-zinc-950/90 backdrop-blur-3xl border border-white/[0.05] rounded-3xl shadow-2xl overflow-hidden relative"
      >
        {/* Terminal Header */}
        <div className="px-6 py-3 border-b border-white/[0.05] bg-black/60 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-500" />
            <h3 className="font-mono text-xs font-semibold text-zinc-400 tracking-widest uppercase">System Event Log</h3>
          </div>
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/40 border border-red-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40 border border-amber-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-emerald-500/20" />
          </div>
        </div>

        {/* Terminal Content */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-3 custom-scrollbar">
          <AnimatePresence initial={false}>
            {(logs.length > 0 ? logs : maintenanceLogs).map((log: any) => {
              const isWarning = log.severity === 'warning';
              const isCritical = log.severity === 'critical';
              
              let textColor = 'text-zinc-400';
              let badgeBg = 'bg-zinc-800/50 text-zinc-500 border border-white/5';
              let icon = null;

              if (isCritical) {
                textColor = 'text-red-300';
                badgeBg = 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
                icon = <AlertTriangle className="w-3.5 h-3.5 mr-1 inline-block" />;
              } else if (isWarning) {
                textColor = 'text-amber-300';
                badgeBg = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                icon = <AlertTriangle className="w-3.5 h-3.5 mr-1 inline-block" />;
              }

              return (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/[0.02]"
                >
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-zinc-600 w-24">[{log.timestamp}]</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${badgeBg} w-24 text-center font-bold`}>
                      {log.severity}
                    </span>
                  </div>
                  <div className={`flex-1 leading-relaxed ${textColor}`}>
                    {icon}
                    {log.message}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-3 border-t border-white/[0.05] bg-black/40 flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-3">
            <span>Page <span className="text-white font-bold">{currentPage}</span> of <span className="text-white font-bold">{totalPages}</span></span>
            <span className="text-zinc-600 hidden sm:inline">(15 logs/page)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoadingLogs}
              className="px-3 py-1.5 rounded bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-30 disabled:hover:bg-white/[0.05] text-zinc-200 transition-colors cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoadingLogs}
              className="px-3 py-1.5 rounded bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-30 disabled:hover:bg-white/[0.05] text-zinc-200 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </motion.div>

      {/* KNOWLEDGE BASE MODAL */}
      <AnimatePresence>
        {isContextModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsContextModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-8 flex flex-col gap-6">
                {!isAdmin ? (
                  <div className="flex flex-col items-center text-center gap-4 py-4">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-2">
                      <Lock className="w-7 h-7 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-clash text-xl font-semibold text-white">Admin Authorization Required</h3>
                      <p className="text-zinc-400 font-satoshi text-sm mt-2">You must be logged in as an administrator to modify the secure knowledge base.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <Database className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-clash text-lg font-semibold text-white">Add System Context</h3>
                        <p className="text-zinc-400 text-xs font-satoshi">Securely inject facts into the RAG pipeline.</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Keyword</label>
                      <input
                        type="text"
                        placeholder="e.g. goals, architecture, pump..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Context Data</label>
                      <textarea
                        placeholder="Detailed facts and system logic..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={4}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                      />
                    </div>

                    <button
                      onClick={handleSaveContext}
                      disabled={isSubmitting}
                      className="w-full mt-2 flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-black font-semibold rounded-xl px-4 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {isSubmitting ? 'Saving...' : 'Save to Database'}
                    </button>

                    {statusMessage && (
                      <div className={`text-center text-sm font-semibold p-2 rounded-lg ${statusMessage.includes('Success') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {statusMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
