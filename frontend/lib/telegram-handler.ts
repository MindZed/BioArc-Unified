// lib/telegram-handler.ts
// Shared Telegram message processing engine for webhook and local long-polling (Notifications & Telemetry focused)

import prisma from "@/lib/db";

export async function processTelegramMessage(message: any, botToken: string) {
  if (!message || !message.chat || !message.text || !botToken) return false;

  const chatId = String(message.chat.id).trim();
  const text = String(message.text).trim();

  const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const reply = async (replyText: string, parseMode: string = "Markdown") => {
    try {
      await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
          parse_mode: parseMode,
        }),
      });
    } catch (err) {
      console.error(`Failed to send Telegram reply to ${chatId}:`, err);
    }
  };

  // 1. Authorization Check
  const authUser = await prisma.authorizedTelegramUser.findFirst({
    where: { chatId, isActive: true },
  });

  if (!authUser) {
    await reply(
      `🚫 *Unauthorized Access Denied*\n\n` +
      `Your Telegram ID (\`${chatId}\`) is not recognized by the BioArc Enterprise IoT System.\n\n` +
      `To gain read-only monitoring access, please provide this ID (\`${chatId}\`) to your BioArc Administrator to be authorized via the Dashboard sidebar.`
    );
    return true;
  }

  // 2. Intercept Hardware Control Attempts
  const lower = text.toLowerCase();
  const controlKeywords = [
    "turn on", "turn off", "toggle", "switch mode", "set pump", "manual mode",
    "activate", "deactivate", "start pump", "stop pump", "run pump",
    "/pump", "/light", "/manual", "/auto", "/intake", "/outtake", "/air", "/agitator", "/relay",
  ];

  if (controlKeywords.some((kw) => lower.includes(kw))) {
    await reply(
      `🚫 *Hardware Control Disabled*\n\n` +
      `Telegram is strictly configured as a *read-only notifications & telemetry* interface for security. You cannot initiate actuator commands or FSM mode transitions via chat.\n\n` +
      `🌐 Please log into the BioArc Web Dashboard to perform hardware operations.`
    );
    return true;
  }

  // 3. Handle Read-Only Slash Commands
  if (text.startsWith("/start") || text.startsWith("/help")) {
    await reply(
      `👋 Hello *${authUser.name}*!\n\n` +
      `🔔 *BioArc IoT Telegram Notification & Telemetry Bot*\n` +
      `This bot delivers real-time hardware alerts and predictive maintenance digests.\n\n` +
      `*Available Quick Commands:*\n` +
      `📊 \`/status\` - Live sensor telemetry & relay states\n` +
      `🧠 \`/analyze\` - Predictive AI hardware health & wear summary\n` +
      `📜 \`/logs\` - Recent warning & critical system logs\n\n` +
      `🔐 _Note: Free-form chat and hardware control are disabled on Telegram. Please use the Web Dashboard for interactive AI Copilot discussions._`
    );
    return true;
  }

  if (text === "/status" || text === "/health") {
    const tel = await prisma.telemetry.findFirst({
      orderBy: { timestamp: "desc" },
    });

    if (!tel) {
      await reply("ℹ️ No telemetry data recorded in database yet.");
      return true;
    }

    const statusText = `📊 *BioArc Live Telemetry Report*\n` +
      `⏱ _${new Date(tel.timestamp).toLocaleTimeString()}_\n\n` +
      `🎛 *FSM State*: \`${tel.state}\`\n` +
      `🌡 *Water Temp*: \`${tel.waterTemp.toFixed(1)}°C\`\n` +
      `🧪 *pH Level*: \`${tel.predictedPh.toFixed(2)}\`\n` +
      `💨 *Dissolved Oxygen*: \`${tel.predictedDo.toFixed(2)} mg/L\`\n` +
      `🌊 *Reservoir Level*: \`${tel.levelCm} cm\`\n` +
      `🌫 *Air Temp / RH*: \`${tel.airTemp.toFixed(1)}°C / ${tel.humidity.toFixed(1)}%\`\n\n` +
      `*Actuator Status (Read-Only):*\n` +
      `• Intake Pump: ${tel.relayIntake ? "🟢 ON" : "🔴 OFF"}\n` +
      `• Outtake Pump: ${tel.relayOuttake ? "🟢 ON" : "🔴 OFF"}\n` +
      `• Air Compressor: ${tel.relayAir ? "🟢 ON" : "🔴 OFF"}\n` +
      `• LED Light Panel: ${tel.relayLight ? "🟢 ON" : "🔴 OFF"}\n` +
      `• Magnetic Agitator: ${tel.relayAgitator ? "🟢 ON" : "🔴 OFF"}`;

    await reply(statusText);
    return true;
  }

  if (text === "/analyze") {
    const cache = await prisma.maintenanceAnalysisCache.findUnique({
      where: { id: "default" },
    });
    const stats = await prisma.componentStat.findMany();

    const summary = cache?.systemHealthSummary || cache?.agitatorSummary || "All hardware components operating normally within rated lifespans.";
    const statsText = stats.map((s) => `• *${s.name}*: ${Math.round(s.currentHealthPct)}% (${s.status})`).join("\n");

    const replyText = `🧠 *Predictive AI Hardware Health Review*\n` +
      `⏱ _Evaluated: ${cache ? new Date(cache.lastAnalyzedAt).toLocaleTimeString() : "Recently"}_\n\n` +
      `*Executive Summary:*\n_${summary}_\n\n` +
      `*Component Wear Reserves:*\n${statsText || "No component stats tracked yet."}`;

    await reply(replyText);
    return true;
  }

  if (text === "/logs") {
    const logs = await prisma.systemLog.findMany({
      where: { level: { in: ["warning", "critical"] } },
      orderBy: { timestamp: "desc" },
      take: 5,
    });

    if (!logs.length) {
      await reply("🟢 *No Recent Warnings or Critical Logs*\nAll systems have been operating nominally without recorded faults.");
      return true;
    }

    const logsText = logs.map((l) => {
      const icon = l.level === "critical" ? "🔴" : "🟡";
      const time = new Date(l.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `${icon} [${time}] *${l.level.toUpperCase()}*\n_${l.message}_`;
    }).join("\n\n");

    await reply(`📜 *Recent Warning & Critical Logs (Last 5)*\n\n${logsText}`);
    return true;
  }

  // 4. Fallback for any other text message (No AI Chat)
  await reply(
    `ℹ️ *Command Not Recognized*\n\n` +
    `This Telegram bot is configured strictly for automated notifications and quick monitoring.\n\n` +
    `Please use one of the available commands:\n` +
    `📊 \`/status\` - Live sensor telemetry\n` +
    `🧠 \`/analyze\` - Hardware wear summary\n` +
    `📜 \`/logs\` - Recent warning logs\n\n` +
    `🌐 For interactive AI Copilot conversations, please visit the BioArc Web Dashboard.`
  );

  return true;
}
