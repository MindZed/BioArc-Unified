// app/api/telegram/config/route.ts
// API route for managing Telegram bot credentials and authorized users in BioArc

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ensureDefaultTelegramSetup } from '@/lib/telegram';

export async function GET() {
  try {
    const config = await ensureDefaultTelegramSetup();
    const users = await prisma.authorizedTelegramUser.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ config, users });
  } catch (error: any) {
    console.error("Failed to fetch Telegram config:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action === "UPDATE_CONFIG") {
      const updatedConfig = await prisma.telegramConfig.upsert({
        where: { id: "default" },
        update: {
          botToken: payload.botToken,
          notifyCritical: payload.notifyCritical,
          notifyWarnings: payload.notifyWarnings,
          notifyHourlyAi: payload.notifyHourlyAi,
          notifyFsmChange: payload.notifyFsmChange,
        },
        create: {
          id: "default",
          botToken: payload.botToken,
          notifyCritical: payload.notifyCritical ?? true,
          notifyWarnings: payload.notifyWarnings ?? true,
          notifyHourlyAi: payload.notifyHourlyAi ?? true,
          notifyFsmChange: payload.notifyFsmChange ?? true,
        }
      });
      return NextResponse.json({ success: true, config: updatedConfig });
    }

    if (action === "ADD_USER") {
      const { name, chatId, username, role } = payload;
      if (!name || !chatId) {
        return NextResponse.json({ error: "Name and Telegram Chat ID are required" }, { status: 400 });
      }
      const newUser = await prisma.authorizedTelegramUser.create({
        data: {
          name,
          chatId: String(chatId).trim(),
          username: username ? String(username).trim() : null,
          role: role || "OPERATOR",
          isActive: true
        }
      });
      return NextResponse.json({ success: true, user: newUser });
    }

    if (action === "TOGGLE_USER") {
      const { id, isActive } = payload;
      const updatedUser = await prisma.authorizedTelegramUser.update({
        where: { id },
        data: { isActive }
      });
      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === "DELETE_USER") {
      const { id } = payload;
      await prisma.authorizedTelegramUser.delete({
        where: { id }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to update Telegram config/users:", error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: "A user with this Telegram Chat ID already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
