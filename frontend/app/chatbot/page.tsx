// app/chatbot/page.tsx
// This file will be used to create the chatbot page

"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Send, MessageSquarePlus, BrainCircuit, Zap, Bot, User, Activity, Loader2, Trash2, Mic } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { VoiceChatModal } from '@/components/chatbot/VoiceChatModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


export default function ChatbotPage() {

  const {
    chatHistory, activeSessionId, fastMode,
    setActiveSession, createNewSession, toggleFastMode, telemetry, fsm, setChatHistory, deleteSession, updateSessionTitle
  } = useStore();

  // --- Vercel AI SDK v4 Integration ---
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: { 'X-BioArc-Client': 'true' }
    }),
    onFinish: (event) => {
      console.log('[CLIENT] ✅ Stream finished.', event.message?.id);
      fetch('/api/chat/history', { headers: { 'X-BioArc-Client': 'true' } })
        .then((res) => res.json())
        .then((data) => {
          if (data.sessions) {
            const formattedSessions = data.sessions.map((s: any) => ({
              id: s.id,
              title: s.title,
              date: new Date(s.createdAt).toLocaleDateString(),
              messages: s.messages,
            }));
            setChatHistory(formattedSessions);
          }
        })
        .catch((err) => console.error('Failed to fetch history:', err));
    },
    onError: (err) => console.error('[CLIENT] ❌ SDK Error:', err),
  });
  const isLoading = status === 'submitted' || status === 'streaming';
  // ------------------------------------

  const [input, setInput] = useState('');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Fetch live chat history from Prisma
  useEffect(() => {
    // We allow fetching history for both authenticated and anonymous users
    fetch('/api/chat/history', { headers: { 'X-BioArc-Client': 'true' } })
      .then((res) => {
        if (!res.ok) throw new Error('Auth or server error');
        return res.json();
      })
      .then((data) => {
        if (data.sessions) {
          // Format timestamps to match existing UI
          const formattedSessions = data.sessions.map((s: any) => ({
            id: s.id,
            title: s.title,
            date: new Date(s.createdAt).toLocaleDateString(),
            messages: s.messages,
          }));
          setChatHistory(formattedSessions);
        }
      })
      .catch((err) => console.error('Failed to fetch history:', err));
  }, [setChatHistory]);

  // Hydrate Vercel AI SDK ONLY when switching sessions, not when history updates in the background
  useEffect(() => {
    if (activeSessionId) {
      const session = chatHistory.find((s) => s.id === activeSessionId);
      if (session && session.messages) {
        const formattedMessages = session.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          parts: [{ type: 'text', text: msg.content }], // Ensures rendering works perfectly with existing UI code
        }));
        setMessages(formattedMessages as any); // Type cast necessary here due to SDK mapping differences
      } else {
        setMessages([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, setMessages]);

  useEffect(() => {
    setMounted(true);
    if (chatHistory.length > 0 && !activeSessionId) {
      setActiveSession(chatHistory[0].id);
    }
  }, [chatHistory, activeSessionId, setActiveSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeSessionId]);

  if (!mounted) return null;

  const activeSession = activeSessionId === 'new'
    ? { id: 'new', title: 'New AI Session', messages: [] }
    : chatHistory.find(s => s.id === activeSessionId);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeSessionId || isLoading) return;

    let targetSessionId = activeSessionId;
    if (activeSessionId === 'new') {
      try {
        const res = await fetch('/api/chat/session', {
          method: 'POST',
          headers: { 'X-BioArc-Client': 'true' }
        });
        
        if (!res.ok) {
          if (res.status === 401 || res.status === 403 || res.status === 500) {
            alert("Your session is invalid or has expired (likely due to a system reset). Please log out and log back in to continue.");
            return;
          }
          throw new Error('Failed to create session');
        }

        const data = await res.json();
        if (data.session) {
          const newSession = {
            id: data.session.id,
            title: data.session.title,
            date: new Date(data.session.createdAt).toLocaleDateString(),
            messages: []
          };
          setChatHistory([newSession, ...chatHistory]);
          setActiveSession(data.session.id);
          targetSessionId = data.session.id;
        } else {
          alert("Failed to initialize a new session. Please refresh or log in again.");
          return;
        }
      } catch (err) {
        console.error('Failed to create session on first send:', err);
        alert("A network or server error occurred. Please refresh or log in again.");
        return;
      }
    }

    console.log('[CLIENT] 🚀 Submit triggered. Input:', input);
    sendMessage({ text: input }, { body: { sessionId: targetSessionId, fastMode } });
    console.log('[CLIENT] 📡 Append called. Waiting for network...');
    setInput('');
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(id);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      await fetch(`/api/chat/session?sessionId=${sessionToDelete}`, { method: 'DELETE', headers: { 'X-BioArc-Client': 'true' } });
      deleteSession(sessionToDelete);
      if (activeSessionId === sessionToDelete) {
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session', error);
    }
    setSessionToDelete(null);
  };

  const handleTitleClick = (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const handleTitleSubmit = async (e: React.FormEvent | React.FocusEvent | React.KeyboardEvent, id: string) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (editingSessionId !== id) return;
    
    setEditingSessionId(null);
    if (!editTitle.trim()) return;

    try {
      await fetch(`/api/chat/session`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-BioArc-Client': 'true' },
        body: JSON.stringify({ sessionId: id, title: editTitle.trim() })
      });
      updateSessionTitle(id, editTitle.trim());
    } catch (error) {
      console.error('Failed to rename session', error);
    }
  };

  const renderInputForm = () => (
    <motion.form 
      layoutId="chatbot-input-form"
      onSubmit={handleSend} 
      className="relative flex items-center max-w-4xl mx-auto w-full"
    >
      {/* Mode Toggle Inside Input */}
      <button
        type="button"
        onClick={toggleFastMode}
        disabled={!activeSession}
        title={fastMode ? "Fast Mode: Uses Gemini 3.1 Flash Lite for rapid responses" : "Deep Mode: Uses Gemma 4 31B IT for complex reasoning"}
        className={`absolute left-2 flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer z-10 ${fastMode ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
          }`}
      >
        {fastMode ? <Zap className="w-3.5 h-3.5" /> : <BrainCircuit className="w-3.5 h-3.5" />}
        <span className="max-sm:hidden">{fastMode ? 'FAST' : 'DEEP'}</span>
      </button>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={activeSession ? "Command the bioreactor..." : "Start a session to begin..."}
        disabled={!activeSession || isLoading}
        className="w-full bg-white/[0.02] rounded-full pl-[100px] max-sm:pl-[60px] py-4 pr-[100px] max-sm:pr-[90px] text-white placeholder-zinc-500 font-satoshi focus:outline-none focus:bg-white/[0.04] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner focus:shadow-[0_0_30px_rgba(16,185,129,0.1)] text-sm md:text-base"
      />
      <button
        type="button"
        onClick={() => setIsVoiceModalOpen(true)}
        disabled={!activeSession || isLoading}
        className="absolute right-14 p-2.5 text-zinc-400 hover:text-emerald-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer z-10"
        title="Voice Chat"
      >
        <Mic className="w-5 h-5" />
      </button>
      <button
        type="submit"
        disabled={!input.trim() || !activeSession || isLoading}
        className="absolute right-2 p-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] hover:scale-105 z-10"
        title="Send Message"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
      </button>
    </motion.form>
  );

  return (
    <div className="flex-1 flex overflow-hidden p-6 max-lg:p-0 gap-6 min-h-0 h-full relative">
      {/* LEFT COLUMN: CHAT CONSOLE */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col min-h-0 relative overflow-hidden rounded-3xl max-lg:rounded-none shadow-[0_0_50px_rgba(0,0,0,0.5)] group"
        style={{ backgroundImage: "url('/ChatbotBG.webp')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        {/* Dark translucent overlay */}
        <div className="absolute inset-0 bg-black/80 z-0 pointer-events-none" />

        {/* Chat Header */}
        <div className="px-6 py-4 max-md:pt-8 max-md:pb-4 flex items-center justify-between sticky top-0 bg-black/40 backdrop-blur-xl z-20 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-xl font-bold font-clash tracking-wide text-white">BioArc AI Core</h2>
              <p className="text-xs text-zinc-400 font-satoshi">{activeSession?.title || "No active session"}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowMobileHistory(true)}
            className="lg:hidden bg-zinc-800/80 text-zinc-300 p-2 rounded-full hover:bg-zinc-700 hover:text-white"
          >
            <span className="material-symbols-outlined text-[20px]">history</span>
          </button>
        </div>

        {/* Dynamic content area */}
        <div className="flex-1 flex flex-col justify-between min-h-0 relative z-10">
          {!activeSession ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
              <Bot className="w-16 h-16 opacity-20" />
              <p className="font-satoshi text-lg">Select or start a new session to begin.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto px-6 w-full gap-8">
              {/* Nice Starting New Chat Title */}
              <div className="text-center space-y-3 mt-4">
                <motion.h1 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl md:text-5xl font-extrabold tracking-tight font-clash text-center bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent"
                >
                  Hello, Operator.
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-zinc-400 font-satoshi text-lg text-center"
                >
                  How can I assist your BioArc bioreactor today?
                </motion.p>
              </div>

              {/* Suggestions grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
              >
                {[
                  { title: "Optimize Bioreactor", desc: "Suggest optimal parameters for Chlorella growth", text: "What are the optimal parameters for Chlorella microalgae growth in BioArc?" },
                  { title: "Query Knowledge", desc: "Find research on pH levels and sensor calibration", text: "Search knowledge base for pH sensor calibration instructions" },
                  { title: "Calibrate Pumps", desc: "How to safely toggle nutrients and pH actuators", text: "How do I safely toggle nutrients and pH control?" },
                  { title: "Status Dashboard", desc: "Explain the current telemetry and active FSM states", text: "Explain the current telemetry status and active FSM states" },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInput(item.text)}
                    className="p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-emerald-500/20 rounded-2xl text-left transition-all group/card cursor-pointer"
                  >
                    <div className="font-semibold text-zinc-200 group-hover/card:text-emerald-400 font-satoshi text-sm mb-1">{item.title}</div>
                    <div className="text-xs text-zinc-500 font-satoshi leading-relaxed">{item.desc}</div>
                  </button>
                ))}
              </motion.div>

              {/* Centered Input Box */}
              <div className="w-full">
                {renderInputForm()}
              </div>
            </div>
          ) : (
            <>
              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 max-lg:p-4 space-y-6 max-lg:space-y-4 min-h-0 scroll-smooth no-scrollbar relative">
                <AnimatePresence initial={false}>
                  {/* Map over LIVE AI SDK messages instead of mocked store messages */}
                  {messages.map((msg: UIMessage, idx) => {
                    const isUser = msg.role === 'user';
                    console.log('[DEBUG_RENDER] msg:', JSON.stringify(msg));
                    // Parse the v4 message payload text or fallback to string content
                    const textContent = (msg as any).content || (msg.parts?.map((part: any) =>
                      part.type === 'text' ? part.text : ''
                    ).join('')) || '';

                    // 🔥 VERCEL SDK v6 FIX: Extract tool invocations directly from the parts array
                    const tools = msg.parts
                      ? msg.parts
                        .filter((part: any) => part.type === 'tool-invocation')
                        .map((part: any) => part.toolInvocation)
                      : (msg as any).toolInvocations || [];

                    if (!textContent.trim() && tools.length === 0) return null;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`flex flex-col max-w-[95%] md:max-w-[80%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1 px-1">
                          {isUser ? (
                            <>
                              <span className="text-sm font-medium text-emerald-400 font-satoshi">You</span>
                              <User className="w-4 h-4 text-emerald-400" />
                            </>
                          ) : (
                            <>
                              <Bot className="w-4 h-4 text-zinc-400" />
                              <span className="text-sm font-medium text-zinc-400 font-satoshi">BioArc AI</span>
                            </>
                          )}
                        </div>

                        {!isUser && tools.length > 0 && (
                          <div className="flex flex-col gap-2 mb-2 w-full">
                            {tools.map((tool: any) => (
                              <div key={tool.toolCallId} className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-md flex items-center gap-2 text-xs font-mono text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)] w-fit">
                                <Activity className="w-3.5 h-3.5 animate-pulse" />
                                System Action: {tool.toolName}
                              </div>
                            ))}
                          </div>
                        )}
                        {textContent.trim() && (
                          <div className={`px-5 py-3 rounded-2xl font-satoshi text-[15px] leading-relaxed backdrop-blur-md ${isUser
                            ? 'bg-emerald-500/10 text-emerald-50 rounded-tr-sm shadow-[0_0_20px_rgba(16,185,129,0.05)] whitespace-pre-wrap'
                            : 'bg-white/[0.03] text-zinc-100 rounded-tl-sm shadow-lg'
                            }`}>
                            {isUser ? (
                              textContent
                            ) : (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
                                  li: ({ children }) => <li className="mb-1">{children}</li>,
                                  code: ({ children, className }) => {
                                    const isInline = !className;
                                    return isInline ? (
                                      <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-emerald-300">{children}</code>
                                    ) : (
                                      <pre className="bg-black/40 p-3 rounded-lg overflow-x-auto my-2 border border-white/5 font-mono text-sm text-emerald-300">
                                        <code className={className}>{children}</code>
                                      </pre>
                                    );
                                  },
                                  a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">{children}</a>,
                                  strong: ({ children }) => <strong className="font-semibold text-emerald-300">{children}</strong>,
                                }}
                              >
                                {textContent}
                              </ReactMarkdown>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {isLoading && (messages.length === 0 || messages[messages.length - 1].role === 'user' || (messages[messages.length - 1].role === 'assistant' && !(messages[messages.length - 1] as any).content && !messages[messages.length - 1].parts?.length)) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col mr-auto items-start max-w-[80%] space-y-1"
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <Bot className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span className="text-sm font-medium text-emerald-400 font-satoshi">BioArc AI is thinking...</span>
                    </div>
                    <div className="px-5 py-3.5 rounded-2xl bg-emerald-500/5 rounded-tl-sm shadow-[0_0_15px_rgba(16,185,129,0.1)] backdrop-blur-md flex items-center gap-3 border border-emerald-500/20">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="p-5 max-md:px-4 max-md:pb-6 bg-gradient-to-t from-black via-black/80 to-transparent relative z-10 animate-fade-in">
                {renderInputForm()}
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* RIGHT COLUMN: HISTORY SIDEBAR */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`w-80 flex flex-col gap-6 min-h-0 shrink-0 transition-all duration-300 ${showMobileHistory ? 'max-lg:fixed max-lg:right-0 max-lg:top-0 max-lg:bottom-0 max-lg:z-[60] max-lg:bg-zinc-950 max-lg:p-4 max-lg:shadow-2xl' : 'max-lg:hidden'}`}
      >
        {/* History List Card */}
        <div className="flex-1 flex flex-col min-h-0 relative bg-zinc-900/50 md:bg-transparent rounded-2xl md:rounded-none">
          <div className="px-4 md:px-2 py-4 flex items-center justify-between z-10 border-b border-white/5 md:border-none">
            <h3 className="font-satoshi font-semibold text-sm tracking-widest text-zinc-400 uppercase">Chat Sessions</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={createNewSession}
                className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full transition-all cursor-pointer"
                title="New Session"
              >
                <MessageSquarePlus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowMobileHistory(false)}
                className="lg:hidden p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-full ml-1"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-2 custom-scrollbar">
            {chatHistory.map((session) => (
              <button
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={`w-full text-left px-4 py-3 rounded-2xl transition-all cursor-pointer flex flex-col gap-1.5 group relative ${activeSessionId === session.id
                  ? 'bg-white/[0.04] shadow-sm'
                  : 'hover:bg-white/[0.02]'
                  }`}
              >
                <div className="flex items-center justify-between w-full">
                  {editingSessionId === session.id ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={(e) => handleTitleSubmit(e, session.id)}
                      onKeyDown={(e) => handleTitleSubmit(e, session.id)}
                      onClick={(e) => e.stopPropagation()}
                      className={`font-satoshi font-medium text-[15px] pr-6 bg-transparent outline-none border-b border-emerald-500/50 w-full ${activeSessionId === session.id ? 'text-emerald-400' : 'text-white'}`}
                    />
                  ) : (
                    <h4 
                      onClick={(e) => handleTitleClick(e, session)}
                      className={`font-satoshi font-medium truncate text-[15px] pr-6 ${activeSessionId === session.id ? 'text-emerald-400' : 'text-zinc-300 group-hover:text-white cursor-text'}`}
                    >
                      {session.title}
                    </h4>
                  )}
                  {activeSessionId === session.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  )}
                </div>
                <p className="text-xs text-zinc-500 font-satoshi truncate leading-relaxed pr-6">
                  {session.messages?.at(-1)?.content || "Empty session"}
                </p>
                <p className="text-[10px] text-zinc-600 font-mono">
                  {session.date}
                </p>
                <div
                  onClick={(e) => handleDeleteClick(session.id, e)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 cursor-pointer transition-all"
                  title="Delete Session"
                >
                  <Trash2 className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Live FSM State Widget */}
        <div className="p-6 border border-white/[0.05] rounded-3xl shadow-xl flex flex-col gap-4 shrink-0 relative overflow-hidden bg-white/[0.01] backdrop-blur-md">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Activity className="w-20 h-20 text-white" />
          </div>

          <div className="flex items-center justify-between relative z-10">
            <h4 className="font-satoshi font-semibold text-zinc-400 text-xs tracking-widest uppercase">System Status</h4>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400 font-medium">LIVE</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="font-clash text-xl text-white font-medium tracking-wide">
              {fsm.mode} <span className="text-zinc-500 text-sm font-satoshi">Mode</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1 relative z-10">
            <div className="bg-black/20 p-3 rounded-2xl border border-white/[0.02]">
              <div className="text-[10px] text-zinc-500 font-satoshi tracking-wide mb-1 uppercase">Water Temp</div>
              <div className="text-base font-medium text-zinc-200 font-satoshi">{telemetry.waterTemp}<span className="text-xs text-zinc-500 ml-0.5">°C</span></div>
            </div>
            <div className="bg-black/20 p-3 rounded-2xl border border-white/[0.02]">
              <div className="text-[10px] text-zinc-500 font-satoshi tracking-wide mb-1 uppercase">Growth Rate</div>
              <div className="text-base font-medium text-emerald-400 font-satoshi">{telemetry.algaeGrowthRate}<span className="text-xs text-emerald-400/50 ml-0.5">μ</span></div>
            </div>
          </div>
        </div>
      </motion.div>
      <VoiceChatModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} />

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="bg-zinc-900 border border-red-500/30 rounded-3xl p-6 shadow-2xl max-w-sm w-full mx-4"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/10 rounded-full text-red-400">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-satoshi font-semibold text-white">Delete Session?</h3>
              </div>
              <p className="text-zinc-400 text-sm font-satoshi mb-6">
                Are you sure you want to permanently delete this chat session? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="px-5 py-2.5 rounded-full font-satoshi text-sm font-medium text-zinc-300 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSession}
                  className="px-5 py-2.5 rounded-full font-satoshi text-sm font-medium bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}