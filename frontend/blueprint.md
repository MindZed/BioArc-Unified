# BioArc Next.js Frontend Architecture Blueprint

## 1. Project Overview
BioArc is an enterprise-grade IoT interface for an automated microalgae bioreactor. The application monitors telemetry, visualizes machine learning predictions (pH and Dissolved Oxygen), tracks algorithmic biological growth, and features an integrated AI command center.

**Current Scope:** Generate the complete FRONTEND UI/UX using highly structured mock data. The backend (MQTT, PostgreSQL, Python ML) is hosted separately on a VPS and will be connected later.

## 2. Tech Stack & Dependencies
- **Framework:** Next.js (App Router, React 18+)
- **Styling:** Tailwind CSS (Strictly Dark Theme)
- **UI Components:** shadcn/ui (Cards, Buttons, Inputs, Dialogs, Select, Tabs)
- **Animations:** Framer Motion (Page transitions, stagger effects, hover states)
- **Charting:** Recharts (Sparklines, multi-axis telemetry graphs, area charts)
- **Icons:** Lucide React
- **State Management:** Zustand (for managing mock global FSM states and UI toggles)

## 3. Design System & Theme
- **Global Theme:** Enforced Dark Mode.
- **Backgrounds:** Deep blacks (`bg-zinc-950`) for main layouts, dark charcoal (`bg-zinc-900`) for cards.
- **Borders & Shadows:** Subtle borders (`border-zinc-800`), smooth ambient shadows, and pronounced rounded corners (`rounded-3xl` for main bento cards, `rounded-2xl` for smaller elements).
- **Accents:** 
  - Primary UI highlights: Glowing Mint-Green / Emerald (`emerald-500` to `emerald-400`).
  - ML/Virtual Data: Neon Cyan (`cyan-400`) and Indigo (`indigo-400`).
  - Warnings/Alerts: Amber (`amber-500`) and Red (`red-500`).
- **Typography:** Clean, sans-serif (`font-sans`), high contrast crisp white for primary metrics, muted gray (`text-zinc-400`) for labels and timestamps.

## 4. Mock Data & State Architecture (Crucial)
Do NOT attempt to write real database or API connections. Instead, create a `lib/mockData.ts` file containing robust TypeScript interfaces and generate realistic, fluctuating dummy data for the following:
- **Telemetry:** Water Temp, Ambient Temp, Humidity, Pressure, Reservoir Volume, Algae Growth Rate (μ), and ML-Predicted pH & DO.
- **Actuators (FSM):** Real-time ON/OFF booleans for Inlet Pump, Outlet Pump, Air Compressor, Agitator, and LED Panels.
- **Chat History:** An array of structured chat sessions (User vs. AI roles) with simulated JSON tool-call responses.
- **Logs:** Array of timestamped system events and hardware lifespan percentages (0-100%).
- *Create custom React hooks (e.g., `useTelemetry()`, `useFSMState()`) that return this mock data so it can easily be swapped for real API calls later.*

## 5. Page Implementations

### Page 1: The Main Dashboard (`/dashboard`)
**Layout:** A highly responsive "Bento Box" grid using staggered Framer Motion slide-up animations.
- **Top Status Bar:** Full-width ticker showing simulated MQTT connection, ML model status, and FSM Mode (e.g., "AUTONOMOUS").
- **Top Metrics Row (4 Cards):** 
  - Card 1: Algae Growth Rate (μ) showing a formulaic calculated rate (e.g., "0.34 h⁻¹").
  - Card 2: Physical Climate (Water Temp, Air Temp, Humidity, Pressure).
  - Card 3 & 4: Virtual Sensors (pH and DO) with "🤖 ML Predicted" badges.
  - *Design Note:* These 4 cards must have an axis-less Recharts area graph (sparkline) acting as the background of the card.
- **Middle Row:** 
  - Left: Large "Carbon Capture & O² Yield" split-card showing mock sequestered CO2 vs O2 produced, featuring a clean SVG/Vector schematic of a rectangular reactor tank.
  - Right: Vertical "Actuator Array" displaying the real-time ON/OFF state of the relays with glowing dot indicators.

### Page 2: Chatbot Command Center (`/chatbot`)
**Layout:** A split-screen NLP interface.
- **Left Side (70%):** The main chat console.
  - Header: Contains a toggle switch for "⚡ Fast Mode" vs "🧠 Deep Think Mode".
  - Chat Window: User messages aligned right (emerald gradient), AI messages aligned left (zinc-800).
  - Input Bar: Pill-shaped `bg-zinc-900` text area sticking to the bottom with an animated emerald "Send" button.
- **Right Side (30%):** The sliding Chat Session History sidebar.
  - Contains a "New Session" button, a scrollable list of past mock sessions, and a mini "Live FSM State" widget pinned to the bottom.

### Page 3: Historical Metrics Explorer (`/metrics`)
**Layout:** Data-heavy bento grid optimized for deep analysis.
- **Header:** Features a Date-Range selector and a prominent "Export Data" button (no actual download logic required yet, just UI).
- **Charts (using Recharts):**
  - Hero Chart: Large area chart tracking Biomass Growth & Accumulation Trends.
  - Split Charts: Multi-axis line chart comparing Predicted pH vs. DO, and a combined line/bar chart for Thermal & Environmental Telemetry.
  - Bottom Chart: A stepped-line or Gantt-style timeline visualizing Actuator Duty Cycles (when pumps/lights were active).

### Page 4: Predictive Maintenance (`/maintenance`)
**Layout:** Diagnostic dashboard for physical hardware lifecycle.
- **Top Section:** 
  - "Relay & Pump Lifespans": Visual horizontal health bars for the Air Compressor and Pumps. Green (healthy) -> Amber (warning) -> Red (critical).
  - "Agitator Diagnostics": A circular radial progress indicator showing remaining lifespan percentage.
  - "Optical Sensor Wiper": A countdown timer to the next automated magnetic sweep, with a manual override trigger button.
- **Bottom Section:** A wide, terminal-styled log table (`bg-zinc-950` inset) rendering a vertically scrollable list of timestamped wear-and-tear events and system warnings.

## 6. Execution Instructions for the AI Agent
1. Initialize the Next.js project and configure Tailwind for dark mode.
2. Install `framer-motion`, `recharts`, `lucide-react`, and `zustand`.
3. Set up the `components/ui` folder using the shadcn/ui design system.
4. Build the `mockData.ts` file and state hooks first.
5. Generate the layout shell (Navigation sidebar + main content area).
6. Build the 4 pages sequentially, ensuring all Framer Motion entrance animations trigger correctly on navigation.