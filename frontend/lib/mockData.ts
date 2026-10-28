// lib/mockData.ts
// This file will be used to generate mock data for the frontend

export interface TelemetryData {
  waterTemp: number;
  ambientTemp: number;
  humidity: number;
  pressure: number;
  reservoirVolume: number;
  algaeGrowthRate: number;
  predictedPh: number;
  predictedDo: number;
  chlAUgl?: number;
  pseudoOd?: number;
  vegIndex?: number;
  greenRatio?: number;
  grRatio?: number;
  tcsR?: number;
  tcsG?: number;
  tcsB?: number;
  tcsC?: number;
  hasBaseline?: boolean;
}

export interface FSMState {
  mode: 'AUTONOMOUS' | 'MANUAL' | 'DIAGNOSTIC';
  inletPump: boolean;
  outletPump: boolean;
  airCompressor: boolean;
  agitator: boolean;
  ledPanels: boolean;
}

export function generateMockTelemetry(): TelemetryData {
  const baseWaterTemp = 24.5;
  const baseAmbientTemp = 22.0;
  const baseHumidity = 65;
  const basePressure = 1013;
  const baseVolume = 85.0;
  const baseGrowth = 0.08;
  const basePh = 7.2;
  const baseDo = 6.8;

  const jitter = (range: number) => (Math.random() - 0.5) * range;

  return {
    waterTemp: Number((baseWaterTemp + jitter(1.5)).toFixed(1)),
    ambientTemp: Number((baseAmbientTemp + jitter(2.0)).toFixed(1)),
    humidity: Number((baseHumidity + jitter(5)).toFixed(0)),
    pressure: Number((basePressure + jitter(4)).toFixed(0)),
    reservoirVolume: Number((baseVolume + jitter(0.5)).toFixed(1)),
    algaeGrowthRate: Number((baseGrowth + jitter(0.01)).toFixed(3)),
    predictedPh: Number((basePh + jitter(0.4)).toFixed(2)),
    predictedDo: Number((baseDo + jitter(0.8)).toFixed(2)),
    chlAUgl: Number((265.5 + jitter(15)).toFixed(1)),
    pseudoOd: Number((0.312 + jitter(0.02)).toFixed(3)),
    vegIndex: Number((0.158 + jitter(0.01)).toFixed(3)),
    greenRatio: Number((0.386 + jitter(0.02)).toFixed(3)),
    grRatio: Number((1.185 + jitter(0.05)).toFixed(3)),
    tcsR: Math.round(1495 + jitter(50)),
    tcsG: Math.round(1772 + jitter(50)),
    tcsB: Math.round(1320 + jitter(50)),
    tcsC: Math.round(4580 + jitter(100)),
    hasBaseline: true,
  };
}

