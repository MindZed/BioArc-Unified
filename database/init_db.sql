-- BioArc Complete Database Schema for PostgreSQL

CREATE TABLE IF NOT EXISTS "ChatSession" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT PRIMARY KEY,
    "sessionId" TEXT NOT NULL REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProjectContext" (
    "id" TEXT PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Telemetry" (
    "id" TEXT PRIMARY KEY,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" TEXT NOT NULL,
    "waterTemp" DOUBLE PRECISION NOT NULL,
    "airTemp" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "pressure" DOUBLE PRECISION NOT NULL,
    "levelCm" INTEGER NOT NULL,
    "predictedPh" DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    "predictedDo" DOUBLE PRECISION NOT NULL DEFAULT 6.5,
    "tcsR" INTEGER,
    "tcsG" INTEGER,
    "tcsB" INTEGER,
    "tcsC" INTEGER,
    "greenRatio" DOUBLE PRECISION,
    "grRatio" DOUBLE PRECISION,
    "pseudoOd" DOUBLE PRECISION,
    "vegIndex" DOUBLE PRECISION,
    "chlAUgl" DOUBLE PRECISION,
    "growthRateU" DOUBLE PRECISION,
    "hasBaseline" BOOLEAN,
    "relayIntake" BOOLEAN NOT NULL,
    "relayOuttake" BOOLEAN NOT NULL,
    "relayAir" BOOLEAN NOT NULL,
    "relayLight" BOOLEAN NOT NULL,
    "relayAgitator" BOOLEAN NOT NULL
);
CREATE INDEX IF NOT EXISTS "Telemetry_timestamp_idx" ON "Telemetry" ("timestamp" DESC);

CREATE TABLE IF NOT EXISTS "SystemLog" (
    "id" TEXT PRIMARY KEY,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "SystemLog_timestamp_idx" ON "SystemLog" ("timestamp" DESC);

CREATE TABLE IF NOT EXISTS "DeviceConfig" (
    "id" TEXT PRIMARY KEY,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lightOnHr" INTEGER NOT NULL DEFAULT 8,
    "lightOffHr" INTEGER NOT NULL DEFAULT 20,
    "enableLights" BOOLEAN NOT NULL DEFAULT true,
    "enableAir" BOOLEAN NOT NULL DEFAULT true,
    "enableAgitator" BOOLEAN NOT NULL DEFAULT true,
    "enableRefill" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "ComponentStat" (
    "id" TEXT PRIMARY KEY,
    "componentId" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "totalToggles" INTEGER NOT NULL DEFAULT 0,
    "totalRuntimeSec" INTEGER NOT NULL DEFAULT 0,
    "ratedToggles" INTEGER NOT NULL DEFAULT 50000,
    "ratedRuntimeSec" INTEGER NOT NULL DEFAULT 18000000,
    "currentHealthPct" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "status" TEXT NOT NULL DEFAULT 'NOMINAL',
    "aiReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MaintenanceAnalysisCache" (
    "id" TEXT PRIMARY KEY DEFAULT 'default',
    "lastAnalyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agitatorStatus" TEXT NOT NULL DEFAULT 'OPTIMAL STATUS',
    "agitatorSummary" TEXT NOT NULL DEFAULT 'Magnetic sweep and motor impedance sensors suggest nominal wear on the primary bioreactor agitation unit. Next scheduled maintenance is estimated in 1,200 operating hours.',
    "systemHealthSummary" TEXT,
    "rawAiResponse" TEXT
);

CREATE TABLE IF NOT EXISTS "TelegramConfig" (
    "id" TEXT PRIMARY KEY DEFAULT 'default',
    "botToken" TEXT,
    "notifyCritical" BOOLEAN NOT NULL DEFAULT true,
    "notifyWarnings" BOOLEAN NOT NULL DEFAULT true,
    "notifyHourlyAi" BOOLEAN NOT NULL DEFAULT true,
    "notifyFsmChange" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AuthorizedTelegramUser" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "chatId" TEXT NOT NULL UNIQUE,
    "username" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default DeviceConfig if empty
INSERT INTO "DeviceConfig" ("id", "updatedAt", "lightOnHr", "lightOffHr", "enableLights", "enableAir", "enableAgitator", "enableRefill")
VALUES ('default_config', CURRENT_TIMESTAMP, 8, 20, true, true, true, true)
ON CONFLICT ("id") DO NOTHING;

-- Seed default MaintenanceAnalysisCache if empty
INSERT INTO "MaintenanceAnalysisCache" ("id", "lastAnalyzedAt", "agitatorStatus", "agitatorSummary")
VALUES ('default', CURRENT_TIMESTAMP, 'OPTIMAL STATUS', 'Magnetic sweep and motor impedance sensors suggest nominal wear on the primary bioreactor agitation unit. Next scheduled maintenance is estimated in 1,200 operating hours.')
ON CONFLICT ("id") DO NOTHING;
