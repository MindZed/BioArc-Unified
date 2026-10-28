// app/maintenance/page.tsx
// Maintenance page for the bioreactor

"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Activity, Wrench, AlertTriangle, ShieldCheck, Terminal, Disc3, Database, Lock, Unlock, X, Save, Sparkles, Cpu, Clock, CheckCircle2, RefreshCw, Plus, Trash2, Layers, Search, FileText, Loader2, FileUp } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function MaintenancePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const { maintenanceLogs, hardwareLifespan, systemHealthSummary, lastAnalyzedAt, setMaintenanceData, telemetry, sendActionCommand } = useStore();
  const [mounted, setMounted] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [contextTab, setContextTab] = useState<'list' | 'add' | 'upload'>('list');
  const [knowledgeChunks, setKnowledgeChunks] = useState<any[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [chunkTitle, setChunkTitle] = useState('');
  const [chunkCategory, setChunkCategory] = useState('team');
  const [customCategory, setCustomCategory] = useState('');
  const [chunkContent, setChunkContent] = useState('');
  const [chunkFilter, setChunkFilter] = useState('ALL');
  const [chunkSearch, setChunkSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Document Upload State (Zero-storage in-memory PDF/TXT ingestion)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDocTitle, setUploadDocTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('biology');
  const [customUploadCategory, setCustomUploadCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

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

  const fetchKnowledgeChunks = async () => {
    setIsLoadingChunks(true);
    try {
      const res = await fetch('/api/context');
      const data = await res.json();
      if (data && Array.isArray(data.chunks)) {
        setKnowledgeChunks(data.chunks);
      }
    } catch (e) {
      console.error('Failed to fetch knowledge chunks:', e);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  useEffect(() => {
    if (isContextModalOpen) {
      fetchKnowledgeChunks();
    }
  }, [isContextModalOpen]);

  const handleSaveChunk = async () => {
    setStatusMessage('');
    if (!chunkTitle.trim() || !chunkContent.trim()) {
      setStatusMessage('Please fill in title and content');
      return;
    }
    setIsSubmitting(true);
    const finalCategory = chunkCategory === 'custom' 
      ? (customCategory.trim().toLowerCase() || 'general') 
      : chunkCategory;

    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-BioArc-Client': 'true'
        },
        body: JSON.stringify({ 
          title: chunkTitle.trim(),
          category: finalCategory,
          content: chunkContent.trim()
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage('Success! 768-dim vector embedded & saved to pgvector.');
        setChunkTitle('');
        setChunkContent('');
        setCustomCategory('');
        fetchKnowledgeChunks();
        setTimeout(() => {
          setStatusMessage('');
          setContextTab('list');
        }, 1500);
      } else {
        setStatusMessage(data.error || 'Failed to save');
      }
    } catch (e) {
      setStatusMessage('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChunk = async (id: string) => {
    try {
      const res = await fetch(`/api/context?id=${id}`, {
        method: 'DELETE',
        headers: { 'X-BioArc-Client': 'true' }
      });
      if (res.ok) {
        setKnowledgeChunks(prev => prev.filter(c => c.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete chunk:', e);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadStatus('Extracting document in-memory & generating chunks...');

    const finalCategory = uploadCategory === 'custom'
      ? (customUploadCategory.trim().toLowerCase() || 'general')
      : uploadCategory;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', finalCategory);
    if (uploadDocTitle.trim()) {
      formData.append('title', uploadDocTitle.trim());
    }

    try {
      setUploadStatus('Generating 768-dim embeddings in PostgreSQL...');
      const res = await fetch('/api/context/upload', {
        method: 'POST',
        headers: { 'X-BioArc-Client': 'true' },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadStatus(`Success! Indexed ${data.storedChunks} chunks across ${data.totalPages} page(s).`);
        setSelectedFile(null);
        setUploadDocTitle('');
        setCustomUploadCategory('');
        fetchKnowledgeChunks();
        setTimeout(() => {
          setContextTab('list');
          setUploadStatus('');
        }, 2200);
      } else {
        setUploadStatus(data.error || 'Upload failed');
      }
    } catch (e: any) {
      setUploadStatus('Network error during upload');
    } finally {
      setIsUploading(false);
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

      {/* VECTOR KNOWLEDGE BASE MODAL */}
      <AnimatePresence>
        {isContextModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col relative max-h-[85vh]"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsContextModalOpen(false)}
                className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <Database className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-clash text-lg font-bold text-white tracking-wide">Vector Knowledge Base</h3>
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full">pgvector</span>
                    </div>
                    <p className="text-zinc-400 text-xs font-satoshi mt-0.5">Semantic RAG chunks stored as 768-dimensional vectors in PostgreSQL.</p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar">
                {!isAdmin ? (
                  <div className="flex flex-col items-center text-center gap-4 py-8">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                      <Lock className="w-7 h-7 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-clash text-xl font-semibold text-white">Admin Authorization Required</h3>
                      <p className="text-zinc-400 font-satoshi text-sm mt-2">Only administrators can view and modify the physical reactor knowledge base.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3 shrink-0">
                      <button
                        onClick={() => setContextTab('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-satoshi transition-all cursor-pointer ${
                          contextTab === 'list'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Indexed Chunks ({knowledgeChunks.length})
                      </button>
                      <button
                        onClick={() => { setContextTab('add'); setStatusMessage(''); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-satoshi transition-all cursor-pointer ${
                          contextTab === 'add'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Chunk
                      </button>
                      <button
                        onClick={() => { setContextTab('upload'); setUploadStatus(''); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-satoshi transition-all cursor-pointer ${
                          contextTab === 'upload'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        Upload Document (PDF / TXT)
                      </button>
                    </div>

                    {/* TAB 1: LIST / BROWSE CHUNKS */}
                    {contextTab === 'list' && (
                      <div className="flex flex-col gap-3">
                        {/* Search and Category Filter */}
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Filter chunks by title or content..."
                              value={chunkSearch}
                              onChange={(e) => setChunkSearch(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <select
                            value={chunkFilter}
                            onChange={(e) => setChunkFilter(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                          >
                            <option value="ALL">All Categories</option>
                            <option value="team">Creators & Team</option>
                            <option value="general">General & Overview</option>
                            <option value="biology">Biology</option>
                            <option value="hardware">Hardware</option>
                            <option value="safety">Safety</option>
                            <option value="operation">Operation</option>
                            <option value="troubleshooting">Troubleshooting</option>
                            <option value="architecture">Architecture</option>
                          </select>
                        </div>

                        {/* Chunks List */}
                        {isLoadingChunks ? (
                          <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                            <span className="text-xs font-satoshi">Loading vector chunks from PostgreSQL...</span>
                          </div>
                        ) : knowledgeChunks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-3 border border-dashed border-white/10 rounded-2xl">
                            <FileText className="w-8 h-8 opacity-30" />
                            <p className="text-xs font-satoshi">No knowledge chunks found. Click &quot;Add New Knowledge Chunk&quot; to begin indexing.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                            {knowledgeChunks
                              .filter(c => chunkFilter === 'ALL' || c.category === chunkFilter)
                              .filter(c => !chunkSearch || c.title.toLowerCase().includes(chunkSearch.toLowerCase()) || c.content.toLowerCase().includes(chunkSearch.toLowerCase()))
                              .map((chunk) => (
                                <div
                                  key={chunk.id}
                                  className="p-3.5 bg-black/30 hover:bg-black/50 border border-white/5 hover:border-emerald-500/20 rounded-2xl transition-all flex flex-col gap-2 group"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <h4 className="font-satoshi font-semibold text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors">
                                        {chunk.title}
                                      </h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded bg-white/5 border border-white/10 text-zinc-400">
                                          {chunk.category || 'general'}
                                        </span>
                                        <span className="text-[10px] text-zinc-600 font-mono">
                                          {new Date(chunk.createdAt).toLocaleDateString()}
                                        </span>
                                        {chunk.hasEmbedding && (
                                          <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400">
                                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                            768-dim
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteChunk(chunk.id)}
                                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                      title="Delete Chunk"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <p className="text-xs text-zinc-400 font-satoshi line-clamp-2 leading-relaxed">
                                    {chunk.content}
                                  </p>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: ADD NEW VECTOR CHUNK */}
                    {contextTab === 'add' && (
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Chunk Title</label>
                          <input
                            type="text"
                            placeholder="e.g. Nutrient Dosing Schedule, Overflow Emergency SOP..."
                            value={chunkTitle}
                            onChange={(e) => setChunkTitle(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors font-satoshi"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Category</label>
                          <select
                            value={chunkCategory}
                            onChange={(e) => setChunkCategory(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors font-satoshi cursor-pointer"
                          >
                            <option value="team">Creators & Team (MindZed, founders, engineers, contributors, contact)</option>
                            <option value="general">General & Overview (Project mission, purpose, bio-reactor background)</option>
                            <option value="biology">Biology (Cultivation parameters, Chlorella, Growth Rate)</option>
                            <option value="hardware">Hardware (Sensors, ESP32, GPIO, Wiring, Tank Geometry)</option>
                            <option value="operation">Operation (Manual Overrides, Relays, Harvesting, Refill)</option>
                            <option value="safety">Safety (Emergency Shutdown, Safety Interlocks, Alarms)</option>
                            <option value="troubleshooting">Troubleshooting (I2C collisions, WiFi/MQTT recovery)</option>
                            <option value="architecture">Architecture (Dokploy, APIs, WebSockets, Monorepo layout)</option>
                            <option value="custom">Custom Category... (Type your own)</option>
                          </select>
                          {chunkCategory === 'custom' && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-1"
                            >
                              <input
                                type="text"
                                placeholder="Enter custom category name (e.g. patents, funding, partners)..."
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                className="w-full bg-black/40 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-400 font-satoshi"
                              />
                            </motion.div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Documentation Content</label>
                          <textarea
                            placeholder="Detailed operating instructions, biophysical bounds, thresholds, or system logic..."
                            value={chunkContent}
                            onChange={(e) => setChunkContent(e.target.value)}
                            rows={5}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors resize-none font-satoshi leading-relaxed"
                          />
                        </div>

                        <button
                          onClick={handleSaveChunk}
                          disabled={isSubmitting || !chunkTitle.trim() || !chunkContent.trim()}
                          className="w-full mt-2 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl px-4 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Generating 768-dim Vector & Storing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Embed & Save to Vector Database</span>
                            </>
                          )}
                        </button>

                        {statusMessage && (
                          <div className={`text-center text-xs font-semibold p-3 rounded-xl ${
                            statusMessage.includes('Success') 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {statusMessage}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: UPLOAD DOCUMENT (PDF / TXT / MD) */}
                    {contextTab === 'upload' && (
                      <div className="flex flex-col gap-4">
                        {/* Dropzone */}
                        <div
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              const f = e.dataTransfer.files[0];
                              setSelectedFile(f);
                              if (!uploadDocTitle) {
                                setUploadDocTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
                              }
                            }
                          }}
                          onClick={() => document.getElementById('kb-doc-upload')?.click()}
                          className="border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer bg-black/20 hover:bg-emerald-500/[0.02]"
                        >
                          <input
                            id="kb-doc-upload"
                            type="file"
                            accept=".pdf,.txt,.md,.markdown,.json,.csv,.log"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const f = e.target.files[0];
                                setSelectedFile(f);
                                if (!uploadDocTitle) {
                                  setUploadDocTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
                                }
                              }
                            }}
                          />
                          {selectedFile ? (
                            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 w-full max-w-md justify-between">
                              <div className="flex items-center gap-3 truncate">
                                <FileText className="w-6 h-6 shrink-0" />
                                <div className="text-left truncate">
                                  <p className="text-xs font-semibold text-white truncate">{selectedFile.name}</p>
                                  <p className="text-[10px] text-emerald-400 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB • Ready to Ingest</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFile(null);
                                }}
                                className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                                <FileUp className="w-6 h-6" />
                              </div>
                              <div className="text-center">
                                <p className="text-xs font-semibold text-white">Click or drag & drop a research paper or manual</p>
                                <p className="text-[11px] text-zinc-500 mt-1">PDF, TXT, or Markdown (Max 20MB)</p>
                                <span className="inline-block mt-2 px-2.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-zinc-400 border border-white/5">
                                  Zero-storage: Parsed & vectorized in-memory
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Title Override */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Document Title</label>
                          <input
                            type="text"
                            placeholder="e.g. Chlorella Photobioreactor Growth Kinetics Study (2024)"
                            value={uploadDocTitle}
                            onChange={(e) => setUploadDocTitle(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500/50 transition-colors font-satoshi"
                          />
                        </div>

                        {/* Category Selector */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Category</label>
                          <select
                            value={uploadCategory}
                            onChange={(e) => setUploadCategory(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500/50 transition-colors font-satoshi cursor-pointer"
                          >
                            <option value="biology">Biology (Cultivation parameters, Chlorella, Growth Rate)</option>
                            <option value="hardware">Hardware (Sensors, ESP32, GPIO, Wiring, Tank Geometry)</option>
                            <option value="operation">Operation (Manual Overrides, Relays, Harvesting, Refill)</option>
                            <option value="safety">Safety (Emergency Shutdown, Safety Interlocks, Alarms)</option>
                            <option value="troubleshooting">Troubleshooting (I2C collisions, WiFi/MQTT recovery)</option>
                            <option value="architecture">Architecture (Dokploy, APIs, WebSockets, Monorepo layout)</option>
                            <option value="team">Creators & Team (MindZed, founders, engineers, contact)</option>
                            <option value="general">General & Overview (Project mission, purpose, background)</option>
                            <option value="custom">Custom Category... (Type your own)</option>
                          </select>
                          {uploadCategory === 'custom' && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-1"
                            >
                              <input
                                type="text"
                                placeholder="Enter custom category name..."
                                value={customUploadCategory}
                                onChange={(e) => setCustomUploadCategory(e.target.value)}
                                className="w-full bg-black/40 border border-emerald-500/40 rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-emerald-400 font-satoshi"
                              />
                            </motion.div>
                          )}
                        </div>

                        {/* Ingest Action Button */}
                        <button
                          onClick={handleUploadDocument}
                          disabled={isUploading || !selectedFile}
                          className="w-full mt-2 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl px-4 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{uploadStatus || 'Processing Document...'}</span>
                            </>
                          ) : (
                            <>
                              <FileUp className="w-4 h-4" />
                              <span>Ingest, Chunk & Vectorize Document</span>
                            </>
                          )}
                        </button>

                        {uploadStatus && !isUploading && (
                          <div className={`text-center text-xs font-semibold p-3 rounded-xl ${
                            uploadStatus.includes('Success') 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {uploadStatus}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
