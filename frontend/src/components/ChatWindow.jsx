// =============================================================================
// src/components/ChatWindow.jsx
//
// The main chat area. Responsible for:
//   1. Loading message HISTORY via REST (GET /rooms/{id}/messages)
//      → shown immediately when you enter a room
//   2. Receiving LIVE messages via the WebSocket (from useWebSocket hook)
//      → appended in real-time as they arrive
//   3. Sending new messages through the WebSocket
//   4. Auto-scrolling to the bottom on new messages
//
// The combination of REST (history) + WebSocket (live) is the standard
// pattern for real-time chat. REST gives you the past; WS gives you the now.
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { getMessages } from "../api/client";
import { useWebSocket } from "../hooks/useWebSocket";

const COLOR_MAP = {
  indigo:  { bg: "#e0e7ff", text: "#3730a3" },
  rose:    { bg: "#ffe4e6", text: "#9f1239" },
  emerald: { bg: "#d1fae5", text: "#065f46" },
  amber:   { bg: "#fef3c7", text: "#92400e" },
  sky:     { bg: "#e0f2fe", text: "#0c4a6e" },
  violet:  { bg: "#ede9fe", text: "#4c1d95" },
  orange:  { bg: "#ffedd5", text: "#7c2d12" },
};

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ user }) {
  const colors = COLOR_MAP[user.avatar_color] || COLOR_MAP.indigo;
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: colors.bg,
        color: colors.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {user.username.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function ChatWindow({ room, user }) {
  const [history, setHistory]     = useState([]);   // messages from REST (past)
  const [input, setInput]         = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const bottomRef = useRef(null);                   // for auto-scroll

  // useWebSocket manages the WebSocket connection for this room
  const { messages: liveMessages, sendMessage, connected } = useWebSocket(room.id, user.id);

  // ---- Load message history whenever room changes ----
  useEffect(() => {
    setHistory([]);
    setLoadingHistory(true);
    getMessages(room.id)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, [room.id]);

  // ---- Auto-scroll to bottom on any new message ----
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, liveMessages]);

  // ---- Send a message through the WebSocket ----
  function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !connected) return;
    sendMessage({ content: text });    // JSON goes to FastAPI WebSocket endpoint
    setInput("");
  }

  // Combine history (REST) + live messages (WebSocket) for display
  // Deduplicate: live messages may echo back the ones we just sent,
  // but history only has old messages so no real overlap.
  const allMessages = [...history, ...liveMessages.filter((m) => m.type === "message")];
  const systemEvents = liveMessages.filter((m) => m.type === "system");

  return (
    <div style={styles.window}>

      {/* Room header */}
      <header style={styles.header}>
        <div>
          <h2 style={styles.roomTitle}>#{room.name}</h2>
          {room.description && <p style={styles.roomDesc}>{room.description}</p>}
        </div>
        <span style={{ ...styles.connDot, background: connected ? "#22c55e" : "#f87171" }}>
          {connected ? "● live" : "● reconnecting"}
        </span>
      </header>

      {/* Messages area */}
      <div style={styles.messages}>
        {loadingHistory && (
          <p style={styles.systemText}>Loading history…</p>
        )}

        {/* Render combined history + live messages */}
        {allMessages.map((msg, i) => {
          const isOwn = msg.user?.id === user.id;
          return (
            <div key={msg.id ?? `live-${i}`} style={{ ...styles.msgRow, ...(isOwn ? styles.msgRowOwn : {}) }}>
              {!isOwn && <Avatar user={msg.user} />}
              <div style={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
                {!isOwn && (
                  <span style={styles.senderName}>{msg.user?.username}</span>
                )}
                <div style={{ ...styles.bubble, ...(isOwn ? styles.bubbleOwn : styles.bubbleOther) }}>
                  {msg.content}
                </div>
                <span style={styles.timestamp}>{formatTime(msg.created_at)}</span>
              </div>
              {isOwn && <Avatar user={msg.user} />}
            </div>
          );
        })}

        {/* System events (join/leave) — shown as centered pills */}
        {systemEvents.map((ev, i) => (
          <div key={`sys-${i}`} style={styles.systemRow}>
            <span style={styles.systemPill}>{ev.text}</span>
          </div>
        ))}

        {/* Invisible anchor for auto-scroll */}
        <div ref={bottomRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSend} style={styles.inputRow}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={connected ? `Message #${room.name}…` : "Connecting…"}
          disabled={!connected}
          autoFocus
        />
        <button
          type="submit"
          disabled={!input.trim() || !connected}
          style={{
            ...styles.sendBtn,
            opacity: (!input.trim() || !connected) ? 0.5 : 1,
          }}
        >
          Send ↑
        </button>
      </form>
    </div>
  );
}

const styles = {
  window: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#fff",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  header: {
    padding: "16px 24px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#fff",
    flexShrink: 0,
  },
  roomTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: "#1e293b" },
  roomDesc: { margin: "2px 0 0", fontSize: 13, color: "#94a3b8" },
  connDot: { fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20, color: "#fff" },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  msgRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
  },
  msgRowOwn: { flexDirection: "row-reverse" },
  senderName: { fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 2, paddingLeft: 2 },
  bubble: {
    padding: "10px 14px",
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 1.5,
    wordBreak: "break-word",
  },
  bubbleOther: {
    background: "#f1f5f9",
    color: "#1e293b",
    borderBottomLeftRadius: 4,
  },
  bubbleOwn: {
    background: "#6366f1",
    color: "#fff",
    borderBottomRightRadius: 4,
  },
  timestamp: { fontSize: 11, color: "#94a3b8", marginTop: 3, paddingHorizontal: 2 },
  systemRow: { display: "flex", justifyContent: "center", margin: "4px 0" },
  systemPill: {
    fontSize: 12,
    color: "#64748b",
    background: "#f1f5f9",
    padding: "3px 12px",
    borderRadius: 20,
  },
  systemText: { textAlign: "center", color: "#94a3b8", fontSize: 13 },
  inputRow: {
    display: "flex",
    gap: 10,
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    background: "#fff",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    color: "#1e293b",
    background: "#f8fafc",
  },
  sendBtn: {
    padding: "12px 20px",
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
};