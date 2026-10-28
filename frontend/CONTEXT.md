# BioArc Project Context

## Overview

BioArc is an enterprise-grade IoT interface for an automated microalgae bioreactor. The frontend focuses on visualizing telemetry, ML predictions (pH & DO), biological growth, and features an integrated AI command center. The backend (MQTT, PostgreSQL, Python ML) is hosted separately and is currently mocked.

## Tech Stack

- **Framework**: Next.js (App Router, React 19)
- **Styling**: Tailwind CSS v4 (Strict Dark Theme, Glassmorphism accents)
- **UI & Animations**: shadcn/ui, framer-motion (Stagger effects, Slide-ups)
- **Charting**: recharts (Area charts, sparklines, multi-axis telemetry)
- **Icons**: lucide-react & Google Material Symbols
- **State Management**: zustand (for FSM states, Telemetry, and Mock Data)

## Key Architecture & State

- **Mock Data First**: Do NOT write real database or API connections. The app uses `lib/mockData.ts` to simulate real-time MQTT, hardware lifespans, chat histories, and ML data.
- **Zustand Store**: `lib/store.ts` handles the global state (`telemetry`, `fsm`, `chatHistory`, `maintenanceLogs`) and simulates real-time updates (e.g. `updateTelemetry()`).
- **Pages**:
  - `app/page.tsx` (Dashboard): Real-time bento-grid telemetry and actuator toggles.
  - `app/chatbot/page.tsx`: Split-screen AI command center.
  - `app/metrics/page.tsx`: Deep historical telemetry analysis.
  - `app/maintenance/page.tsx`: Hardware lifecycle and diagnostic logs.

## Design System Rules

- **Colors**: Deep blacks (`bg-zinc-950`/`#131313`), charcoal (`bg-zinc-900`) for cards, glowing emerald (`emerald-500`)/cyan accents for interactive elements.
- **Shapes & Depth**: Heavy use of rounded corners (`rounded-3xl` for main bento cards). Depth achieved via tonal layers and glassmorphism (translucent backgrounds with blur), not heavy drop shadows.
- **Typography**: Manrope (Headings), Inter (Body), JetBrains Mono (Data/Labels).

*(Include this file as context in new chats to save tokens and instantly recall the project state.)*
