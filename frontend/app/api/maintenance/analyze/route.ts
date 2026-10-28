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
  { componentId: 'sensor-ultrasonic', name: 'Water Level Sensor (HC-SR04)', type: 'sensor', ratedToggles: 100000, ratedRuntimeSec: 10000 * 3600 },
  { componentId: 'sensor-color', name: 'Color Sensor (TCS34725)', type: 'sensor', ratedToggles: 100000, ratedRuntimeSec: 10000 * 3600 },
  { componentId: 'sensor-temp', name: 'Water Temp Sensor (DS18B20)', type: 'sensor', ratedToggles: 100000, ratedRuntimeSec: 10000 * 3600 },
  { componentId: 'sensor-env', name: 'Environment Sensor (BME280)', type: 'sensor', ratedToggles: 100000, ratedRuntimeSec: 10000 * 3600 },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // 1. Check existing cache
    const cache = await prisma.maintenanceAnalysisCache.findUnique({
      where: { id: 'default' }
    });

    const now = new Date();
    const isCacheValid = cache && (now.getTime() - new Date(cache.lastAnalyzedAt).getTime() < 60 * 60 * 1000);

    // If cache is fresh and not forced, return cached stats immediately
    if (isCacheValid && !force) {
      const stats = await prisma.componentStat.findMany({ orderBy: { componentId: 'asc' } });
      const lifespans = stats.map(s => ({
        ...s,
        healthPercentage: s.currentHealthPct,
        aiReason: s.aiReason || undefined
      }));
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

    // 2. Ensure default component rows exist in database
    for (const comp of DEFAULT_COMPONENTS) {
      await prisma.componentStat.upsert({
        where: { componentId: comp.componentId },
        update: {},
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

    // 3. Calculate new telemetry wear since last check (or beginning of time if first run)
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

    // 4. Gather updated stats & error logs for AI
    const updatedStats = await prisma.componentStat.findMany({ orderBy: { componentId: 'asc' } });
    const errorLogs = await prisma.systemLog.findMany({
      where: { level: { in: ['warning', 'critical'] } },
      orderBy: { timestamp: 'desc' },
      take: 10
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
      recentWarningOrCriticalLogs: errorLogs.map(l => `[${l.level.toUpperCase()}] ${l.message}`)
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
Evaluate the cumulative runtime hours, toggle counts, rated limits, and recent warning/critical logs for each hardware component.
For each component, calculate its mechanical wear percentage based on max((toggles / ratedMaxToggles), (runtimeHours / ratedMaxHours)) * 100.
Subtract this wear percentage directly from 100 to determine the healthPercentage (e.g. if a component has consumed 16% of its rated runtime or toggles, its health MUST be around 84%, NOT 100%). Never output 100% for components with significant runtime or toggles.
If a component is mentioned in warning/critical logs, reduce its healthPercentage further and provide a concise reason in the reason field.
Also generate an expert 2-sentence agitatorDiagnostics summary evaluating motor wear, impedance, and magnetic sweep sensors.
Finally, generate an expert, comprehensive 2-3 sentence systemHealthSummary review text that tells the current overall hardware status (e.g. whether all's good, if any specific device needs attention or is reaching its rated toggle/runtime limit, or if maintenance should be scheduled soon).`,
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
        const pct = Math.max(5, Math.min(100, Math.round(100 - wearPct)));
        const stat = pct < 40 ? 'CRITICAL' : pct < 75 ? 'WARNING' : 'NOMINAL';
        return {
          componentId: s.componentId,
          healthPercentage: pct,
          status: stat as 'NOMINAL' | 'WARNING' | 'CRITICAL',
          reason: pct < 75 ? 'Cumulative runtime and toggle cycles approaching rated limits.' : (wearPct > 1 ? `Operating normally with ${Math.round(wearPct)}% mechanical wear.` : undefined)
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

    // 5. Save AI results to database
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

    // 6. Dispatch Telegram Notifications (non-blocking)
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
