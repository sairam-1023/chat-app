// src/components/DMWindow.jsx — black aesthetic theme

import { useState, useEffect, useRef } from "react";
import { getDMHistory } from "../api/client";

const CMAP = { indigo:"#4f46e5",rose:"#e11d48",emerald:"#059669",amber:"#d97706",sky:"#0284c7",violet:"#7c3aed",orange:"#ea580c" };

function Avatar({ user, size = 34 }) {
  const bg = CMAP[user.avatar_color] || CMAP.indigo;
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background: bg + "22", border:`1.5px solid ${bg}55`,
      color:bg, display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:size * 0.36,
      fontWeight:700, flexShrink:0,
    }}>
      {user.username.slice(0,2).toUpperCase()}
    </div>
  );
}

function fmt(iso) {
  return new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}

function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month:"short", day:"numeric" });
}

export default function DMWindow({ me, friend, sendWS, liveMessages }) {
  const [history, setHistory]   = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    setHistory([]);
    setLoading(true);
    getDMHistory(friend.id, me.id)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
    inputRef.current?.focus();
  }, [friend.id, me.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [history, liveMessages]);

  function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendWS({ type:"dm", receiver_id:friend.id, content:text });
    setInput("");
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); }
  }

  const live = liveMessages.filter(m =>
    (m.sender?.id === friend.id && m.receiver_id === me.id) ||
    (m.sender?.id === me.id     && m.receiver_id === friend.id)
  );
  const historyIds  = new Set(history.map(m => m.id));
  const allMessages = [...history, ...live.filter(m => !historyIds.has(m.id))];

  // Group messages by date
  const grouped = [];
  let lastDate  = null;
  for (const msg of allMessages) {
    const d = formatDate(msg.created_at);
    if (d !== lastDate) { grouped.push({ type:"date", label:d }); lastDate = d; }
    grouped.push({ type:"msg", msg });
  }

  return (
    <div style={s.window}>
      {/* Header */}
      <div style={s.header}>
        <Avatar user={friend} size={38} />
        <div style={{ flex:1 }}>
          <div style={s.friendName}>{friend.username}</div>
          <div style={s.friendSub}>
            <span style={s.privBadge}>🔒 Private</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={s.messages}>
        {loading && (
          <div style={s.loadWrap}>
            <div style={s.loadDots}>
              <span /><span /><span />
            </div>
          </div>
        )}

        {!loading && allMessages.length === 0 && (
          <div style={s.emptyState}>
            <Avatar user={friend} size={56} />
            <p style={s.emptyName}>{friend.username}</p>
            <p style={s.emptyHint}>This is the beginning of your private conversation.</p>
            <p style={s.emptyHint2}>Messages are only visible to you two.</p>
          </div>
        )}

        {grouped.map((item, i) => {
          if (item.type === "date") {
            return (
              <div key={`date-${i}`} style={s.dateDivider}>
                <span style={s.dateLabel}>{item.label}</span>
              </div>
            );
          }
          const { msg } = item;
          const isOwn   = msg.sender?.id === me.id || msg.sender_id === me.id;
          const sender  = msg.sender || (isOwn ? me : friend);
          return (
            <div key={msg.id ?? `live-${i}`} style={{ ...s.row, ...(isOwn ? s.rowOwn : {}) }}>
              {!isOwn && <Avatar user={sender} size={28} />}
              <div style={{ maxWidth:"70%", display:"flex", flexDirection:"column", alignItems:isOwn?"flex-end":"flex-start" }}>
                <div style={{ ...s.bubble, ...(isOwn ? s.bubbleOwn : s.bubbleOther) }}>
                  {msg.content}
                </div>
                <span style={s.time}>{fmt(msg.created_at)}</span>
              </div>
              {isOwn && <Avatar user={sender} size={28} />}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={s.inputArea}>
        <form onSubmit={send} style={s.inputRow}>
          <textarea
            ref={inputRef}
            style={s.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Message ${friend.username}…`}
            rows={1}
          />
          <button type="submit" disabled={!input.trim()} style={{
            ...s.sendBtn,
            opacity: input.trim() ? 1 : 0.4,
            boxShadow: input.trim() ? "0 0 16px rgba(99,102,241,0.4)" : "none",
          }}>
            ↑
          </button>
        </form>
        <p style={s.hint}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

const s = {
  window:      { flex:1, display:"flex", flexDirection:"column", height:"100vh", background:"#080808", fontFamily:"'Segoe UI',system-ui,sans-serif" },
  header:      { padding:"14px 22px", borderBottom:"1px solid #111", display:"flex", alignItems:"center", gap:12, flexShrink:0, background:"#0a0a0a" },
  friendName:  { fontSize:16, fontWeight:700, color:"#fff", letterSpacing:"-0.3px" },
  friendSub:   { marginTop:2 },
  privBadge:   { fontSize:11, color:"#444", fontWeight:500 },
  messages:    { flex:1, overflowY:"auto", padding:"20px 24px", display:"flex", flexDirection:"column", gap:4 },
  loadWrap:    { display:"flex", justifyContent:"center", marginTop:40 },
  loadDots:    { display:"flex", gap:6 },
  emptyState:  { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, textAlign:"center", paddingTop:60 },
  emptyName:   { fontSize:18, fontWeight:700, color:"#fff", marginTop:14, marginBottom:4 },
  emptyHint:   { fontSize:14, color:"#444", margin:"2px 0" },
  emptyHint2:  { fontSize:12, color:"#333", margin:"2px 0" },
  dateDivider: { display:"flex", justifyContent:"center", margin:"12px 0 8px" },
  dateLabel:   { fontSize:11, color:"#333", background:"#111", border:"1px solid #1a1a1a", borderRadius:20, padding:"3px 12px", fontWeight:500 },
  row:         { display:"flex", alignItems:"flex-end", gap:8, marginBottom:2 },
  rowOwn:      { flexDirection:"row-reverse" },
  bubble:      { padding:"10px 14px", borderRadius:16, fontSize:14, lineHeight:1.6, wordBreak:"break-word", maxWidth:"100%" },
  bubbleOther: { background:"#141414", color:"#e5e5e5", border:"1px solid #1a1a1a", borderBottomLeftRadius:4 },
  bubbleOwn:   { background:"#4f46e5", color:"#fff", borderBottomRightRadius:4 },
  time:        { fontSize:10, color:"#333", marginTop:3, paddingLeft:2 },
  inputArea:   { padding:"12px 20px 8px", borderTop:"1px solid #111", background:"#0a0a0a", flexShrink:0 },
  inputRow:    { display:"flex", gap:10, alignItems:"flex-end" },
  input:       {
    flex:1, padding:"12px 16px", background:"#0d0d0d", border:"1px solid #1a1a1a",
    borderRadius:12, fontSize:14, outline:"none", color:"#e5e5e5",
    fontFamily:"inherit", resize:"none", lineHeight:1.5, maxHeight:120, overflowY:"auto",
    transition:"border-color 0.15s",
  },
  sendBtn:     {
    width:42, height:42, background:"#6366f1", color:"#fff",
    border:"none", borderRadius:12, fontSize:20, fontWeight:700,
    cursor:"pointer", display:"flex", alignItems:"center",
    justifyContent:"center", flexShrink:0, transition:"all 0.15s",
  },
  hint:        { fontSize:11, color:"#2a2a2a", marginTop:6, textAlign:"center" },
};