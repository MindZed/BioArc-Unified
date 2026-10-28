// app/api/telegram/test/route.ts
// API route to trigger test notification cards to Telegram in BioArc

import { NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { targetChatId } = body;

    const result = await sendTelegramNotification({
      title: "BioArc System Verification",
      message: "This is a live test notification dispatched from the BioArc Enterprise Dashboard to verify Telegram Bot connectivity and operator authorization.",
      category: "INFO",
      targetChatId: targetChatId ? String(targetChatId) : undefined,
    });

    if (!result.success) {
      return NextResponse.json({
        error: result.error || "Failed to deliver Telegram test message",
        details: result.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      delivered: result.delivered,
      total: result.total,
    });
  } catch (error: any) {
    console.error("Test notification error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
