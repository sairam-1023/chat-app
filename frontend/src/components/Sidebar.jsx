// src/components/Sidebar.jsx
// Shows: friends list, pending requests badge, add-friend search, logout
import { useState } from "react";
import { searchUsers, sendFriendRequest, acceptRequest, rejectRequest } from "../api/client";

const CMAP = { indigo:"#e0e7ff",rose:"#ffe4e6",emerald:"#d1fae5",amber:"#fef3c7",sky:"#e0f2fe",violet:"#ede9fe",orange:"#ffedd5" };
const CTEXT= { indigo:"#3730a3",rose:"#9f1239",emerald:"#065f46",amber:"#92400e",sky:"#0c4a6e",violet:"#4c1d95",orange:"#7c2d12" };

function Avatar({ user, size = 34 }) {
  const bg   = CMAP[user.avatar_color] || CMAP.indigo;
  const col  = CTEXT[user.avatar_color] || CTEXT.indigo;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:bg, color:col,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size * 0.35, fontWeight:700, flexShrink:0 }}>
      {user.username.slice(0,2).toUpperCase()}
    </div>
  );
}

export default function Sidebar({ user, friends, pendingRequests, activeFriend, onSelectFriend, onFriendsChange, onLogout }) {
  const [tab, setTab]           = useState("friends");   // "friends" | "requests" | "add"
  const [searchQ, setSearchQ]   = useState("");
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending]   = useState(null);        // username being requested
  const [sent, setSent]         = useState(new Set());
  const [msg, setMsg]           = useState("");

  async function doSearch(q) {
    setSearchQ(q);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await searchUsers(q, user.id);
      setResults(r);
    } finally { setSearching(false); }
  }

  async function doSendRequest(targetUsername) {
    setSending(targetUsername);
    try {
      await sendFriendRequest(targetUsername, user.id);
      setSent(prev => new Set([...prev, targetUsername]));
      setMsg("Request sent!");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setMsg(e.message);
      setTimeout(() => setMsg(""), 3000);
    } finally { setSending(null); }
  }

  async function doAccept(id) {
    await acceptRequest(id, user.id);
    onFriendsChange();
  }

  async function doReject(id) {
    await rejectRequest(id, user.id);
    onFriendsChange();
  }

  const pendingCount = pendingRequests.length;

  return (
    <aside style={s.sidebar}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.appName}>💬 RealChat</span>
      </div>

      {/* Tabs */}
      <div style={s.tabRow}>
        {[["friends","Chats"],["requests",`Requests${pendingCount > 0 ? ` (${pendingCount})` : ""}`],["add","+ Add"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ ...s.tabBtn, ...(tab === id ? s.tabBtnOn : {}), ...(id === "requests" && pendingCount > 0 ? {color:"#f59e0b"} : {}) }}>
            {label}
          </button>
        ))}
      </div>

      <div style={s.body}>

        {/* FRIENDS LIST */}
        {tab === "friends" && (
          friends.length === 0
            ? <p style={s.empty}>No friends yet.<br/>Go to "+ Add" to find people.</p>
            : friends.map(f => (
              <button key={f.id} onClick={() => onSelectFriend(f)}
                style={{ ...s.friendRow, ...(activeFriend?.id === f.id ? s.friendRowOn : {}) }}>
                <Avatar user={f} size={36} />
                <span style={s.friendName}>{f.username}</span>
              </button>
            ))
        )}

        {/* PENDING REQUESTS */}
        {tab === "requests" && (
          pendingRequests.length === 0
            ? <p style={s.empty}>No pending requests.</p>
            : pendingRequests.map(r => (
              <div key={r.id} style={s.reqCard}>
                <Avatar user={r.sender} size={32} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={s.reqName}>{r.sender.username}</p>
                  <p style={s.reqSub}>wants to connect</p>
                </div>
                <button onClick={() => doAccept(r.id)} style={s.acceptBtn}>✓</button>
                <button onClick={() => doReject(r.id)} style={s.rejectBtn}>✕</button>
              </div>
            ))
        )}

        {/* ADD FRIEND */}
        {tab === "add" && (
          <div style={{ padding:"0 4px" }}>
            <input style={s.searchInput} value={searchQ}
              onChange={e => doSearch(e.target.value)}
              placeholder="Search username…" autoFocus />
            {msg && <p style={{ fontSize:12, color:"#6366f1", margin:"6px 0 0" }}>{msg}</p>}
            {searching && <p style={s.empty}>Searching…</p>}
            {results.map(u => {
              const isFriend  = friends.some(f => f.id === u.id);
              const requested = sent.has(u.username);
              return (
                <div key={u.id} style={s.resultRow}>
                  <Avatar user={u} size={32} />
                  <span style={{ flex:1, fontSize:14, color:"#1e293b" }}>{u.username}</span>
                  {isFriend
                    ? <span style={s.alreadyTag}>Friends</span>
                    : <button disabled={requested} onClick={() => doSendRequest(u.username)}
                        style={{ ...s.addBtn, ...(requested ? s.addBtnDone : {}) }}>
                        {requested ? "Sent" : "Add"}
                      </button>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User panel */}
      <div style={s.userPanel}>
        <Avatar user={user} size={32} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={s.myName}>{user.username}</div>
          <div style={s.online}>● online</div>
        </div>
        <button onClick={onLogout} style={s.logoutBtn} title="Logout">↩</button>
      </div>
    </aside>
  );
}

const s = {
  sidebar:    { width:240, background:"#1e293b", display:"flex", flexDirection:"column", height:"100vh", flexShrink:0 },
  header:     { padding:"18px 16px 12px", borderBottom:"1px solid #334155" },
  appName:    { fontSize:16, fontWeight:700, color:"#f1f5f9" },
  tabRow:     { display:"flex", padding:"8px 8px 0", gap:2 },
  tabBtn:     { flex:1, padding:"7px 4px", background:"none", border:"none", borderRadius:"8px 8px 0 0", fontSize:12, fontWeight:500, color:"#64748b", cursor:"pointer" },
  tabBtnOn:   { background:"#0f172a", color:"#f1f5f9" },
  body:       { flex:1, overflowY:"auto", padding:"8px" },
  empty:      { fontSize:13, color:"#475569", textAlign:"center", lineHeight:1.6, marginTop:24 },
  friendRow:  { display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 10px", background:"none", border:"none", borderRadius:8, cursor:"pointer", textAlign:"left", marginBottom:2 },
  friendRowOn:{ background:"#334155" },
  friendName: { fontSize:14, fontWeight:500, color:"#e2e8f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  reqCard:    { display:"flex", alignItems:"center", gap:8, background:"#0f172a", borderRadius:10, padding:"10px 10px", marginBottom:8 },
  reqName:    { fontSize:13, fontWeight:600, color:"#f1f5f9", margin:0 },
  reqSub:     { fontSize:11, color:"#64748b", margin:0 },
  acceptBtn:  { background:"#166534", color:"#fff", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:13, fontWeight:700 },
  rejectBtn:  { background:"#7f1d1d", color:"#fff", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:13, fontWeight:700 },
  searchInput:{ width:"100%", padding:"9px 12px", background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:8 },
  resultRow:  { display:"flex", alignItems:"center", gap:10, padding:"8px 4px", borderBottom:"1px solid #1e293b" },
  addBtn:     { background:"#6366f1", color:"#fff", border:"none", borderRadius:6, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer" },
  addBtnDone: { background:"#334155", cursor:"default" },
  alreadyTag: { fontSize:11, color:"#22c55e", fontWeight:600 },
  userPanel:  { display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderTop:"1px solid #334155" },
  myName:     { fontSize:13, fontWeight:600, color:"#f1f5f9", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  online:     { fontSize:11, color:"#22c55e" },
  logoutBtn:  { background:"none", border:"none", color:"#64748b", fontSize:18, cursor:"pointer" },
};