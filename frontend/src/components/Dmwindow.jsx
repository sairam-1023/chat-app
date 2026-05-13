import { useState, useEffect, useRef } from "react";
import { getDMHistory } from "../api/client";

const CMAP = { indigo:"#e0e7ff",rose:"#ffe4e6",emerald:"#d1fae5",amber:"#fef3c7",sky:"#e0f2fe",violet:"#ede9fe",orange:"#ffedd5" };
const CTEXT= { indigo:"#3730a3",rose:"#9f1239",emerald:"#065f46",amber:"#92400e",sky:"#0c4a6e",violet:"#4c1d95",orange:"#7c2d12" };

function Avatar({ user, size=34 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:CMAP[user.avatar_color]||CMAP.indigo,
      color:CTEXT[user.avatar_color]||CTEXT.indigo, display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:size*0.35, fontWeight:700, flexShrink:0 }}>
      {user.username.slice(0,2).toUpperCase()}
    </div>
  );
}

function fmt(iso) {
  return new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}

export default function DMWindow({ me, friend, sendWS, liveMessages }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    setHistory([]);
    setLoading(true);
    getDMHistory(friend.id, me.id)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [friend.id, me.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, liveMessages]);

  function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendWS({ type: "dm", receiver_id: friend.id, content: text });
    setInput("");
  }

  const live = liveMessages.filter(m =>
    (m.sender?.id === friend.id && m.receiver_id === me.id) ||
    (m.sender?.id === me.id && m.receiver_id === friend.id)
  );
  const historyIds = new Set(history.map(m => m.id));
  const allMessages = [...history, ...live.filter(m => !historyIds.has(m.id))];

  return (
    <div style={s.window}>
      <div style={s.header}>
        <Avatar user={friend} size={36} />
        <div>
          <div style={s.friendName}>{friend.username}</div>
          <div style={s.friendSub}>Private conversation</div>
        </div>
      </div>
      <div style={s.messages}>
        {loading && <p style={s.center}>Loading messages...</p>}
        {!loading && allMessages.length === 0 && (
          <div style={s.emptyState}>
            <div style={{ fontSize:48 }}>👋</div>
            <p style={{ color:"#64748b", fontSize:15, marginTop:12 }}>Say hello to <strong>{friend.username}</strong>!</p>
            <p style={{ color:"#94a3b8", fontSize:13 }}>This is your private conversation.</p>
          </div>
        )}
        {allMessages.map((msg, i) => {
          const isOwn = msg.sender?.id === me.id || msg.sender_id === me.id;
          const sender = msg.sender || (isOwn ? me : friend);
          return (
            <div key={msg.id ?? "live-" + i} style={{ ...s.row, ...(isOwn ? s.rowOwn : {}) }}>
              {!isOwn && <Avatar user={sender} size={30} />}
              <div style={{ maxWidth:"68%", display:"flex", flexDirection:"column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
                <div style={{ ...s.bubble, ...(isOwn ? s.bubbleOwn : s.bubbleOther) }}>{msg.content}</div>
                <span style={s.time}>{fmt(msg.created_at)}</span>
              </div>
              {isOwn && <Avatar user={sender} size={30} />}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} style={s.inputRow}>
        <input style={s.input} value={input} onChange={e => setInput(e.target.value)}
          placeholder={"Message " + friend.username + "..."} autoFocus />
        <button type="submit" disabled={!input.trim()} style={{ ...s.sendBtn, opacity: input.trim() ? 1 : 0.5 }}>
          Send
        </button>
      </form>
    </div>
  );
}

const s = {
  window:      { flex:1, display:"flex", flexDirection:"column", height:"100vh", background:"#fff", fontFamily:"'Segoe UI',system-ui,sans-serif" },
  header:      { padding:"14px 22px", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", gap:12, flexShrink:0 },
  friendName:  { fontSize:16, fontWeight:700, color:"#1e293b" },
  friendSub:   { fontSize:12, color:"#94a3b8" },
  messages:    { flex:1, overflowY:"auto", padding:"20px 22px", display:"flex", flexDirection:"column", gap:10 },
  center:      { textAlign:"center", color:"#94a3b8", fontSize:13 },
  emptyState:  { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", marginTop:60 },
  row:         { display:"flex", alignItems:"flex-end", gap:8 },
  rowOwn:      { flexDirection:"row-reverse" },
  bubble:      { padding:"10px 14px", borderRadius:16, fontSize:14, lineHeight:1.5, wordBreak:"break-word" },
  bubbleOther: { background:"#f1f5f9", color:"#1e293b", borderBottomLeftRadius:4 },
  bubbleOwn:   { background:"#6366f1", color:"#fff", borderBottomRightRadius:4 },
  time:        { fontSize:11, color:"#94a3b8", marginTop:3 },
  inputRow:    { display:"flex", gap:10, padding:"14px 22px", borderTop:"1px solid #e2e8f0", flexShrink:0 },
  input:       { flex:1, padding:"11px 16px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none", color:"#1e293b", background:"#f8fafc" },
  sendBtn:     { padding:"11px 20px", background:"#6366f1", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" },
};
