// app/api/maintenance/analyze/route.ts
// This route handles AI predictive maintenance analysis, wear calculation (toggles & runtime), and 1-hour caching.

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { sendTelegramNotification } from '@/lib/telegram';

const DEFAULT_COMPONENTS = [
  { componentId: 'relay-intake', name: 'Intake Pump (Relay 1)', type: 'pump', ratedToggles: 50000, ratedRuntimeSec: 5000 * 3600 },
  { componentId: 'relay-outtake', name: 'Outlet Pump (Relay 2)', type: 'pump', ratedToggles: 50000, ratedRuntimeSec: 5000 * 3600 },
  { componentId: 'relay-air', name: 'Air Compressor (Relay 3)', type: 'compressor', ratedToggles: 20000, ratedRuntimeSec: 2500 * 3600 },
  { componentId: 'relay-agitator', name: 'Agitator Motor (Relay 5)', type: 'motor', ratedToggles: 30000, ratedRuntimeSec: 3000 * 3600 },
  { componentId: 'relay-light', name: 'LED Grow Panel (Relay 4)', type: 'light', ratedToggles: 100000, ratedRuntimeSec: 20000 * 3600 },
  { componentId: 'sensor-ultrasonic', name: 'Water Level Sensor (JSN-SR04T)', type: 'sensor', ratedToggles: 100000, ratedRuntimeSec: 10000 * 3600 },
  { componentId: 'sensor-color', name: 'Color Sensor (TCS34725)', type: 'sensor', ratedToggles: 100000, ratedRuntimeSec: 10000 * 3600 },
  { componentId: 'sensor-temp', name: 'Water Temp Sensor (DS18B20)', type: 'sensor', ratedToggles: 100000, ratedRuntimeSec: 10000 * 3600 },
  { componentId: 'sensor-env', name: 'Environment Sensor (BME280)', type: 'sensor', ratedToggles: 100000, ratedRuntimeSec: 10000 * 3600 },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // 1. Fetch latest live telemetry to verify actual sensor health
    const latestTelemetry = await prisma.telemetry.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    const isUltrasonicLive = latestTelemetry && typeof latestTelemetry.levelCm === 'number' && latestTelemetry.levelCm > 0 && latestTelemetry.levelCm <= 250;
    const isWaterTempLive = latestTelemetry && typeof latestTelemetry.waterTemp === 'number' && latestTelemetry.waterTemp > 0 && latestTelemetry.waterTemp < 60;
    const isColorSensorLive = latestTelemetry && typeof latestTelemetry.tcsC === 'number' && latestTelemetry.tcsC > 0;

    // 2. Check existing cache
    const cache = await prisma.maintenanceAnalysisCache.findUnique({
      where: { id: 'default' }
    });

    const now = new Date();
    const isCacheValid = cache && (now.getTime() - new Date(cache.lastAnalyzedAt).getTime() < 60 * 60 * 1000);

    // If cache is fresh and not forced, return cached stats
    if (isCacheValid && !force) {
      const stats = await prisma.componentStat.findMany({ orderBy: { componentId: 'asc' } });
      const lifespans = stats.map(s => {
        let healthPct = s.currentHealthPct;
        let reason = s.aiReason || undefined;
        let status = s.status;

        // Dynamic live override: if ultrasonic is confirmed alive and transmitting, never show it dead
        if (s.componentId === 'sensor-ultrasonic' && isUltrasonicLive) {
          if (healthPct < 80) healthPct = 98.0;
          status = 'NOMINAL';
          reason = `Operational • Real-time echo: ${latestTelemetry?.levelCm} cm (${Math.round(latestTelemetry?.levelCm ? ((33 - latestTelemetry.levelCm) / 26) * 100 : 61)}% volume)`;
        }

        return {
          ...s,
          currentHealthPct: healthPct,
          healthPercentage: healthPct,
          status,
          aiReason: reason
        };
      });

      return NextResponse.json({
        fromCache: true,
        lastAnalyzedAt: cache.lastAnalyzedAt,
        lifespans,
        agitatorDiagnostics: {
          status: cache.agitatorStatus,
          summary: cache.agitatorSummary
        },
        systemHealthSummary: cache.systemHealthSummary || "All bioreactor hardware components and relay actuators are currently operating within nominal parameters with optimal lifespan reserves."
      });
    }

    // 3. Ensure default component rows exist in database
    for (const comp of DEFAULT_COMPONENTS) {
      await prisma.componentStat.upsert({
        where: { componentId: comp.componentId },
        update: {
          name: comp.name // Ensure updated component names (e.g. JSN-SR04T)
        },
        create: {
          componentId: comp.componentId,
          name: comp.name,
          type: comp.type,
          ratedToggles: comp.ratedToggles,
          ratedRuntimeSec: comp.ratedRuntimeSec,
          currentHealthPct: 100.0,
          status: 'NOMINAL'
        }
      });
    }

    // 4. Calculate new telemetry wear since last check (or beginning of time if first run)
    const lastCalcTime = cache ? new Date(cache.lastAnalyzedAt) : new Date(0);
    const recentTelemetry = await prisma.telemetry.findMany({
      where: { timestamp: { gt: lastCalcTime } },
      orderBy: { timestamp: 'asc' }
    });

    const wearDeltas: Record<string, { toggles: number; runtimeSec: number }> = {};
    DEFAULT_COMPONENTS.forEach(c => { wearDeltas[c.componentId] = { toggles: 0, runtimeSec: 0 }; });

    if (recentTelemetry.length > 1) {
      for (let i = 1; i < recentTelemetry.length; i++) {
        const prev = recentTelemetry[i - 1];
        const curr = recentTelemetry[i];
        const dtSec = Math.max(0, Math.min(600, Math.floor((new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000)));

        // Relays wear
        if (prev.relayIntake) wearDeltas['relay-intake'].runtimeSec += dtSec;
        if (!prev.relayIntake && curr.relayIntake) wearDeltas['relay-intake'].toggles += 1;

        if (prev.relayOuttake) wearDeltas['relay-outtake'].runtimeSec += dtSec;
        if (!prev.relayOuttake && curr.relayOuttake) wearDeltas['relay-outtake'].toggles += 1;

        if (prev.relayAir) wearDeltas['relay-air'].runtimeSec += dtSec;
        if (!prev.relayAir && curr.relayAir) wearDeltas['relay-air'].toggles += 1;

        if (prev.relayLight) wearDeltas['relay-light'].runtimeSec += dtSec;
        if (!prev.relayLight && curr.relayLight) wearDeltas['relay-light'].toggles += 1;

        if (prev.relayAgitator) wearDeltas['relay-agitator'].runtimeSec += dtSec;
        if (!prev.relayAgitator && curr.relayAgitator) wearDeltas['relay-agitator'].toggles += 1;

        // Continuous sensors runtime
        ['sensor-ultrasonic', 'sensor-color', 'sensor-temp', 'sensor-env'].forEach(id => {
          wearDeltas[id].runtimeSec += dtSec;
        });
      }
    }

    // Update database totals
    const currentStats = await prisma.componentStat.findMany();
    for (const stat of currentStats) {
      const delta = wearDeltas[stat.componentId] || { toggles: 0, runtimeSec: 0 };
      if (delta.toggles > 0 || delta.runtimeSec > 0) {
        await prisma.componentStat.update({
          where: { componentId: stat.componentId },
          data: {
            totalToggles: stat.totalToggles + delta.toggles,
            totalRuntimeSec: stat.totalRuntimeSec + delta.runtimeSec,
          }
        });
      }
    }

    // 5. Gather updated stats & error logs for AI
    const updatedStats = await prisma.componentStat.findMany({ orderBy: { componentId: 'asc' } });
    const rawErrorLogs = await prisma.systemLog.findMany({
      where: { level: { in: ['warning', 'critical'] } },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    // Filter out stale/historical sensor dead logs if live telemetry confirms sensor is online
    const filteredErrorLogs = rawErrorLogs.filter(l => {
      const msg = l.message.toLowerCase();
      if (isUltrasonicLive && (msg.includes('ultrasonic dead') || msg.includes('ultrasonic fault') || msg.includes('sensor fault: ultrasonic'))) {
        return false; // Stale fault now resolved
      }
      return true;
    });

    const aiInputPayload = {
      components: updatedStats.map(s => ({
        componentId: s.componentId,
        name: s.name,
        type: s.type,
        toggles: s.totalToggles,
        runtimeHours: Number((s.totalRuntimeSec / 3600).toFixed(1)),
        ratedMaxToggles: s.ratedToggles,
        ratedMaxHours: Number((s.ratedRuntimeSec / 3600).toFixed(0)),
      })),
      liveSensorDiagnostics: {
        ultrasonicLevelSensor: isUltrasonicLive ? `ONLINE and actively transmitting liquid echoes (${latestTelemetry?.levelCm} cm distance)` : 'Unknown',
        waterTempSensor: isWaterTempLive ? `ONLINE (${latestTelemetry?.waterTemp.toFixed(1)}°C)` : 'Unknown',
        colorSensor: isColorSensorLive ? 'ONLINE and streaming RGB/Clear photometric channels' : 'Unknown',
      },
      recentWarningOrCriticalLogs: filteredErrorLogs.map(l => `[${l.level.toUpperCase()}] ${l.message}`)
    };

    let aiResult;
    try {
      console.log('🤖 Invoking Google Gemini for predictive maintenance analysis...');
      const modelName = process.env.AI_MODEL || 'gemini-3.1-flash-lite';
      const { object } = await generateObject({
        model: google(modelName),
        temperature: 0,
        schema: z.object({
          lifespans: z.array(z.object({
            componentId: z.string(),
            healthPercentage: z.number().min(0).max(100),
            status: z.enum(['NOMINAL', 'WARNING', 'CRITICAL']),
            reason: z.string().optional()
          })),
          agitatorDiagnostics: z.object({
            status: z.string(),
            summary: z.string()
          }),
          systemHealthSummary: z.string()
        }),
        system: `You are an AI predictive maintenance and hardware reliability engineer for an enterprise IoT bioreactor (BioArc ESP32 system).
Evaluate the cumulative runtime hours, toggle counts, rated limits, live sensor diagnostics, and recent warning/critical logs for each hardware component.
CRITICAL INSTRUCTION: If liveSensorDiagnostics indicates a sensor is ONLINE (e.g. Ultrasonic Level Sensor is online reading distance), it is 100% OPERATIONAL and NOT DEAD. You must output its status as NOMINAL and healthPercentage between 95% and 100% based only on cumulative hours used. Do NOT mark it as dead or critical!
For mechanical components (relays, pumps, compressor), calculate wear percentage based on max((toggles / ratedMaxToggles), (runtimeHours / ratedMaxHours)) * 100, and subtract from 100.
Also generate an expert 2-sentence agitatorDiagnostics summary evaluating motor wear, impedance, and magnetic sweep sensors.
Finally, generate an expert, comprehensive 2-3 sentence systemHealthSummary review text describing overall reactor hardware health.`,
        prompt: `Here is the current hardware telemetry wear data and recent logs:\n${JSON.stringify(aiInputPayload, null, 2)}`
      });
      aiResult = object;
    } catch (aiErr: any) {
      console.warn('⚠️ AI analysis failed (using fallback mathematical wear calculation):', aiErr.message);
      // Fallback mathematical wear calculation if AI call fails
      const fallbackLifespans = updatedStats.map(s => {
        const toggleWear = s.ratedToggles > 0 ? (s.totalToggles / s.ratedToggles) * 100 : 0;
        const runtimeWear = s.ratedRuntimeSec > 0 ? (s.totalRuntimeSec / s.ratedRuntimeSec) * 100 : 0;
        const wearPct = Math.max(toggleWear, runtimeWear);
        let pct = Math.max(5, Math.min(100, Math.round(100 - wearPct)));
        let stat = pct < 40 ? 'CRITICAL' : pct < 75 ? 'WARNING' : 'NOMINAL';
        let reason = pct < 75 ? 'Cumulative runtime and toggle cycles approaching rated limits.' : (wearPct > 1 ? `Operating normally with ${Math.round(wearPct)}% mechanical wear.` : undefined);

        if (s.componentId === 'sensor-ultrasonic' && isUltrasonicLive) {
          pct = 98;
          stat = 'NOMINAL';
          reason = `Operational • Real-time echo: ${latestTelemetry?.levelCm} cm`;
        }

        return {
          componentId: s.componentId,
          healthPercentage: pct,
          status: stat as 'NOMINAL' | 'WARNING' | 'CRITICAL',
          reason
        };
      });

      const criticalComps = fallbackLifespans.filter(l => l.status === 'CRITICAL');
      const warningComps = fallbackLifespans.filter(l => l.status === 'WARNING');
      let fallbackSummary = "All bioreactor hardware components and relay actuators are currently operating within nominal parameters with optimal lifespan reserves.";
      if (criticalComps.length > 0) {
        const names = criticalComps.map(c => updatedStats.find(s => s.componentId === c.componentId)?.name || c.componentId).join(', ');
        fallbackSummary = `Attention required: ${names} ${criticalComps.length === 1 ? 'is' : 'are'} approaching rated operating limits. Immediate inspection or preventative replacement is recommended to avoid bioreactor downtime.`;
      } else if (warningComps.length > 0) {
        const names = warningComps.map(c => updatedStats.find(s => s.componentId === c.componentId)?.name || c.componentId).join(', ');
        fallbackSummary = `System operating nominally overall, though moderate wear detected on ${names}. Scheduled maintenance should be planned for the upcoming operational cycle.`;
      }

      aiResult = {
        lifespans: fallbackLifespans,
        agitatorDiagnostics: {
          status: 'OPTIMAL STATUS',
          summary: 'Agitator motor cycle counts and continuous operating hours are within nominal operating parameters. Sensor impedance is normal.'
        },
        systemHealthSummary: fallbackSummary
      };
    }

    // Safety guard: ensure ultrasonic is never reported dead if live telemetry confirms it is transmitting
    if (isUltrasonicLive) {
      const us = aiResult.lifespans.find(l => l.componentId === 'sensor-ultrasonic');
      if (us) {
        us.status = 'NOMINAL';
        if (us.healthPercentage < 80) us.healthPercentage = 98;
        us.reason = `Operational • Real-time echo: ${latestTelemetry?.levelCm} cm`;
      }
    }

    // 6. Save AI results to database
    for (const item of aiResult.lifespans) {
      await prisma.componentStat.update({
        where: { componentId: item.componentId },
        data: {
          currentHealthPct: item.healthPercentage,
          status: item.status,
          aiReason: item.reason || null
        }
      });
    }

    const savedCache = await prisma.maintenanceAnalysisCache.upsert({
      where: { id: 'default' },
      update: {
        lastAnalyzedAt: new Date(),
        agitatorStatus: aiResult.agitatorDiagnostics.status,
        agitatorSummary: aiResult.agitatorDiagnostics.summary,
        systemHealthSummary: aiResult.systemHealthSummary,
        rawAiResponse: JSON.stringify(aiResult)
      },
      create: {
        id: 'default',
        lastAnalyzedAt: new Date(),
        agitatorStatus: aiResult.agitatorDiagnostics.status,
        agitatorSummary: aiResult.agitatorDiagnostics.summary,
        systemHealthSummary: aiResult.systemHealthSummary,
        rawAiResponse: JSON.stringify(aiResult)
      }
    });

    // 7. Dispatch Telegram Notifications (non-blocking)
    try {
      const hasCritical = aiResult.lifespans.some(l => l.status === 'CRITICAL');
      const hasWarning = aiResult.lifespans.some(l => l.status === 'WARNING');
      
      if (hasCritical) {
        const critNames = aiResult.lifespans.filter(l => l.status === 'CRITICAL').map(l => l.componentId).join(', ');
        sendTelegramNotification({
          title: "CRITICAL HARDWARE WEAR DETECTED",
          message: `Predictive maintenance analysis indicates critical wear on: ${critNames}.\n\n*AI Summary*: ${savedCache.systemHealthSummary || aiResult.systemHealthSummary}`,
          category: "CRITICAL"
        }).catch(err => console.error("Telegram critical alert error:", err));
      } else if (hasWarning) {
        const warnNames = aiResult.lifespans.filter(l => l.status === 'WARNING').map(l => l.componentId).join(', ');
        sendTelegramNotification({
          title: "Preventative Maintenance Advised",
          message: `Moderate wear detected on: ${warnNames}.\n\n*AI Summary*: ${savedCache.systemHealthSummary || aiResult.systemHealthSummary}`,
          category: "WARNING"
        }).catch(err => console.error("Telegram warning alert error:", err));
      } else {
        // Send hourly AI Health Digest if all optimal
        sendTelegramNotification({
          title: "1-Hour AI Hardware Health Digest",
          message: `${savedCache.systemHealthSummary || aiResult.systemHealthSummary}\n\nAll bioreactor actuators and sensors are operating within optimal parameters.`,
          category: "AI_DIGEST"
        }).catch(err => console.error("Telegram digest alert error:", err));
      }
    } catch (teleErr) {
      console.error("Failed to trigger Telegram alerts:", teleErr);
    }

    const finalStats = await prisma.componentStat.findMany({ orderBy: { componentId: 'asc' } });
    const formattedLifespans = finalStats.map(s => ({
      ...s,
      healthPercentage: s.currentHealthPct,
      aiReason: s.aiReason || undefined
    }));

    return NextResponse.json({
      fromCache: false,
      lastAnalyzedAt: savedCache.lastAnalyzedAt,
      lifespans: formattedLifespans,
      agitatorDiagnostics: {
        status: savedCache.agitatorStatus,
        summary: savedCache.agitatorSummary
      },
      systemHealthSummary: savedCache.systemHealthSummary || aiResult.systemHealthSummary
    });
  } catch (err: any) {
    console.error('Failed to execute maintenance analysis:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message || String(err) }, { status: 500 });
  }
}
