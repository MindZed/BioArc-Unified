// lib/ai/tools.ts
// This file will contain the tools that will be used by the AI to interact with the bioreactor

import { tool } from 'ai';
import { z } from 'zod';
import prisma from '@/lib/db';

async function sendWithRetry(url: string, action: string, maxRetries = 2): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${url}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (response.ok || (response.status < 500 && response.status !== 408 && response.status !== 429)) {
        return response;
      }
      lastError = new Error(`HTTP status ${response.status}`);
    } catch (err: any) {
      lastError = err;
    }
    if (attempt < maxRetries) {
      await new Promise(res => setTimeout(res, 350 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

export const getBioarcTools = (userRole?: string) => ({
  getKnowledgeBaseTopics: tool({
    description: "Always call this FIRST before searching the knowledge base. It returns a list of all valid topics/keywords currently available in the database.",
    parameters: z.object({}),
    // @ts-ignore
    execute: async () => {
      console.log('[TOOL] 🗂️ Fetching knowledge base index...');
      const records = await prisma.projectContext.findMany({
        select: { keyword: true }
      });
      if (records.length === 0) return "The knowledge base is currently empty.";
      const topics = records.map((r: any) => r.keyword).join(', ');
      return `Available keywords to search: ${topics}`;
    }
  }),
  searchKnowledgeBase: tool({
    description: "Search the database for facts about the BioArc project, how it works, its goals, and its creators.",
    parameters: z.object({
      query: z.string().describe("A single search keyword or short phrase. Example: 'goal' or 'creator'"),
    }),
    // @ts-ignore - TS fails to resolve the tool overload properly with explicit types
    execute: async ({ query, keyword }: { query?: string, keyword?: string }) => {
      const actualQuery = query || keyword;
      let keywords: string[] = [];
      if (typeof actualQuery === 'string' && actualQuery.trim()) {
        try {
          // Sometimes the AI hallucinates a stringified JSON array
          const parsed = JSON.parse(actualQuery);
          if (Array.isArray(parsed)) {
            keywords = parsed.map(String);
          } else {
            keywords = [String(parsed)];
          }
        } catch {
          // If the AI hallucinates a full sentence, clean it and split by spaces OR commas
          keywords = actualQuery
            .replace(/[^a-zA-Z0-9 ,]/g, '') // Strip special chars
            .split(/[\s,]+/)                // Split by comma or space
            .map(k => k.trim())
            .filter(k => k.length > 3);     // Drop short words like 'the', 'is', 'of'
            
          // If the word was exactly 3 letters or less (like "aim"), but we dropped everything
          if (keywords.length === 0) {
            keywords = actualQuery.split(',').map(k => k.replace(/[^a-zA-Z0-9 -]/g, '').trim()).filter(Boolean);
          }
        }
      }

      if (!actualQuery || !actualQuery.trim()) {
        console.log('[TOOL] 🔎 Empty query received. Returning general project context.');
        const records = await prisma.projectContext.findMany({ take: 10 });
        if (records.length === 0) return "No data found.";
        return records.map((r: any) => `Knowledge (Keyword: ${r.keyword}): ${r.content}`).join('\n\n');
      }

      console.log('[TOOL] 🔎 Multi-query search for:', keywords);
    
      // Dynamically build the OR conditions for every keyword provided
      const orConditions = keywords.flatMap(kw => [
        { keyword: { contains: kw, mode: 'insensitive' as const } },
        { content: { contains: kw, mode: 'insensitive' as const } }
      ]);
      
      const records = await prisma.projectContext.findMany({
        where: { OR: orConditions },
        take: 5 
      });

      console.log(`[TOOL] 🔎 Found ${records.length} records in Prisma`);
      
      if (records.length === 0) return "No data found for these keywords.";
    
      return records.map((r: any) => `Knowledge (Keyword: ${r.keyword}): ${r.content}`).join('\n\n');
    },
  }),
  toggleActuator: tool({
    description: "Turn physical hardware devices on or off in the bioreactor, or enable/disable manual mode.",
    parameters: z.object({
      action: z.enum([
        'manual_mode_on', 'manual_mode_off', 'manual_override_on', 'manual_override_off',
        'intake_on', 'intake_off', 'outtake_on', 'outtake_off', 
        'air_on', 'air_off', 'light_on', 'light_off', 
        'agitator_on', 'agitator_off', 'drain_all', 'drain_partial', 
        'emergency_stop', 'clear_hazard', 'restart',
        'manual_mode_on', 'manual_mode_off'
      ]),
    }),
    // @ts-ignore - TS fails to resolve the tool overload properly with explicit types
    execute: async ({ action }: { action: string }) => {
      if (userRole !== 'ADMIN') {
        return `Error: Unauthorized. Only Admins can control hardware.`;
      }
      
      // Normalize aliases if AI uses alternative naming
      let targetAction = action;
      if (targetAction === 'manual_override_on') targetAction = 'manual_mode_on';
      if (targetAction === 'manual_override_off') targetAction = 'manual_mode_off';

      console.log('[TOOL] ⚙️ toggleActuator triggered for:', targetAction);
      try {
        let API_URL = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:8080';

        // In the manual clicking method on the dashboard, the operator must first click "Enable Manual Override"
        // (which sends manual_mode_on) before clicking any switch. We do the exact same automatically in chat!
        const relayActions = [
          'intake_on', 'intake_off', 'outtake_on', 'outtake_off',
          'air_on', 'air_off', 'light_on', 'light_off',
          'agitator_on', 'agitator_off'
        ];
        
        if (relayActions.includes(targetAction)) {
          console.log('[TOOL] 🔐 Auto-engaging manual override before executing relay command...');
          try {
            await sendWithRetry(API_URL, 'manual_mode_on', 1);
            // Small buffer for FSM state shift on backend/ESP32
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (e: any) {
            console.warn('[TOOL] ⚠️ Could not auto-engage manual mode:', e.message);
          }
        }

        const response = await sendWithRetry(API_URL, targetAction, 2);
        if (response.ok) {
           console.log('[TOOL] ✅ toggleActuator completed');
           return `Successfully executed ${targetAction}.`;
        }
        return `Failed to execute ${targetAction}. Backend returned status ${response.status}. Please verify device status or check if manual override is required.`;
      } catch (err: any) {
        return `Network error sending command: ${err.message}`;
      }
    },
  }),

  getTelemetry: tool({
    description: "Get the current live sensor readings and state from the bioreactor.",
    parameters: z.object({}),
    // @ts-ignore - TS fails to resolve the tool overload properly with explicit types
    execute: async (_args: {}) => {
      console.log('[TOOL] 📊 getTelemetry triggered');
      try {
        const latestTelemetry = await prisma.telemetry.findFirst({
          orderBy: { timestamp: 'desc' }
        });
        if (!latestTelemetry) {
           return "No telemetry data found in the database.";
        }
        console.log('[TOOL] ✅ getTelemetry completed');
        return JSON.stringify(latestTelemetry);
      } catch (e: any) {
        return `Database error: ${e.message}`;
      }
    },
  }),
});
