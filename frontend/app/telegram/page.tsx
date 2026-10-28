// app/telegram/page.tsx
// Telegram Bot and Authorized Operators Management page for BioArc Enterprise IoT

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  ShieldCheck,
  UserPlus,
  Trash2,
  Key,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Bell,
  Users,
  Lock,
  Unlock,
  Loader2,
  Eye,
  EyeOff,
  HelpCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TelegramConfig {
  id: string;
  botToken: string | null;
  notifyCritical: boolean;
  notifyWarnings: boolean;
  notifyHourlyAi: boolean;
  notifyFsmChange: boolean;
}

interface AuthorizedUser {
  id: string;
  name: string;
  chatId: string;
  username: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function TelegramManagementPage() {
  const [config, setConfig] = useState<TelegramConfig | null>(null);
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isTestingBroadcast, setIsTestingBroadcast] = useState(false);
  const [testingUserIds, setTestingUserIds] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states for config
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [notifyCritical, setNotifyCritical] = useState(true);
  const [notifyWarnings, setNotifyWarnings] = useState(true);
  const [notifyHourlyAi, setNotifyHourlyAi] = useState(true);
  const [notifyFsmChange, setNotifyFsmChange] = useState(true);

  // Modal / Form state for new user
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserChatId, setNewUserChatId] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserRole, setNewUserRole] = useState("OPERATOR");
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Local Dev Polling state
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const [isManualPolling, setIsManualPolling] = useState(false);
  const [autoPollEnabled, setAutoPollEnabled] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/telegram/config", {
        headers: { "X-BioArc-Client": "true" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          setBotToken(data.config.botToken || "");
          setNotifyCritical(data.config.notifyCritical);
          setNotifyWarnings(data.config.notifyWarnings);
          setNotifyHourlyAi(data.config.notifyHourlyAi);
          setNotifyFsmChange(data.config.notifyFsmChange);
        }
        if (data.users) {
          setUsers(data.users);
        }
      }
    } catch (err) {
      console.error("Failed to load Telegram management data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const pollTelegramMessages = async (manual = false) => {
    if (manual) setIsManualPolling(true);
    else setIsPolling(true);
    try {
      const res = await fetch("/api/telegram/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BioArc-Client": "true" },
      });
      if (res.ok) {
        setLastPollTime(new Date());
      }
    } catch (err) {
      console.error("Polling check failed:", err);
    } finally {
      if (manual) setIsManualPolling(false);
      else setIsPolling(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoPollEnabled) return;
    pollTelegramMessages();
    const interval = setInterval(() => {
      pollTelegramMessages(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoPollEnabled]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BioArc-Client": "true" },
        body: JSON.stringify({
          action: "UPDATE_CONFIG",
          payload: {
            botToken: botToken.trim(),
            notifyCritical,
            notifyWarnings,
            notifyHourlyAi,
            notifyFsmChange,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: "success", text: "Telegram Bot settings successfully saved and active!" });
        if (data.config) setConfig(data.config);
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to update configuration" });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error while saving settings" });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTestBroadcast = async () => {
    setIsTestingBroadcast(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BioArc-Client": "true" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: "success", text: `Test broadcast delivered to ${data.delivered} authorized operator(s)!` });
      } else {
        setStatusMessage({ type: "error", text: data.error || "Broadcast test failed. Please verify Bot Token." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to connect to test endpoint" });
    } finally {
      setIsTestingBroadcast(false);
    }
  };

  const handleTestSingleUser = async (chatId: string, userName: string) => {
    setTestingUserIds((prev) => ({ ...prev, [chatId]: true }));
    setStatusMessage(null);
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BioArc-Client": "true" },
        body: JSON.stringify({ targetChatId: chatId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: "success", text: `Test card delivered directly to ${userName} (${chatId})!` });
      } else {
        setStatusMessage({ type: "error", text: `Failed to send to ${userName}: ${data.error || "Check Chat ID"}` });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to send test card" });
    } finally {
      setTestingUserIds((prev) => ({ ...prev, [chatId]: false }));
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserChatId.trim()) return;
    setIsAddingUser(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BioArc-Client": "true" },
        body: JSON.stringify({
          action: "ADD_USER",
          payload: {
            name: newUserName.trim(),
            chatId: newUserChatId.trim(),
            username: newUserUsername.trim() || null,
            role: newUserRole,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUsers((prev) => [data.user, ...prev]);
        setIsAddModalOpen(false);
        setNewUserName("");
        setNewUserChatId("");
        setNewUserUsername("");
        setStatusMessage({ type: "success", text: `Authorized operator ${data.user.name} successfully added!` });
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to add operator" });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error while adding user" });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean, userName: string) => {
    try {
      const res = await fetch("/api/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BioArc-Client": "true" },
        body: JSON.stringify({
          action: "TOGGLE_USER",
          payload: { id, isActive: !currentStatus },
        }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: !currentStatus } : u)));
        setStatusMessage({
          type: "success",
          text: `Operator ${userName} is now ${!currentStatus ? "ACTIVE" : "DISABLED"}.`,
        });
      }
    } catch (err) {
      console.error("Failed to toggle user status:", err);
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    setUserToDelete({ id, name });
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BioArc-Client": "true" },
        body: JSON.stringify({
          action: "DELETE_USER",
          payload: { id: userToDelete.id },
        }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setStatusMessage({ type: "success", text: `Revoked authorization for ${userToDelete.name}.` });
        setUserToDelete(null);
      } else {
        const data = await res.json();
        setStatusMessage({ type: "error", text: data.error || "Failed to delete operator" });
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
      setStatusMessage({ type: "error", text: "Network error while revoking access" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-screen bg-[#0A0A0B] text-white">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <p className="text-zinc-400 font-mono text-sm uppercase tracking-wider">Loading Telegram Mission Control...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 gap-8 min-h-full overflow-y-auto relative bg-[#0A0A0B] text-white custom-scrollbar">
      {/* Glow Effect */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.2)]">
            <Bot className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold font-clash tracking-tight text-white">
                Telegram Bot & Operator Security
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest">
                Read-Only
              </span>
            </div>
            <p className="text-zinc-400 text-sm mt-1">
              Configure automated hardware alerts and manage authorized Telegram operators
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleTestBroadcast}
            disabled={isTestingBroadcast || !botToken}
            className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] cursor-pointer flex items-center gap-2"
          >
            {isTestingBroadcast ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Broadcast Test Alert
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Authorize Operator
          </Button>
        </div>
      </div>

      {/* Live Dev Polling Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-transparent border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10 shadow-[0_0_25px_rgba(16,185,129,0.05)]">
        <div className="flex items-center gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 relative ${autoPollEnabled ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" : "bg-zinc-500/20 border border-zinc-500/30 text-zinc-400"}`}>
            <Zap className={`w-5 h-5 ${autoPollEnabled ? "animate-pulse" : ""}`} />
            {autoPollEnabled && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-clash font-bold text-sm text-white">
                {autoPollEnabled ? "Live Dev Auto-Polling Active (5s)" : "Production Webhook Ready (0 Polling Wastage)"}
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${autoPollEnabled ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"}`}>
                {autoPollEnabled ? "Dev Polling On" : "Webhook Mode"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-2xl">
              In production, Telegram Webhooks deliver messages instantly with <b>0 polling and 0 wasted requests</b>! On localhost, click <code className="text-emerald-300 font-mono bg-white/[0.05] px-1 py-0.5 rounded">Check Now</code> when testing commands, or toggle Dev Auto-Polling.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
          {lastPollTime && (
            <span className="text-xs font-mono text-zinc-500">
              Last: {lastPollTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <Button
            type="button"
            onClick={() => setAutoPollEnabled(!autoPollEnabled)}
            className={`text-xs font-mono px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${autoPollEnabled ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40" : "bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 border-white/10"}`}
          >
            {autoPollEnabled ? "Stop Auto-Poll" : "Enable Dev Auto-Poll"}
          </Button>
          <Button
            type="button"
            onClick={() => pollTelegramMessages(true)}
            disabled={isManualPolling}
            className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 text-xs font-mono px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isManualPolling || isPolling ? "animate-spin text-indigo-300" : ""}`} />
            {isManualPolling ? "Checking..." : "Check Now"}
          </Button>
        </div>
      </div>

      {/* Status Notification Bar */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl border flex items-center justify-between relative z-10 ${
              statusMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                : "bg-red-500/10 border-red-500/30 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
            }`}
          >
            <div className="flex items-center gap-3 font-medium text-sm">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              {statusMessage.text}
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-zinc-400 hover:text-white transition-colors text-xs font-mono px-2 py-1"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Layout: Config Left, Users Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* LEFT COLUMN: BOT TOKEN & ALERT TOGGLES */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-black/40 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/[0.06]">
              <Key className="w-5 h-5 text-emerald-400" />
              <h2 className="font-clash font-semibold text-lg text-white">Bot Credentials & Alerts</h2>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                  Telegram Bot Token
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 pr-11 text-white font-mono text-xs focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
                  Generated via @BotFather on Telegram. Required for broadcasting and webhook replies.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Automated Alert Triggers
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <span className="flex items-center gap-2 text-sm text-zinc-200">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Critical Hardware Warnings
                  </span>
                  <input
                    type="checkbox"
                    checked={notifyCritical}
                    onChange={(e) => setNotifyCritical(e.target.checked)}
                    className="rounded border-white/20 bg-black/50 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <span className="flex items-center gap-2 text-sm text-zinc-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    System Warning Logs
                  </span>
                  <input
                    type="checkbox"
                    checked={notifyWarnings}
                    onChange={(e) => setNotifyWarnings(e.target.checked)}
                    className="rounded border-white/20 bg-black/50 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <span className="flex items-center gap-2 text-sm text-zinc-200">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    1-Hour AI Health Digests
                  </span>
                  <input
                    type="checkbox"
                    checked={notifyHourlyAi}
                    onChange={(e) => setNotifyHourlyAi(e.target.checked)}
                    className="rounded border-white/20 bg-black/50 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <span className="flex items-center gap-2 text-sm text-zinc-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    FSM Mode Transitions
                  </span>
                  <input
                    type="checkbox"
                    checked={notifyFsmChange}
                    onChange={(e) => setNotifyFsmChange(e.target.checked)}
                    className="rounded border-white/20 bg-black/50 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              <Button
                type="submit"
                disabled={isSavingConfig}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer flex items-center justify-center gap-2"
              >
                {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Save Bot Settings
              </Button>
            </form>
          </div>

          {/* Helper / Info Card */}
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-semibold uppercase tracking-wider mb-3">
              <HelpCircle className="w-4 h-4" />
              How Authorization Works
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed mb-3">
              When an operator messages your bot for the first time, our security engine verifies their <strong>Telegram Chat ID</strong> against the authorized list.
            </p>
            <p className="text-zinc-400 text-xs leading-relaxed">
              If unrecognized, the bot replies with their exact Chat ID and denies access. Copy that ID and authorize them in the table on the right!
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: AUTHORIZED OPERATORS TABLE */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-black/40 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-indigo-400" />
                <div>
                  <h2 className="font-clash font-semibold text-lg text-white">Authorized Operators</h2>
                  <p className="text-xs text-zinc-400">Only listed active operators can query telemetry or receive alerts</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-white/[0.05] text-zinc-300 border border-white/[0.1] w-max">
                Total: <strong>{users.length}</strong>
              </span>
            </div>

            {users.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                <ShieldCheck className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 font-medium text-sm">No authorized Telegram operators listed</p>
                <p className="text-zinc-500 text-xs mt-1">Click "Authorize Operator" above to grant mobile monitoring access.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                      <th className="pb-3 px-4">Operator Name</th>
                      <th className="pb-3 px-4">Telegram Chat ID</th>
                      <th className="pb-3 px-4">Username</th>
                      <th className="pb-3 px-4">Role</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-sm">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4 px-4 font-medium text-white flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${u.isActive ? "bg-emerald-400" : "bg-zinc-600"}`} />
                          {u.name}
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-indigo-300">{u.chatId}</td>
                        <td className="py-4 px-4 text-zinc-400 text-xs">{u.username || "—"}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                              u.role === "ADMIN"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                              u.isActive
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                            }`}
                          >
                            {u.isActive ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            {u.isActive ? "ACTIVE" : "DISABLED"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleTestSingleUser(u.chatId, u.name)}
                            disabled={!u.isActive || testingUserIds[u.chatId]}
                            title="Send Test Card to this Operator"
                            className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-mono transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            {testingUserIds[u.chatId] ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "Test"}
                          </button>
                          <button
                            onClick={() => handleToggleActive(u.id, u.isActive, u.name)}
                            title={u.isActive ? "Disable Access" : "Enable Access"}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                              u.isActive
                                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {u.isActive ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title="Revoke and Delete Operator"
                            className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer inline-flex items-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADD AUTHORIZED USER MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121214] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <UserPlus className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-clash font-bold text-lg text-white">Authorize Operator</h3>
                    <p className="text-xs text-zinc-400">Grant mobile Telegram monitoring access</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                    Operator Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. John Doe (Bioprocess Lead)"
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                    Telegram Chat ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserChatId}
                    onChange={(e) => setNewUserChatId(e.target.value)}
                    placeholder="e.g. 1374076289"
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Tip: When operators message the bot without access, the bot replies with their Chat ID.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                    Telegram Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    placeholder="e.g. @operator_username"
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                    Role in BioArc
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
                  >
                    <option value="OPERATOR">OPERATOR (Read-Only Telemetry & Alerts)</option>
                    <option value="ADMIN">ADMIN (Full Alert Monitoring & RAG Priority)</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 font-semibold py-3 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isAddingUser}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isAddingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Authorize
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121214] border border-red-500/30 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.15)] relative"
            >
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-clash font-bold text-lg text-white">Revoke Operator Access?</h3>
                    <p className="text-xs text-zinc-400">Security authorization removal</p>
                  </div>
                </div>
                <button
                  onClick={() => !isDeleting && setUserToDelete(null)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-red-500/[0.03] border border-red-500/10 mb-6">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Are you sure you want to permanently revoke Telegram monitoring access for <strong className="text-white font-semibold">{userToDelete.name}</strong>?
                </p>
                <p className="text-xs text-red-400/80 mt-2 font-mono">
                  ⚠️ They will immediately lose read-only command access and automated alert broadcasting.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 font-semibold py-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmDeleteUser}
                  disabled={isDeleting}
                  className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Yes, Revoke Access
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
