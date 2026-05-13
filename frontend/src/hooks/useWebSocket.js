// =============================================================================
// src/hooks/useWebSocket.js
//
// Custom React hook that manages the WebSocket connection to the backend.
//
// WHY a custom hook?
//   WebSocket lifecycle (open, message, error, close) involves side effects.
//   React's useEffect is the right place for side effects. Extracting it into
//   a custom hook keeps components clean — they just call useWebSocket() and
//   get back { messages, sendMessage, connected }.
//
// HOW it works:
//   1. On mount (or when roomId/userId changes): open a new WebSocket
//   2. Register onmessage handler → parse JSON → append to messages state
//   3. On unmount (user switches rooms, logs out): close the socket cleanly
//   4. sendMessage() serializes an object to JSON and calls ws.send()
// =============================================================================

import { useState, useEffect, useRef, useCallback } from "react";

const WS_BASE = "ws://localhost:8000";

export function useWebSocket(roomId, userId) {
  const [messages, setMessages]   = useState([]);   // all messages in this room
  const [connected, setConnected] = useState(false); // connection state
  const wsRef = useRef(null);                        // stable ref to the socket

  useEffect(() => {
    // Don't connect if we don't have both IDs yet
    if (!roomId || !userId) return;

    // Open the WebSocket connection
    // URL pattern matches the @app.websocket("/ws/{room_id}/{user_id}") in FastAPI
    const ws = new WebSocket(`${WS_BASE}/ws/${roomId}/${userId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setMessages([]); // clear old messages from previous room
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Both "message" and "system" types get appended to the list.
      // The UI differentiates them by checking msg.type.
      setMessages((prev) => [...prev, data]);
    };

    ws.onerror = (e) => {
      console.error("WebSocket error", e);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    // Cleanup: runs when roomId/userId changes or component unmounts.
    // IMPORTANT: always close the old socket before opening a new one.
    return () => {
      ws.close();
    };
  }, [roomId, userId]); // re-run whenever the user switches rooms

  // sendMessage: stable function (useCallback prevents re-renders)
  // The component calls sendMessage({ content: "hello" })
  // We JSON.stringify it and push it down the WebSocket to FastAPI
  const sendMessage = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return { messages, sendMessage, connected };
}