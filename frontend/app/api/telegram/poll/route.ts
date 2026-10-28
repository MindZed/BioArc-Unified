// app/api/telegram/poll/route.ts
// API route to poll Telegram for incoming commands during local development (long-polling fallback)

import { NextResponse } from 'next/server';
import { ensureDefaultTelegramSetup } from '@/lib/telegram';
import { processTelegramMessage } from '@/lib/telegram-handler';

let lastUpdateId = 0;

export async function POST() {
  try {
    const config = await ensureDefaultTelegramSetup();
    if (!config || !config.botToken) {
      return NextResponse.json({ error: "Bot token missing" }, { status: 400 });
    }

    const url = `https://api.telegram.org/bot${config.botToken}/getUpdates?offset=${lastUpdateId > 0 ? lastUpdateId + 1 : 0}&timeout=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok || !Array.isArray(data.result)) {
      return NextResponse.json({ success: false, error: data.description || "Failed to fetch updates" });
    }

    let processedCount = 0;
    for (const update of data.result) {
      if (update.update_id) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id);
      }
      if (update.message) {
        await processTelegramMessage(update.message, config.botToken);
        processedCount++;
      }
    }

    if (processedCount > 0 && lastUpdateId > 0) {
      await fetch(`https://api.telegram.org/bot${config.botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=1`).catch(() => {});
    }

    return NextResponse.json({ success: true, processed: processedCount, lastUpdateId });
  } catch (error: any) {
    console.error("Polling error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
