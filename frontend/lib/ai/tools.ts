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

import { generateEmbedding } from './embedding';

export const getBioarcTools = (userRole?: string) => ({
  getKnowledgeBaseTopics: tool({
    description: "Returns the available knowledge categories in BioArc. You can also call searchKnowledgeBase directly with any natural language question.",
    parameters: z.object({}),
    // @ts-ignore
    execute: async () => {
      try {
        const categories: any[] = await prisma.$queryRaw`
          SELECT DISTINCT category FROM "KnowledgeChunk" WHERE category IS NOT NULL;
        `;
        const categoryNames = categories.map((c: any) => c.category).filter(Boolean);
        if (categoryNames.length > 0) {
          return `Available Knowledge Categories: ${categoryNames.join(', ')}. You can ask questions directly using searchKnowledgeBase.`;
        }
      } catch (e) {
        // Fallback to legacy ProjectContext keywords if KnowledgeChunk empty
      }
      const records = await prisma.projectContext.findMany({ select: { keyword: true } });
      if (records.length === 0) return "Knowledge base is initialized. You can search directly with natural language.";
      return `Available topics: ${records.map((r: any) => r.keyword).join(', ')}`;
    }
  }),
  searchKnowledgeBase: tool({
    description: "Semantic Vector Search: Search the BioArc engineering manual, biophysical parameters, operating procedures, and safety guidelines using natural language.",
    parameters: z.object({
      query: z.string().describe("The natural language question or search topic (e.g., 'optimal water temperature for Chlorella', 'pump calibration procedure', 'hardware pinout')."),
    }),
    // @ts-ignore - TS fails to resolve the tool overload properly with explicit types
    execute: async ({ query }: { query: string }) => {
      console.log(`[TOOL] 🔎 Vector Search triggered for: "${query}"`);
      if (!query || !query.trim()) {
        return "Please provide a search query.";
      }

      try {
        // 1. Generate 768-dimensional query vector via Gemini text-embedding-004
        const queryVector = await generateEmbedding(query);
        const vectorString = `[${queryVector.join(',')}]`;

        // 2. Query PostgreSQL with Cosine Distance (<=> operator) using HNSW index
        const matches: any[] = await prisma.$queryRaw`
          SELECT id, title, category, content, 
                 ROUND((1 - (embedding <=> ${vectorString}::vector))::numeric, 3) AS similarity
          FROM "KnowledgeChunk"
          WHERE embedding IS NOT NULL
            AND (1 - (embedding <=> ${vectorString}::vector)) > 0.45
          ORDER BY (embedding <=> ${vectorString}::vector) ASC
          LIMIT 4;
        `;

        if (matches && matches.length > 0) {
          console.log(`[TOOL] 🎯 Vector Search found ${matches.length} chunks (Top similarity: ${matches[0].similarity})`);
          return matches.map((m: any) => 
            `### ${m.title} [Category: ${m.category || 'general'}] (Relevance: ${Math.round(m.similarity * 100)}%)\n${m.content}`
          ).join('\n\n');
        }

        // 3. Fallback: If no vector matches found, search legacy ProjectContext
        console.log('[TOOL] ℹ️ No vector chunks found above threshold, falling back to keyword search...');
        const legacyRecords = await prisma.projectContext.findMany({
          where: {
            OR: [
              { keyword: { contains: query, mode: 'insensitive' } },
              { content: { contains: query, mode: 'insensitive' } },
            ]
          },
          take: 3
        });

        if (legacyRecords.length > 0) {
          return legacyRecords.map((r: any) => `Knowledge (${r.keyword}): ${r.content}`).join('\n\n');
        }

        return "No relevant technical documentation found for this query in the knowledge base.";
      } catch (err: any) {
        console.error('[TOOL] ❌ Vector search error:', err);
        return `Error during knowledge search: ${err.message}`;
      }
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
