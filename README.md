# 🌿 BioArc Ecosystem: Unified Production Repository

Welcome to the central monorepo for the **BioArc Automated Microalgae Photobioreactor**. This repository unifies all distributed tiers of the system into a single cohesive project.

---

## 📂 Repository Layout

```
BioArc-Unified/
├── frontend/             # Next.js 15 Web Application (Vercel) - Untouched from Hexafall
│   ├── app/              # Real-time dashboard, AI Command Center, metrics & controls
│   ├── components/       # UI widgets, layout headers, audio worklets
│   ├── lib/              # Zustand store, useWebSocket client, Prisma client
│   ├── prisma/           # schema.prisma defining all 11 database models
│   └── VERCEL_ENV_VARS.txt # Production environment variables for Vercel
│
├── backend/              # Go Gin REST API & WebSocket Server (Dokploy)
│   ├── api/              # HTTP handlers for /api/telemetry/history, /api/command, /api/config
│   ├── cmd/server/       # Entrypoint (main.go)
│   ├── config/           # Environment loader
│   ├── db/               # GORM PostgreSQL connection pool
│   ├── models/           # Go structs matching database schema & MQTT payloads
│   ├── mqtt/             # Paho MQTT client supporting MQTTS (TLS Port 8883)
│   ├── ws/               # Gorilla WebSocket hub broadcasting live frames
│   └── Dockerfile        # Multi-stage Alpine container with ca-certificates
│
├── ml_service/           # Python Virtual Sensor Service (Dokploy)
│   ├── main.py           # FastAPI server (/predict endpoint)
│   ├── requirements.txt  # FastAPI, uvicorn, scikit-learn, joblib, pandas
│   ├── Dockerfile        # Python 3.10-slim container
│   └── bioreactor_rf_model.pkl # Trained Random Forest model (pH & DO prediction)
│
├── hardware/             # ESP32 FreeRTOS Firmware Rig
│   ├── src/main.cpp      # Dual-core multitasking firmware (6 tasks across Core 0 & 1)
│   ├── lib/              # Modular C++ drivers (RelayManager, ColorSensor, DisplayManager, etc.)
│   ├── platformio.ini    # PlatformIO configuration for USB and wireless OTA
│   ├── HARDWARE_PINOUT_AND_WIRING.md # Comprehensive pinout and electrical reference
│   └── WORK_TRACKER.md   # Architectural development ledger
│
├── dokploy/              # Dokploy Deployment Manifests
│   ├── docker-compose.yml # Unified stack running Go Backend + ML Service
│   ├── .env.example      # Environment variables for Dokploy
│   └── DOKPLOY_DEPLOY_GUIDE.md # Step-by-step Dokploy deployment manual
│
└── database/             # PostgreSQL Schema & Migration
    ├── schema.prisma     # Prisma schema for db push
    ├── schema.sql        # Full PostgreSQL SQL dump
    └── DB_SETUP_GUIDE.md # Database deployment and indexing manual
```

---

## ⚡ Distributed Architecture

```
[ ESP32 Hardware Rig ]
         │  MQTTS (TLS: 8883)
         ▼
[ Oracle e2-micro MQTT Broker: mqtt.mindzed.tech:8883 ]
         ▲
         │  Paho MQTTS (TLS: 8883)
[ Dokploy Go Backend: bioarc_backend.mindzed.tech ] ─── (Calls ML Service /predict)
    │           │
    │ (WSS)     │ (SQL)
    ▼           ▼
[ Vercel Next.js ] ── (Prisma / PgBouncer: 6432) ──► [ PostgreSQL 16: db_bioarc_reactor_prod ]
```

---

## 🚀 Quickstart Guides

1. **Database**: Read [`database/DB_SETUP_GUIDE.md`](file:///C:/Users/Seven/Work/BioArc-Unified/database/DB_SETUP_GUIDE.md) to apply the schema to `db_bioarc_reactor_prod`.
2. **Dokploy Backend**: Read [`dokploy/DOKPLOY_DEPLOY_GUIDE.md`](file:///C:/Users/Seven/Work/BioArc-Unified/dokploy/DOKPLOY_DEPLOY_GUIDE.md) to deploy the Go backend and Python ML service with a single click.
3. **Vercel Frontend**: Add the environment variables from [`frontend/VERCEL_ENV_VARS.txt`](file:///C:/Users/Seven/Work/BioArc-Unified/frontend/VERCEL_ENV_VARS.txt) into your Vercel project settings and deploy.
4. **Hardware**: Flash wirelessly over OTA using:
   ```bash
   cd hardware
   pio run -e esp32dev_ota --target upload
   ```
