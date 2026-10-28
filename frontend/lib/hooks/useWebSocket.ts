// lib/hooks/useWebSocket.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function connect() {
      try {
        let wsUrl = process.env.NEXT_PUBLIC_GO_WS_URL || "ws://localhost:8080/ws";
        
        // Force upgrade to wss:// for production domains to fix Vercel Mixed Content errors 
        if (wsUrl.includes("your-production-domain.com")) {
          wsUrl = wsUrl.replace("ws://", "wss://").replace(":8080", "");
        }

        console.log("[WebSocket] Connecting to Go Backend:", wsUrl);
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log("[WebSocket] Connected successfully!");
          setIsConnected(true);
          useStore.getState().setWsConnected(true);
        };

          socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Check if this is a log event (either wrapped with type='log' or raw with 'level'/'msg')
            if (data.type === 'log' || data.level || data.msg) {
              const logData = data.payload || data;
              console.log("[WebSocket] Log Received:", logData);
              let severity: 'nominal' | 'warning' | 'critical' = 'nominal';
              if (logData.level === 'warning') severity = 'warning';
              if (logData.level === 'critical' || logData.level === 'error') severity = 'critical';
              useStore.getState().addMaintenanceLog(logData.msg || JSON.stringify(logData), severity);
              return;
            }

            // Check if this is a status event (online/offline)
            if (data.type === 'status' || typeof data === 'string' || data.status) {
              const statusData = typeof data === 'string' ? data : (data.payload || data.status);
              console.log("[WebSocket] Status Received:", statusData);
              if (statusData === 'online' || statusData === 'offline') {
                useStore.getState().addMaintenanceLog(`Device went ${statusData}`, statusData === 'offline' ? 'warning' : 'nominal');
                useStore.setState({ fsmCurrentState: statusData === 'offline' ? 'OFFLINE' : 'IDLE' });
                useStore.getState().setEspConnected(statusData === 'online');
                return;
              }
            }

            console.log("[WebSocket] Live Telemetry Packet Received:", data);
            useStore.getState().handleLiveTelemetry(data);
          } catch (err) {
            // If it's a plain string like "online" or "offline" (LWT)
            if (event.data === 'online' || event.data === 'offline') {
               console.log("[WebSocket] Status Received:", event.data);
               useStore.getState().addMaintenanceLog(`Device went ${event.data}`, event.data === 'offline' ? 'warning' : 'nominal');
               useStore.setState({ fsmCurrentState: event.data === 'offline' ? 'OFFLINE' : 'IDLE' });
               useStore.getState().setEspConnected(event.data === 'online');
               return;
            }
            console.error("[WebSocket] Failed to parse message:", err, event.data);
          }
        };

        socket.onerror = (error) => {
          console.warn("[WebSocket] Error encountered:", error);
        };

        socket.onclose = () => {
          console.warn("[WebSocket] Connection closed. Reconnecting in 3s...");
          setIsConnected(false);
          useStore.getState().setWsConnected(false);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        };
      } catch (err) {
        console.error("[WebSocket] Connection attempt failed:", err);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      }
    }

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { isConnected };
}
