// lib/telegram.ts
// Core Telegram Bot notification service and helper utilities for BioArc Enterprise IoT

import prisma from "@/lib/db";

export type NotificationCategory = "CRITICAL" | "WARNING" | "AI_DIGEST" | "FSM_CHANGE" | "OPTIMAL" | "INFO";

export interface TelegramAlertOptions {
  title: string;
  message: string;
  category: NotificationCategory;
  targetChatId?: string; // Optional: send to a specific user (e.g. for testing) instead of broadcast
}

/**
 * Ensures the default TelegramConfig and initial AuthorizedTelegramUser exist in the database.
 */
export async function ensureDefaultTelegramSetup() {
  try {
    let config = await prisma.telegramConfig.findUnique({ where: { id: "default" } });
    if (!config) {
      config = await prisma.telegramConfig.create({
        data: {
          id: "default",
          botToken: process.env.TELEGRAM_BOT_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN_HERE",
          notifyCritical: true,
          notifyWarnings: true,
          notifyHourlyAi: true,
          notifyFsmChange: true,
        },
      });
    }

    const userCount = await prisma.authorizedTelegramUser.count();
    if (userCount === 0) {
      await prisma.authorizedTelegramUser.create({
        data: {
          name: "Default Admin",
          chatId: process.env.TELEGRAM_CHAT_ID || "123456789",
          username: "@admin_user",
          role: "ADMIN",
          isActive: true,
        },
      });
    }
    return config;
  } catch (error) {
    console.error("Failed to ensure default Telegram setup:", error);
    return null;
  }
}

/**
 * Sends a rich, formatted notification to authorized Telegram users.
 */
export async function sendTelegramNotification({
  title,
  message,
  category,
  targetChatId,
}: TelegramAlertOptions) {
  try {
    const config = await ensureDefaultTelegramSetup();
    if (!config || !config.botToken) {
      console.warn("Telegram bot token is not configured. Skipping notification.");
      return { success: false, error: "Bot token missing" };
    }

    // Check category toggles if broadcasting (not a manual target test)
    if (!targetChatId) {
      if (category === "CRITICAL" && !config.notifyCritical) return { success: true, skipped: true };
      if (category === "WARNING" && !config.notifyWarnings) return { success: true, skipped: true };
      if (category === "AI_DIGEST" && !config.notifyHourlyAi) return { success: true, skipped: true };
      if (category === "FSM_CHANGE" && !config.notifyFsmChange) return { success: true, skipped: true };
    }

    // Determine recipients
    let recipients: string[] = [];
    if (targetChatId) {
      recipients = [targetChatId];
    } else {
      const activeUsers = await prisma.authorizedTelegramUser.findMany({
        where: { isActive: true },
        select: { chatId: true },
      });
      recipients = activeUsers.map((u) => u.chatId);
    }

    if (recipients.length === 0) {
      console.warn("No active authorized Telegram users found to receive notification.");
      return { success: false, error: "No recipients" };
    }

    const emojiMap: Record<NotificationCategory, string> = {
      CRITICAL: "🔴",
      WARNING: "🟡",
      AI_DIGEST: "🤖",
      FSM_CHANGE: "⚙️",
      OPTIMAL: "🟢",
      INFO: "ℹ️",
    };
    const emoji = emojiMap[category] || "🔔";
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const formattedText = `${emoji} *${title}*\n` +
      `⏱ _${timestamp} | BioArc IoT Mission Control_\n\n` +
      `${message}\n\n` +
      `🔐 _Read-Only Hardware Monitoring_`;

    let successCount = 0;
    const errors: any[] = [];

    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

    await Promise.all(
      recipients.map(async (chatId) => {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: formattedText,
              parse_mode: "Markdown",
            }),
          });
          const data = await res.json();
          if (data.ok) {
            successCount++;
          } else {
            console.error(`Telegram API error for chat ${chatId}:`, data);
            errors.push({ chatId, error: data.description });
          }
        } catch (err: any) {
          console.error(`Failed to send Telegram message to ${chatId}:`, err);
          errors.push({ chatId, error: err?.message || String(err) });
        }
      })
    );

    return {
      success: successCount > 0,
      delivered: successCount,
      total: recipients.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error("Error in sendTelegramNotification:", error);
    return { success: false, error: error?.message || String(error) };
  }
}
