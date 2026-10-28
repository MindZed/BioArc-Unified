// lib/store.ts
import { create } from 'zustand';
import { 
  TelemetryData, FSMState, ChatSession, SystemLog, HardwareLifespan, 
  HistoricalDataPoint, generateMockTelemetry, generateMockFSM, 
  generateMockMaintenanceData, generateMockMetricsData 
} from './mockData';

let API_BASE_URL = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:8080';

if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
  API_BASE_URL = API_BASE_URL.replace('http://', 'https://').replace(':8080', '');
}

interface BioArcStore {
  isWsConnected: boolean;
  espConnected: boolean;
  telemetry: TelemetryData;
  fsm: FSMState;
  fsmCurrentState: string;
  isSidebarCollapsed: boolean;
  chatHistory: ChatSession[];
  activeSessionId: string | null;
  fastMode: boolean;
  maintenanceLogs: SystemLog[];
  hardwareLifespan: HardwareLifespan[];
  agitatorDiagnostics: { status: string; summary: string };
  systemHealthSummary: string;
  lastAnalyzedAt: string | null;
  selectedTimeRange: '7D' | '30D' | 'ALL';
  metricsData: HistoricalDataPoint[];
  
  // Real-time WebSocket Actions
  setWsConnected: (connected: boolean) => void;
  setEspConnected: (connected: boolean) => void;
  handleLiveTelemetry: (data: any) => void;
  sendActionCommand: (action: string) => Promise<boolean>;
  sendConfigCommand: (config: any) => Promise<boolean>;
  updateTelemetry: () => void;
  updateFSM: () => void;
  
  // UI & App Actions
  toggleSidebar: () => void;
  setActiveSession: (id: string | null) => void;
  createNewSession: () => Promise<void>;
  sendMessage: (content: string) => void;
  toggleFastMode: () => void;
  addMaintenanceLog: (message: string, severity: 'nominal' | 'warning' | 'critical') => void;
  setSelectedTimeRange: (range: '7D' | '30D' | 'ALL') => void;
  setChatHistory: (sessions: any[]) => void;
  deleteSession: (id: string) => void;
  updateSessionTitle: (id: string, newTitle: string) => void;
  setMaintenanceData: (data: { lifespans: HardwareLifespan[]; agitatorDiagnostics: { status: string; summary: string }; systemHealthSummary?: string; lastAnalyzedAt?: string }) => void;
}

