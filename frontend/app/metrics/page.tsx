// app/metrics/page.tsx
// Metrics page for the bioreactor

"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Activity, Thermometer, Droplets, Wind, Focus, Cloud, Gauge } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';

// Custom Tooltip component for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/60 backdrop-blur-xl border border-white/[0.05] p-4 rounded-2xl shadow-2xl">
        <p className="text-zinc-400 text-xs font-mono mb-3 uppercase tracking-wider">{label}</p>
        <div className="space-y-2 font-satoshi">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center gap-4 justify-between text-sm">
              <span className="flex items-center gap-2" style={{ color: entry.color }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 10px ${entry.color}` }} />
                {entry.name}
              </span>
              <span className="font-bold text-white tracking-wide">
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function MetricsPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1D' | '7D' | '30D'>('7D');
  const [realData, setRealData] = useState<any[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Export modal states
  const [exportDuration, setExportDuration] = useState<'1D' | '7D' | '30D' | 'CUSTOM'>('1D');
  const [exportCustomHours, setExportCustomHours] = useState(24);
  const [exportFormat, setExportFormat] = useState<'CSV' | 'PDF'>('CSV');
  const [isExporting, setIsExporting] = useState(false);

  const chartRef = useRef<HTMLDivElement>(null);

  const [activeMetrics, setActiveMetrics] = useState({
    waterTemp: true,
    airTemp: false,
    humidity: false,
    pressure: false,
    predictedPh: true,
    predictedDo: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Real Telemetry Data
  useEffect(() => {
    let hours = 168; // 7D default
    if (selectedTimeRange === '1D') hours = 24;
    if (selectedTimeRange === '30D') hours = 720;

    let API_URL = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:8080';
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      API_URL = API_URL.replace('http://', 'https://').replace(':8080', '');
    }

    fetch(`${API_URL}/api/telemetry/history?hours=${hours}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Format timestamps for the chart
          const formatted = data.map(item => {
             const d = new Date(item.timestamp);
             const timeStr = `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
             return {
               ...item,
               formattedTime: timeStr
             };
          });
          setRealData(formatted);
        }
      })
      .catch(console.error);
  }, [selectedTimeRange]);

  // Compute summary stats based on current data
  const summary = useMemo(() => {
    if (!realData.length) return null;
    const count = realData.length;
    
    const avgWTemp = realData.reduce((acc, curr) => acc + (curr.waterTemp || 0), 0) / count;
    const avgATemp = realData.reduce((acc, curr) => acc + (curr.airTemp || 0), 0) / count;
    const avgPh = realData.reduce((acc, curr) => acc + (curr.predictedPh || 0), 0) / count;
    const avgDO = realData.reduce((acc, curr) => acc + (curr.predictedDo || 0), 0) / count;

    return {
      avgWTemp: avgWTemp.toFixed(1),
      avgATemp: avgATemp.toFixed(1),
      avgPh: avgPh.toFixed(2),
      avgDO: avgDO.toFixed(1),
    };
  }, [realData]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let hours = 24;
      if (exportDuration === '1D') hours = 24;
      if (exportDuration === '7D') hours = 168;
      if (exportDuration === '30D') hours = 720;
      if (exportDuration === 'CUSTOM') hours = exportCustomHours;

      let API_URL = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:8080';
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        API_URL = API_URL.replace('http://', 'https://').replace(':8080', '');
      }

      // Fetch fresh data for export
      const res = await fetch(`${API_URL}/api/telemetry/history?hours=${hours}`);
      const exportData = await res.json();
      
      if (!Array.isArray(exportData) || exportData.length === 0) {
        alert("No data available to export.");
        setIsExporting(false);
        return;
      }

      const filename = `BioArc_Export_${new Date().getTime()}`;

      if (exportFormat === 'CSV') {
        const headers = ['Timestamp', 'State', 'WaterTemp', 'AirTemp', 'Humidity', 'Pressure', 'LevelCm', 'PredictedPh', 'PredictedDo'];
        let csvContent = headers.join(',') + '\n';
        
        exportData.forEach(row => {
          csvContent += `${row.timestamp},${row.state},${row.waterTemp},${row.airTemp},${row.humidity},${row.pressure},${row.levelCm},${row.predictedPh},${row.predictedDo}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // PDF Export
        const doc = new jsPDF('landscape');
        doc.setFontSize(18);
        doc.text("BioArc Telemetry Report", 14, 20);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        
        // Add chart screenshot if possible
        if (chartRef.current) {
          const imgData = await htmlToImage.toPng(chartRef.current, { backgroundColor: '#000000' });
          doc.addImage(imgData, 'PNG', 14, 35, 260, 80);
        }

        // Add a simple data table of the latest 50 records max
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Latest Records Sample:", 14, 130);
        
        const startY = 140;
        let currentY = startY;
        
        doc.setFontSize(9);
        const colX = [14, 70, 100, 130, 160, 190, 220, 250];
        const headers = ['Timestamp', 'State', 'W.Temp', 'A.Temp', 'Hum', 'Press', 'pH', 'DO'];
        
        // Draw Headers
        headers.forEach((h, i) => doc.text(h, colX[i], currentY));
        currentY += 6;
        
        const sampleData = exportData.slice(-40).reverse(); // Last 40 records
        
        sampleData.forEach((row: any) => {
          if (currentY > 190) {
            doc.addPage();
            currentY = 20;
            headers.forEach((h, i) => doc.text(h, colX[i], currentY));
            currentY += 6;
          }
          const d = new Date(row.timestamp);
          const t = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
          
          doc.text(t, colX[0], currentY);
          doc.text(row.state || '-', colX[1], currentY);
          doc.text((row.waterTemp || 0).toFixed(1), colX[2], currentY);
          doc.text((row.airTemp || 0).toFixed(1), colX[3], currentY);
          doc.text((row.humidity || 0).toFixed(1), colX[4], currentY);
          doc.text((row.pressure || 0).toFixed(1), colX[5], currentY);
          doc.text((row.predictedPh || 0).toFixed(2), colX[6], currentY);
          doc.text((row.predictedDo || 0).toFixed(2), colX[7], currentY);
          currentY += 6;
        });
        
        doc.save(`${filename}.pdf`);
      }
      
      setIsExportModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!mounted) return null;

  const toggleMetric = (metricKey: keyof typeof activeMetrics) => {
    setActiveMetrics(prev => ({ ...prev, [metricKey]: !prev[metricKey] }));
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 min-h-0 overflow-y-auto lg:overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* HEADER SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 bg-black/40 backdrop-blur-xl border border-white/[0.05] p-4 rounded-3xl shadow-xl"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/[0.03] rounded-xl border border-white/[0.05]">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-clash text-lg font-bold text-white tracking-wide">Telemetry Explorer</h2>
            <p className="text-xs text-zinc-400 font-satoshi">Historical Sensor Analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <div className="flex bg-black/40 border border-white/[0.05] rounded-full p-1 backdrop-blur-md">
            {(['1D', '7D', '30D'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 ${
                  selectedTimeRange === range
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] border border-emerald-500/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-full text-zinc-300 text-xs font-semibold uppercase tracking-wider transition-all hover:border-white/10 group">
            <Download className="w-4 h-4 group-hover:text-emerald-400 transition-colors" />
            Export
          </button>
        </div>
      </motion.div>

      {/* MAIN CHART AREA */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1 min-h-[400px] flex flex-col bg-black/20 backdrop-blur-xl border border-white/[0.02] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-6 relative overflow-hidden"
      >
        {/* Metric Toggles */}
        <div className="flex flex-wrap gap-3 mb-6 shrink-0 relative z-10">
          <MetricToggle label="Water Temp" icon={<Thermometer className="w-3.5 h-3.5" />} color="#f59e0b" active={activeMetrics.waterTemp} onClick={() => toggleMetric('waterTemp')} />
          <MetricToggle label="Air Temp" icon={<Cloud className="w-3.5 h-3.5" />} color="#fb923c" active={activeMetrics.airTemp} onClick={() => toggleMetric('airTemp')} />
          <MetricToggle label="Humidity" icon={<Droplets className="w-3.5 h-3.5" />} color="#38bdf8" active={activeMetrics.humidity} onClick={() => toggleMetric('humidity')} />
          <MetricToggle label="Pressure" icon={<Gauge className="w-3.5 h-3.5" />} color="#94a3b8" active={activeMetrics.pressure} onClick={() => toggleMetric('pressure')} />
          <MetricToggle label="pH Level" icon={<Focus className="w-3.5 h-3.5" />} color="#a855f7" active={activeMetrics.predictedPh} onClick={() => toggleMetric('predictedPh')} />
          <MetricToggle label="D.O." icon={<Wind className="w-3.5 h-3.5" />} color="#3b82f6" active={activeMetrics.predictedDo} onClick={() => toggleMetric('predictedDo')} />
        </div>

        {/* The Recharts Graph */}
        <div ref={chartRef} className="flex-1 w-full min-h-0 relative z-10 bg-black/10 rounded-xl p-2">
          {realData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="formattedTime" 
                  stroke="rgba(255,255,255,0.2)" 
                  tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                  tickMargin={10}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.2)" 
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  tickMargin={10}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                
                {activeMetrics.waterTemp && <Line type="monotone" dataKey="waterTemp" name="Water Temp (°C)" stroke="#f59e0b" strokeWidth={2} dot={false} />}
                {activeMetrics.airTemp && <Line type="monotone" dataKey="airTemp" name="Air Temp (°C)" stroke="#fb923c" strokeWidth={2} dot={false} />}
                {activeMetrics.humidity && <Line type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#38bdf8" strokeWidth={2} dot={false} />}
                {activeMetrics.pressure && <Line type="monotone" dataKey="pressure" name="Pressure (hPa)" stroke="#94a3b8" strokeWidth={2} dot={false} />}
                {activeMetrics.predictedPh && <Line type="monotone" dataKey="predictedPh" name="pH Level" stroke="#a855f7" strokeWidth={2} dot={false} />}
                {activeMetrics.predictedDo && <Area type="monotone" dataKey="predictedDo" name="D.O. (mg/L)" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorDO)" />}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-mono text-sm">
              No historical data available.
            </div>
          )}
        </div>
      </motion.div>

      {/* BOTTOM SECTION: KEY INDICATORS */}
      {summary && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0"
        >
          <SummaryCard label="Avg Water Temp" value={`${summary.avgWTemp}°C`} color="amber" />
          <SummaryCard label="Avg Air Temp" value={`${summary.avgATemp}°C`} color="emerald" />
          <SummaryCard label="Mean pH Level" value={summary.avgPh} color="purple" />
          <SummaryCard label="Average D.O." value={`${summary.avgDO} mg/L`} color="blue" />
        </motion.div>
      )}

      {/* EXPORT MODAL */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isExporting && setIsExportModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-low border border-outline-variant p-6 rounded-2xl shadow-2xl relative z-10 w-full max-w-md"
            >
              <h3 className="text-xl font-bold font-clash text-white mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" /> Export Data
              </h3>
              
              <div className="space-y-4 font-satoshi">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Duration</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['1D', '7D', '30D', 'CUSTOM'] as const).map(d => (
                      <button 
                        key={d} 
                        onClick={() => setExportDuration(d)}
                        className={`py-2 rounded-lg text-sm font-medium border transition-colors ${exportDuration === d ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-surface-container border-outline-variant/30 text-zinc-300'}`}
                      >
                        {d === 'CUSTOM' ? 'Custom Hours' : d}
                      </button>
                    ))}
                  </div>
                  {exportDuration === 'CUSTOM' && (
                    <div className="mt-3">
                      <input 
                        type="number" 
                        min="1" 
                        value={exportCustomHours} 
                        onChange={(e) => setExportCustomHours(parseInt(e.target.value) || 1)}
                        className="w-full bg-surface-container border border-outline-variant/50 rounded-lg p-2 text-white outline-none focus:border-primary"
                        placeholder="Hours (e.g. 48)"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setExportFormat('CSV')}
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors ${exportFormat === 'CSV' ? 'bg-secondary-fixed/20 border-secondary/50 text-secondary-fixed' : 'bg-surface-container border-outline-variant/30 text-zinc-300'}`}
                    >
                      CSV
                    </button>
                    <button 
                      onClick={() => setExportFormat('PDF')}
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors ${exportFormat === 'PDF' ? 'bg-error/20 border-error/50 text-error' : 'bg-surface-container border-outline-variant/30 text-zinc-300'}`}
                    >
                      PDF
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  onClick={() => setIsExportModalOpen(false)}
                  disabled={isExporting}
                  className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-on-primary font-semibold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isExporting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {isExporting ? 'Exporting...' : 'Export Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-components
function MetricToggle({ label, icon, color, active, onClick }: { label: string, icon: React.ReactNode, color: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border ${
        active 
          ? 'bg-white/[0.03] text-white shadow-lg' 
          : 'bg-transparent border-transparent text-zinc-600 hover:text-zinc-400'
      }`}
      style={{ borderColor: active ? `${color}40` : 'transparent' }}
    >
      <div 
        className={`flex items-center justify-center transition-all ${active ? '' : 'opacity-40 grayscale'}`}
        style={{ color: active ? color : undefined }}
      >
        {icon}
      </div>
      {label}
      {active && (
        <div className="w-1.5 h-1.5 rounded-full ml-1 animate-pulse" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      )}
    </button>
  );
}

function SummaryCard({ label, value, color }: { label: string, value: string, color: 'emerald' | 'amber' | 'purple' | 'blue' }) {
  const colorMap = {
    emerald: 'text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] border-emerald-500/20',
    amber: 'text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] border-amber-500/20',
    purple: 'text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)] border-purple-500/20',
    blue: 'text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] border-blue-500/20',
  };

  return (
    <div className={`flex flex-col gap-1 p-5 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/[0.02] relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -z-10 opacity-20 transition-transform duration-700 group-hover:scale-150 ${colorMap[color].split(' ')[0].replace('text', 'bg')}`} />
      
      <span className="text-[10px] uppercase tracking-widest font-mono text-zinc-500">{label}</span>
      <span className={`font-clash text-2xl font-bold tracking-wide ${colorMap[color].split(' ')[0]}`}>{value}</span>
    </div>
  );
}
