# PostgreSQL Database Setup Guide

Target Database: **`db_bioarc_reactor_prod`**
External Host (PgBouncer): **`129.154.34.1:6432`**
Internal Host (Dokploy Docker Network): **`postgres-databases-sharedpostgres-kooq42:5432`**

---

## 1. Schema Overview

The database contains 11 core tables supporting the entire BioArc ecosystem:
- **`Telemetry`**: Time-series biophysical data (`waterTemp`, `airTemp`, `humidity`, `pressure`, `levelCm`, `predictedPh`, `predictedDo`, `tcsR/G/B/C`, `greenRatio`, `growthRateU`, relay states). Indexed on `timestamp DESC`.
- **`SystemLog`**: Asynchronous operational and hazard logs from hardware and backend. Indexed on `timestamp DESC`.
- **`DeviceConfig`**: Photoperiod hours (`lightOnHr`, `lightOffHr`), actuator enable flags, and auto-refill triggers.
- **`ComponentStat`**: Lifespan, runtime hours, and health percentages for pumps, lights, motors, and sensors.
- **`MaintenanceAnalysisCache`**: AI-generated health diagnostics and magnetic sweep maintenance estimates.
- **`TelegramConfig` & `AuthorizedTelegramUser`**: Telegram bot alert recipients and notification toggles.
- **`User`**: Admin authentication credentials.
- **`ChatSession`, `ChatMessage`, `ProjectContext`**: AI Command Center memory and contextual knowledge base.

---

## 2. Initialization via SQL Script

If you prefer applying the complete SQL schema directly to PostgreSQL:
```bash
psql -h 129.154.34.1 -p 6432 -U usr_bioarc_reactor -d db_bioarc_reactor_prod -f schema.sql
```
Or execute the script through pgAdmin, DBeaver, or Dokploy database console.

---

## 3. Initialization via Prisma

From the `frontend/` directory:
```bash
npx prisma db push
```