export const useStore = create<BioArcStore>((set, get) => ({
  isWsConnected: false,
  espConnected: true,
  telemetry: generateMockTelemetry(),
  fsm: generateMockFSM(),
  fsmCurrentState: 'IDLE',
  isSidebarCollapsed: true,
  chatHistory: [],
  activeSessionId: null,
  fastMode: true,
  maintenanceLogs: [],
  hardwareLifespan: [
    { id: 'relay-intake', componentId: 'relay-intake', name: 'Intake Pump (Relay 1)', type: 'pump', healthPercentage: 100, totalToggles: 0, totalRuntimeSec: 0, ratedToggles: 50000, ratedRuntimeSec: 18000000, status: 'NOMINAL' },
    { id: 'relay-outtake', componentId: 'relay-outtake', name: 'Outlet Pump (Relay 2)', type: 'pump', healthPercentage: 100, totalToggles: 0, totalRuntimeSec: 0, ratedToggles: 50000, ratedRuntimeSec: 18000000, status: 'NOMINAL' },
    { id: 'relay-air', componentId: 'relay-air', name: 'Air Compressor (Relay 3)', type: 'compressor', healthPercentage: 100, totalToggles: 0, totalRuntimeSec: 0, ratedToggles: 20000, ratedRuntimeSec: 9000000, status: 'NOMINAL' },
    { id: 'relay-agitator', componentId: 'relay-agitator', name: 'Agitator Motor (Relay 5)', type: 'motor', healthPercentage: 100, totalToggles: 0, totalRuntimeSec: 0, ratedToggles: 30000, ratedRuntimeSec: 10800000, status: 'NOMINAL' },
    { id: 'relay-light', componentId: 'relay-light', name: 'LED Grow Panel (Relay 4)', type: 'light', healthPercentage: 100, totalToggles: 0, totalRuntimeSec: 0, ratedToggles: 100000, ratedRuntimeSec: 72000000, status: 'NOMINAL' },
    { id: 'sensor-ultrasonic', componentId: 'sensor-ultrasonic', name: 'Water Level Sensor (HC-SR04)', type: 'sensor', healthPercentage: 100, totalToggles: 0, totalRuntimeSec: 0, ratedToggles: 100000, ratedRuntimeSec: 36000000, status: 'NOMINAL' },
    { id: 'sensor-color', componentId: 'sensor-color', name: 'Color Sensor (TCS34725)', type: 'sensor', healthPercentage: 100, totalToggles: 0, totalRuntimeSec: 0, ratedToggles: 100000, ratedRuntimeSec: 36000000, status: 'NOMINAL' },
    { id: 'sensor-temp', componentId: 'sensor-temp', name: 'Water Temp Sensor (DS18B20)', type: 'sensor', healthPercentage: 100, totalToggles: 0, totalRuntimeSec: 0, ratedToggles: 100000, ratedRuntimeSec: 36000000, status: 'NOMINAL' },
    { id: 'sensor-env', componentId: 'sensor-env', name: 'Environment Sensor (BME280)', type: 'sensor', healthPercentage: 100, totalToggles: 0, totalRuntimeSec: 0, ratedToggles: 100000, ratedRuntimeSec: 36000000, status: 'NOMINAL' },
  ],
  agitatorDiagnostics: {
    status: "OPTIMAL STATUS",
    summary: "Magnetic sweep and motor impedance sensors suggest nominal wear on the primary bioreactor agitation unit."
  },
  systemHealthSummary: "All bioreactor hardware components and relay actuators are currently operating within nominal parameters with optimal lifespan reserves.",
  lastAnalyzedAt: new Date().toISOString(),
  selectedTimeRange: '7D',
  metricsData: generateMockMetricsData(7),

  setWsConnected: (connected) => set({ isWsConnected: connected }),
  setEspConnected: (connected) => set({ espConnected: connected }),
  updateTelemetry: () => {},
  updateFSM: () => {},

  handleLiveTelemetry: (data) => set((state) => {
    // Map live telemetry packet from Go Backend (contains sensor readings + ML predictions)
    // The Go backend wraps it in { type: 'telemetry', payload: { ... } }
    const t = data.payload || data;
    
    const newTelemetry: TelemetryData = {
      waterTemp: t.waterTemp ?? t.water_temp ?? state.telemetry.waterTemp,
      ambientTemp: t.airTemp ?? t.air_temp ?? state.telemetry.ambientTemp,
      humidity: t.humidity ?? state.telemetry.humidity,
      pressure: t.pressure ?? state.telemetry.pressure,
      reservoirVolume: (t.levelCm !== undefined || t.level_cm !== undefined) 
        ? Math.max(0, Math.min(100, ((34 - (t.levelCm ?? t.level_cm)) / 30) * 100)) 
        : state.telemetry.reservoirVolume,
      algaeGrowthRate: t.growthRateU ?? t.growth_rate_u ?? state.telemetry.algaeGrowthRate,
      predictedPh: t.predictedPh ?? t.predicted_ph ?? state.telemetry.predictedPh,
      predictedDo: t.predictedDo ?? t.predicted_do ?? state.telemetry.predictedDo,
      chlAUgl: t.chlAUgl ?? t.chl_a_ugl ?? state.telemetry.chlAUgl,
      pseudoOd: t.pseudoOd ?? t.pseudo_od ?? state.telemetry.pseudoOd,
      vegIndex: t.vegIndex ?? t.veg_index ?? state.telemetry.vegIndex,
      greenRatio: t.greenRatio ?? t.green_ratio ?? state.telemetry.greenRatio,
      grRatio: t.grRatio ?? t.gr_ratio ?? state.telemetry.grRatio,
      tcsR: t.tcsR ?? t.TCS34725_R ?? t.tcs_r ?? state.telemetry.tcsR,
      tcsG: t.tcsG ?? t.TCS34725_G ?? t.tcs_g ?? state.telemetry.tcsG,
      tcsB: t.tcsB ?? t.TCS34725_B ?? t.tcs_b ?? state.telemetry.tcsB,
      tcsC: t.tcsC ?? t.TCS34725_C ?? t.tcs_c ?? state.telemetry.tcsC,
      hasBaseline: t.hasBaseline ?? t.has_baseline ?? state.telemetry.hasBaseline,
    };

    const incomingState = t.state || state.fsmCurrentState;
    const newMode = (incomingState === 'MANUAL') ? 'MANUAL' 
                  : (incomingState === 'DIAGNOSTIC') ? 'DIAGNOSTIC' 
                  : (incomingState === 'OFFLINE') ? state.fsm.mode 
                  : 'AUTONOMOUS';

    const newFSM: FSMState = {
      mode: t.mode || newMode,
      inletPump: t.relayIntake ?? t.relays?.intake ?? state.fsm.inletPump,
      outletPump: t.relayOuttake ?? t.relays?.outtake ?? state.fsm.outletPump,
      airCompressor: t.relayAir ?? t.relays?.air ?? state.fsm.airCompressor,
      ledPanels: t.relayLight ?? t.relays?.light ?? state.fsm.ledPanels,
      agitator: t.relayAgitator ?? t.relays?.agitator ?? state.fsm.agitator,
    };

    return {
      telemetry: newTelemetry,
      fsm: newFSM,
      fsmCurrentState: incomingState
    };
  }),

  sendActionCommand: async (action: string) => {
    try {
      console.log(`[API Command] Sending action: ${action} to ${API_BASE_URL}/api/command`);
      const response = await fetch(`${API_BASE_URL}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        console.log(`[API Command] Action ${action} executed successfully!`);
        get().addMaintenanceLog(`Command executed: ${action}`, 'nominal');
        
        // Optimistic UI updates for offline testing & instant dashboard feedback
        const currentFsm = get().fsm;
        if (action === 'manual_mode_on' || action === 'manual_override_on') {
          set({ fsmCurrentState: 'MANUAL', fsm: { ...currentFsm, mode: 'MANUAL' } });
        } else if (action === 'manual_mode_off' || action === 'manual_override_off') {
          set({ fsmCurrentState: 'AUTONOMOUS', fsm: { ...currentFsm, mode: 'AUTONOMOUS' } });
        } else if (action === 'light_on') set({ fsm: { ...currentFsm, ledPanels: true } });
        else if (action === 'light_off') set({ fsm: { ...currentFsm, ledPanels: false } });
        else if (action === 'intake_on') set({ fsm: { ...currentFsm, inletPump: true } });
        else if (action === 'intake_off') set({ fsm: { ...currentFsm, inletPump: false } });
        else if (action === 'outtake_on') set({ fsm: { ...currentFsm, outletPump: true } });
        else if (action === 'outtake_off') set({ fsm: { ...currentFsm, outletPump: false } });
        else if (action === 'air_on') set({ fsm: { ...currentFsm, airCompressor: true } });
        else if (action === 'air_off') set({ fsm: { ...currentFsm, airCompressor: false } });
        else if (action === 'agitator_on') set({ fsm: { ...currentFsm, agitator: true } });
        else if (action === 'agitator_off') set({ fsm: { ...currentFsm, agitator: false } });

        return true;
      } else {
        console.error(`[API Command] Failed with status ${response.status}`);
        get().addMaintenanceLog(`Command failed: ${action}`, 'warning');
        return false;
      }
    } catch (err) {
      console.error(`[API Command] Network error sending command:`, err);
      get().addMaintenanceLog(`Network error sending command: ${action}`, 'critical');
      return false;
    }
  },

  sendConfigCommand: async (config: any) => {
    try {
      console.log(`[API Command] Sending config to ${API_BASE_URL}/api/config:`, config);
      const response = await fetch(`${API_BASE_URL}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        console.log(`[API Command] Config updated successfully!`);
        get().addMaintenanceLog(`Config updated successfully`, 'nominal');
        return true;
      } else {
        console.error(`[API Command] Config failed with status ${response.status}`);
        get().addMaintenanceLog(`Config update failed`, 'warning');
        return false;
      }
    } catch (err) {
      console.error(`[API Command] Network error sending config:`, err);
      get().addMaintenanceLog(`Network error sending config`, 'critical');
      return false;
    }
  },

  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setActiveSession: (id) => set({ activeSessionId: id }),
  createNewSession: async () => {
    set({ activeSessionId: 'new' });
  },
  sendMessage: (content) => set((state) => {
    if (!state.activeSessionId) return state;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const mockAiResponse = {
      id: `ai-${Date.now()}`,
      role: 'assistant' as const,
      content: "I've received your query. Analyzing live bioreactor telemetry...",
      timestamp: now
    };

    const newHistory = state.chatHistory.map(session => {
      if (session.id === state.activeSessionId) {
        return {
          ...session,
          messages: [
            ...session.messages,
            { id: `msg-${Date.now()}`, role: 'user' as const, content, timestamp: now },
            mockAiResponse
          ]
        };
      }
      return session;
    });

    return { chatHistory: newHistory };
  }),
  toggleFastMode: () => set((state) => ({ fastMode: !state.fastMode })),
  addMaintenanceLog: (message, severity) => set((state) => {
    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      severity,
      message,
    };
    return { maintenanceLogs: [newLog, ...state.maintenanceLogs] };
  }),
  setSelectedTimeRange: (range) => set({ 
    selectedTimeRange: range, 
    metricsData: generateMockMetricsData(range === '7D' ? 7 : range === '30D' ? 30 : 90) 
  }),
  setChatHistory: (sessions) => set({ chatHistory: sessions }),
  deleteSession: (id) => set((state) => {
    const newHistory = state.chatHistory.filter(s => s.id !== id);
    const newActiveSessionId = state.activeSessionId === id 
      ? (newHistory.length > 0 ? newHistory[0].id : null) 
      : state.activeSessionId;
    return { chatHistory: newHistory, activeSessionId: newActiveSessionId };
  }),
  updateSessionTitle: (id, newTitle) => set((state) => ({
    chatHistory: state.chatHistory.map(s => s.id === id ? { ...s, title: newTitle } : s)
  })),
  setMaintenanceData: (data) => set({
    hardwareLifespan: Array.isArray(data.lifespans) ? data.lifespans.map((item: any) => {
      const compId = item.componentId || item.id;
      const defaultName = compId === 'relay-intake' ? 'Intake Pump (Relay 1)'
        : compId === 'relay-outtake' ? 'Outlet Pump (Relay 2)'
        : compId === 'relay-air' ? 'Air Compressor (Relay 3)'
        : compId === 'relay-agitator' ? 'Agitator Motor (Relay 5)'
        : compId === 'relay-light' ? 'LED Grow Panel (Relay 4)'
        : compId === 'sensor-ultrasonic' ? 'Water Level Sensor (HC-SR04)'
        : compId === 'sensor-color' ? 'Color Sensor (TCS34725)'
        : compId === 'sensor-temp' ? 'Water Temp Sensor (DS18B20)'
        : compId === 'sensor-env' ? 'Environment Sensor (BME280)'
        : compId;

      return {
        id: item.id || compId,
        componentId: compId,
        name: item.name || defaultName,
        type: item.type || 'component',
        healthPercentage: item.healthPercentage ?? item.currentHealthPct ?? 100,
        totalToggles: item.totalToggles ?? 0,
        totalRuntimeSec: item.totalRuntimeSec ?? 0,
        ratedToggles: item.ratedToggles ?? 100000,
        ratedRuntimeSec: item.ratedRuntimeSec ?? 36000000,
        status: item.status || 'NOMINAL',
        aiReason: item.aiReason || item.reason,
      };
    }) : [],
    agitatorDiagnostics: data.agitatorDiagnostics || { status: 'OPTIMAL STATUS', summary: 'Agitator motor sensors nominal.' },
    systemHealthSummary: data.systemHealthSummary || "All bioreactor hardware components and relay actuators are currently operating within nominal parameters with optimal lifespan reserves.",
    lastAnalyzedAt: data.lastAnalyzedAt || new Date().toISOString()
  }),
}));
