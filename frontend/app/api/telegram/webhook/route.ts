// app/api/telegram/webhook/route.ts
// Telegram Bot Webhook handler with multi-user authorization and read-only AI monitoring

import { NextResponse } from 'next/server';
import { ensureDefaultTelegramSetup } from '@/lib/telegram';
import { processTelegramMessage } from '@/lib/telegram-handler';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.message || !body.message.chat || !body.message.text) {
      return NextResponse.json({ ok: true });
    }

    const config = await ensureDefaultTelegramSetup();
    if (!config || !config.botToken) {
      console.error("Webhook received but botToken is not configured in database.");
      return NextResponse.json({ ok: true });
    }

    await processTelegramMessage(body.message, config.botToken);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Webhook execution error:", error);
    return NextResponse.json({ ok: true });
  }
}
