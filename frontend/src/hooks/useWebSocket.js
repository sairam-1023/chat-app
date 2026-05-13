// src/hooks/useWebSocket.js
// One WebSocket per logged-in user (not per room).
// The server routes DMs, friend request notifications, and accept alerts
// directly to the right user connection.

import { useEffect, useRef, useCallback } from "react";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

export function useWebSocket(userId, onMessage) {
  const wsRef      = useRef(null);
  const pingRef    = useRef(null);
  const onMsgRef   = useRef(onMessage);
  onMsgRef.current = onMessage; // always call the latest handler, no stale closures

  useEffect(() => {
    if (!userId) return;

    const connect = () => {
      const ws = new WebSocket(`${WS_BASE}/ws/${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send a ping every 30s to keep Render's free tier from closing the WS
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30_000);
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type !== "pong") {       // ignore pong, pass everything else up
            onMsgRef.current(data);
          }
        } catch {}
      };

      ws.onclose = () => {
        clearInterval(pingRef.current);
        // Auto-reconnect after 3s if connection drops
        setTimeout(connect, 3_000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      clearInterval(pingRef.current);
      wsRef.current?.close();
    };
  }, [userId]);

  // Send a message down the WebSocket
  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return { send };
}