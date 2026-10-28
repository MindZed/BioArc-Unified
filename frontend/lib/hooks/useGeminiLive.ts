// lib/hooks/useGeminiLive.ts
// This file will be used to connect to the Gemini Live API and play the audio

import { useState, useRef, useCallback } from 'react';
import { downsampleBuffer, arrayBufferToBase64, base64ToArrayBuffer } from '../audio/pcm-processor';

export type LiveStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'processing' | 'error';

export function useGeminiLive(voiceName: string = 'Fenrir') {
  const [status, setStatusState] = useState<LiveStatus>('idle');
  const statusRef = useRef<LiveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const setStatus = useCallback((newStatus: LiveStatus) => {
    statusRef.current = newStatus;
    setStatusState(newStatus);
  }, []);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeAudioNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const connectionAttemptRef = useRef<number>(0);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (playbackContextRef.current) {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
    if (activeAudioNodesRef.current) {
      activeAudioNodesRef.current.forEach(node => {
        try { node.stop(); } catch (e) {}
      });
      activeAudioNodesRef.current = [];
    }
    nextPlayTimeRef.current = 0;
    setStatus('idle');
  }, []);

  const sendAudioChunk = useCallback((base64Data: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "audio/pcm;rate=16000",
                data: base64Data,
              },
            ],
          },
        })
      );
    }
  }, []);

  const playAudioChunk = useCallback(async (base64Data: string) => {
    if (!playbackContextRef.current) return;
    try {
      const arrayBuffer = base64ToArrayBuffer(base64Data);
      const int16Array = new Int16Array(arrayBuffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      
      const audioBuffer = playbackContextRef.current.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);
      
      const source = playbackContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playbackContextRef.current.destination);
      
      const currentTime = playbackContextRef.current.currentTime;
      const playTime = Math.max(currentTime, nextPlayTimeRef.current);
      source.start(playTime);
      nextPlayTimeRef.current = playTime + audioBuffer.duration;
      
      activeAudioNodesRef.current.push(source);

      source.onended = () => {
        // Remove from active nodes
        activeAudioNodesRef.current = activeAudioNodesRef.current.filter(n => n !== source);

        // Switch back to listening ONLY if this was the last chunk playing
        // (Add a small tolerance of 0.05 seconds for floating point precision)
        if (playbackContextRef.current) {
          const isFinished = playbackContextRef.current.currentTime >= nextPlayTimeRef.current - 0.05;
          if (isFinished && wsRef.current?.readyState === WebSocket.OPEN) {
            setStatus('listening');
          }
        }
      };
    } catch (err) {
      console.error('Failed to play audio chunk:', err);
    }
  }, []);

  const connect = useCallback(async (shouldGreet: boolean = false, overrideVoice?: string) => {
    try {
      const attemptId = Date.now() + Math.random();
      connectionAttemptRef.current = attemptId;

      const activeVoice = overrideVoice || voiceName;
      setStatus('connecting');
      setError(null);

      const tokenRes = await fetch('/api/chat/live-token', { headers: { 'X-BioArc-Client': 'true' } });
      if (!tokenRes.ok) throw new Error('Failed to fetch Gemini API token');
      const { token } = await tokenRes.json();

      // If this attempt is no longer the latest, or if we explicitly disconnected while fetching, abort.
      if (connectionAttemptRef.current !== attemptId || statusRef.current !== 'connecting') {
        return;
      }

      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${token}`;
      
      // Prevent race condition: if another connection was established while we were fetching the token, close it.
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (wsRef.current !== ws) return; // Ignore if superseded
        // Send initial setup
        ws.send(
          JSON.stringify({
            setup: {
              model: 'models/gemini-2.5-flash-native-audio-latest',
              systemInstruction: {
                parts: [
                  {
                    text: "You are the BioArc Reactor AI. You manage a physical algae bioreactor. IMPORTANT: 1) If the user asks questions about the BioArc project, creators, biophysical parameters (pH, dissolved oxygen, temperature, lighting), or operating procedures, call searchKnowledgeBase directly using a concise natural language query. 2) If the user asks to control hardware or enable/disable manual override, use toggleActuator (e.g. manual_mode_on, light_off, intake_on)."
                  }
                ]
              },
              tools: [{
                functionDeclarations: [
                  {
                    name: "searchKnowledgeBase",
                    description: "Searches the BioArc engineering, operational, and biophysical knowledge base using natural language.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        query: {
                          type: "STRING",
                          description: "The search query or natural language question."
                        }
                      },
                      required: ["query"]
                    }
                  },
                  {
                    name: "getTelemetry",
                    description: "Get the current live sensor readings from the bioreactor (water temperature, pH, dissolved oxygen, algae growth rate).",
                    parameters: { type: "OBJECT", properties: {} }
                  },
                  {
                    name: "toggleActuator",
                    description: "Turn physical hardware devices on or off in the bioreactor, or enable/disable manual mode.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        action: {
                          type: "STRING",
                          description: "The action to execute (e.g. manual_mode_on, manual_mode_off, intake_on, intake_off, outtake_on, outtake_off, air_on, air_off, light_on, light_off, agitator_on, agitator_off, drain_all, drain_partial, emergency_stop, clear_hazard, restart)"
                        }
                      },
                      required: ["action"]
                    }
                  }
                ]
              }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: activeVoice
                    }
                  }
                }
              }
            }
          })
        );
      };

      ws.onmessage = async (event) => {
        if (wsRef.current !== ws) return; // Ignore if superseded
        try {
          let text = event.data;
          if (event.data instanceof Blob) {
            text = await event.data.text();
          }
          const response = JSON.parse(text);

            if (response.setupComplete) {
              setStatus('listening');
              
              if (shouldGreet) {
                // Wait briefly then send the greeting prompt
                setTimeout(() => {
                  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                      clientContent: {
                        turns: [{
                          role: 'user',
                          parts: [{ text: "Hello! Please briefly introduce yourself to me and ask how you can help." }]
                        }],
                        turnComplete: true
                      }
                    }));
                  }
                }, 500);
              }

              // Start recording audio
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
              playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
              },
            });
            mediaStreamRef.current = stream;

            await audioContextRef.current.audioWorklet.addModule('/audio-capture-worklet.js');
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(audioContextRef.current, 'audio-capture-processor');
            processorRef.current = workletNode;

            workletNode.port.onmessage = (e) => {
              const inputData = e.data;
              
              // Calculate RMS volume for noise gate
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              
              // If AI is speaking, we use a strict noise gate threshold (0.015) so background noise 
              // doesn't accidentally trigger an interruption. If it's a real voice, rms > 0.015 easily.
              if (statusRef.current === 'speaking' && rms < 0.015) {
                return; // Drop the chunk to avoid accidental interrupts
              }

              // Ensure we capture 16kHz
              if (!audioContextRef.current) return;
              const int16PCM = downsampleBuffer(inputData, audioContextRef.current.sampleRate, 16000);
              const base64 = arrayBufferToBase64(int16PCM.buffer);
              sendAudioChunk(base64);
            };

            source.connect(workletNode);
            workletNode.connect(audioContextRef.current.destination);
          }

          if (response.serverContent?.interrupted) {
            // Stop all currently playing audio chunks
            activeAudioNodesRef.current.forEach(node => {
              try { node.stop(); } catch(e) {}
            });
            activeAudioNodesRef.current = [];
            nextPlayTimeRef.current = 0;
            setStatus('listening');
          }

          // 1. Intercept Tool Calls
          if (response.toolCall) {
            const functionCalls = response.toolCall.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              const fc = functionCalls[0];
              const { name, args, id } = fc;
              setStatus('processing'); // Custom processing state

              try {
                const res = await fetch('/api/tools/execute', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-BioArc-Client': 'true' },
                  body: JSON.stringify({ toolName: name, args })
                });
                const { result } = await res.json();

                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(
                    JSON.stringify({
                      toolResponse: {
                        functionResponses: [
                          {
                            id: id,
                            name: name,
                            response: { output: result }
                          }
                        ]
                      }
                    })
                  );
                }
              } catch (err) {
                console.error('Tool execution failed:', err);
              }
            }
          }

          // 2. Handle Server Content (Audio / Text)
          if (response.serverContent?.modelTurn?.parts) {
            const parts = response.serverContent.modelTurn.parts;
            for (const part of parts) {
              if (part.inlineData && part.inlineData.data) {
                setStatus('speaking');
                await playAudioChunk(part.inlineData.data);
              }
            }
          }
        } catch (err) {
          console.error("Error processing WS message:", err);
        }
      };

      ws.onerror = (e) => {
        if (wsRef.current !== ws) return;
        console.error("WebSocket error:", e);
        setError("WebSocket connection failed.");
        disconnect();
      };

      ws.onclose = () => {
        if (wsRef.current !== ws) return;
        disconnect();
      };
    } catch (err: any) {
      setError(err.message || "Failed to connect to Live API");
      disconnect();
    }
  }, [disconnect, playAudioChunk, sendAudioChunk, status, voiceName]);

  return {
    status,
    error,
    connect,
    disconnect,
  };
}