export function generateMockFSM(): FSMState {
  return {
    mode: 'AUTONOMOUS',
    inletPump: Math.random() > 0.8,
    outletPump: Math.random() > 0.9,
    airCompressor: Math.random() > 0.3,
    agitator: Math.random() > 0.1,
    ledPanels: Math.random() > 0.05,
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  date: string;
  messages: ChatMessage[];
}

export function generateMockChatHistory(): ChatSession[] {
  return [
    {
      id: "session-1",
      title: "Optimize Algae Yield",
      date: "Today, 10:42 AM",
      messages: [
        { id: "msg-1", role: "user", content: "The algae growth rate seems a bit low today. Can you analyze the current telemetry?", timestamp: "10:42 AM" },
        { id: "msg-2", role: "assistant", content: "I've analyzed the telemetry. The current water temperature is 24.2°C, which is slightly below the optimal 26°C for maximum yield. Additionally, the predicted pH is trending towards 7.4. I recommend increasing the LED panel intensity and slightly elevating the inlet pump duty cycle to balance the pH.", timestamp: "10:43 AM" },
        { id: "msg-3", role: "user", content: "Go ahead and apply those changes.", timestamp: "10:45 AM" },
        { id: "msg-4", role: "assistant", content: "Applied. FSM state updated. LED Panels active. Monitoring pH stabilization...", timestamp: "10:45 AM" }
      ]
    },
    {
      id: "session-2",
      title: "System Diagnostics Check",
      date: "Yesterday, 2:15 PM",
      messages: [
        { id: "msg-5", role: "user", content: "Run a full system diagnostic.", timestamp: "2:15 PM" },
        { id: "msg-6", role: "assistant", content: "Running diagnostics...\n\n- Pumps: OK\n- Sensors: OK\n- Agitator Motor: Drawing slightly higher current (1.2A), but within normal range.\n- Reservoir: 85% full.\n\nOverall system health is nominal.", timestamp: "2:16 PM" }
      ]
    },
    {
      id: "session-3",
      title: "Manual Override Request",
      date: "Oct 12, 09:00 AM",
      messages: [
        { id: "msg-7", role: "user", content: "Switch to manual mode and shut down the air compressor.", timestamp: "09:00 AM" },
        { id: "msg-8", role: "assistant", content: "Switching FSM to MANUAL mode. Air compressor disabled. Warning: DO levels may drop if left off for extended periods.", timestamp: "09:01 AM" }
      ]
    }
  ];
}

export interface SystemLog {
  id: string;
  timestamp: string;
  severity: 'nominal' | 'warning' | 'critical';
  message: string;
}

export interface HardwareLifespan {
  id: string;
  name: string;
  healthPercentage: number;
  componentId?: string;
  type?: string;
  totalToggles?: number;
  totalRuntimeSec?: number;
  ratedToggles?: number;
  ratedRuntimeSec?: number;
  status?: string;
  aiReason?: string;
}

export function generateMockMaintenanceData(): { logs: SystemLog[], hardware: HardwareLifespan[] } {
  return {
    hardware: [
      { id: "hw-1", name: "Inlet Pump (Relay 1)", healthPercentage: 92 },
      { id: "hw-2", name: "Outlet Pump (Relay 2)", healthPercentage: 88 },
      { id: "hw-3", name: "Air Compressor (Relay 3)", healthPercentage: 45 },
      { id: "hw-4", name: "Agitator Motor", healthPercentage: 68 },
    ],
    logs: [
      { id: "log-1", timestamp: "10:45:12 AM", severity: 'nominal', message: "System initialization complete. All sensors active." },
      { id: "log-2", timestamp: "11:02:05 AM", severity: 'nominal', message: "Agitator motor engaged. Current draw: 1.1A." },
      { id: "log-3", timestamp: "11:15:30 AM", severity: 'warning', message: "Air compressor thermal warning. Operating at 65°C." },
      { id: "log-4", timestamp: "12:00:00 PM", severity: 'nominal', message: "Routine diagnostic sweep completed successfully." },
      { id: "log-5", timestamp: "01:30:45 PM", severity: 'critical', message: "Optical density sensor calibration drift detected. Manual recalibration required." },
      { id: "log-6", timestamp: "02:15:20 PM", severity: 'nominal', message: "FSM Mode transitioned to AUTONOMOUS." },
      { id: "log-7", timestamp: "02:20:10 PM", severity: 'warning', message: "Inlet pump flow rate slightly below target (0.4 L/m)." },
    ]
  };
}

export interface HistoricalDataPoint {
  timestamp: string; // e.g., "Mon 12:00" or date string
  waterTemp: number;
  ph: number;
  dissolvedOxygen: number;
  flowRate: number;
  opticalDensity: number;
}

export function generateMockMetricsData(days: number): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  const now = new Date();
  
  // Generate a point every 6 hours for the given number of days
  const points = days * 4;
  
  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 6 * 60 * 60 * 1000);
    const dayStr = time.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' });
    
    // Create realistic wavy patterns
    const wave = Math.sin(i / 3);
    
    data.push({
      timestamp: dayStr,
      waterTemp: 22 + wave * 1.5 + Math.random() * 0.5,
      ph: 7.0 + (Math.cos(i / 2) * 0.2) + Math.random() * 0.1,
      dissolvedOxygen: 6.5 + (wave * 0.8) + Math.random() * 0.2,
      flowRate: 0.5 + (Math.sin(i / 4) * 0.05) + Math.random() * 0.02,
      opticalDensity: 1.2 + (points - i) * 0.01 + Math.random() * 0.05 // gradual growth over time
    });
  }
  
  return data;
}
