// components/chatbot/VoiceChatModal.tsx
import React, { useEffect, useState } from 'react';
import { X, Mic, Loader2, PhoneOff, Settings2 } from 'lucide-react';
import { useGeminiLive } from '@/lib/hooks/useGeminiLive';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VOICES = ['Aoede', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda'];

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({ isOpen, onClose }) => {
  const [voiceName, setVoiceName] = useState('Fenrir');
  const [showSettings, setShowSettings] = useState(false);
  const { status, error, connect, disconnect } = useGeminiLive(voiceName);

  // Auto-connect with greeting on mount, disconnect on close
  useEffect(() => {
    if (isOpen) {
      connect(true);
    } else {
      disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVoice = e.target.value;
    setVoiceName(newVoice);
    disconnect();
    // Reconnect immediately with the override voice and ask it to greet
    setTimeout(() => connect(true, newVoice), 300); 
  };

  const handleClose = () => {
    disconnect();
    onClose();
  };

  const isConnected = status === 'listening' || status === 'speaking' || status === 'processing';
  const isConnecting = status === 'connecting';
  const isProcessing = status === 'processing';

  let statusText = 'Connecting to BioArc Core...';
  if (status === 'listening') statusText = 'I\'m listening...';
  if (isProcessing) statusText = 'Querying Knowledge Base...';
  if (status === 'speaking') statusText = 'BioArc AI is speaking...';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-2xl transition-all duration-500">
      {/* Top Navigation */}
      <div className="w-full flex items-center justify-between p-6">
        <div className="flex items-center gap-4 relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 rounded-full bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-800 focus:outline-none"
          >
            <Settings2 className="w-5 h-5" />
          </button>
          
          {showSettings && (
            <div className="absolute top-14 left-0 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <span className="block text-xs text-slate-500 uppercase font-semibold px-2 pb-1">Persona</span>
              <select
                value={voiceName}
                onChange={handleVoiceChange}
                className="bg-transparent text-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer min-w-[120px]"
              >
                {VOICES.map((v) => (
                  <option key={v} value={v} className="bg-slate-900">{v}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button 
          onClick={handleClose}
          className="p-3 rounded-full bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-800 focus:outline-none"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-10">
        
        {/* The Orb */}
        <div className="relative flex items-center justify-center w-64 h-64 mb-12">
          {/* Outer glow waves */}
          {isConnected && (
            <div className={`absolute inset-[-20%] rounded-full opacity-30 ${
              status === 'listening' ? 'bg-blue-500/20 animate-ping' : 
              isProcessing ? 'bg-purple-500/30 animate-spin border-t-2 border-purple-400' : 
              'bg-emerald-400/20 animate-pulse'
            }`}></div>
          )}
          
          {isConnected && (
            <div className={`absolute inset-0 rounded-full opacity-50 ${
              isProcessing ? 'bg-purple-600/20 animate-pulse' : 
              status === 'speaking' ? 'bg-emerald-500/30 animate-pulse' :
              'bg-blue-500/30 animate-pulse'
            }`}></div>
          )}

          {/* Core Orb */}
          <div className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700 ease-in-out ${
            isConnecting ? 'bg-slate-800 scale-90' :
            isProcessing ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-[0_0_60px_rgba(168,85,247,0.5)] scale-110' : 
            status === 'speaking' ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-[0_0_80px_rgba(52,211,153,0.6)] scale-110' : 
            'bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_0_50px_rgba(59,130,246,0.5)] scale-100'
          }`}>
            {isConnecting ? (
              <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
            ) : isProcessing ? (
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            ) : (
              <Mic className={`w-12 h-12 ${isConnected ? 'text-white' : 'text-slate-500'} transition-colors`} />
            )}
          </div>
        </div>

        {/* Status Text */}
        <h3 className={`text-2xl font-light text-center transition-opacity duration-300 ${
          error ? 'text-red-400' : 'text-slate-200'
        } ${isConnecting || isProcessing ? 'animate-pulse' : ''}`}>
          {error || statusText}
        </h3>
        
        {status === 'listening' && (
          <p className="text-slate-500 mt-2 text-sm">Ask about BioArc's telemetry or history...</p>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="w-full pb-12 flex justify-center">
        <button 
          onClick={handleClose}
          className="bg-red-500 hover:bg-red-600 text-white p-5 rounded-full shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_40px_rgba(239,68,68,0.5)] transition-all hover:scale-110 group focus:outline-none"
          aria-label="End Call"
        >
          <PhoneOff className="w-8 h-8 group-hover:animate-pulse" />
        </button>
      </div>
    </div>
  );
};
