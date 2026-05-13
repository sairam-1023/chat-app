// src/components/Sidebar.jsx — black aesthetic theme + remove friend

import { useState } from "react";
import { searchUsers, sendFriendRequest, acceptRequest, rejectRequest, removeFriend } from "../api/client";

const CMAP = { indigo:"#4f46e5",rose:"#e11d48",emerald:"#059669",amber:"#d97706",sky:"#0284c7",violet:"#7c3aed",orange:"#ea580c" };

function Avatar({ user, size = 34 }) {
  const bg = CMAP[user.avatar_color] || CMAP.indigo;
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background: bg + "22",
      border: `1.5px solid ${bg}55`,
      color: bg, display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:size * 0.36,
      fontWeight:700, flexShrink:0, letterSpacing:"-0.5px",
    }}>
      {user.username.slice(0,2).toUpperCase()}
    </div>
  );
}

export default function Sidebar({ user, friends, pendingRequests, activeFriend, onSelectFriend, onFriendsChange, onLogout }) {
  const [tab, setTab]             = useState("friends");
  const [searchQ, setSearchQ]     = useState("");
  const [results, setResults]     = useState([]);
  const [searching, setSearching] = useState(false);
  const [sent, setSent]           = useState(new Set());
  const [sending, setSending]     = useState(null);
  const [removing, setRemoving]   = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null); // friend id to confirm
  const [flash, setFlash]         = useState("");

  function showFlash(msg) { setFlash(msg); setTimeout(() => setFlash(""), 3000); }

  async function doSearch(q) {
    setSearchQ(q);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try { setResults(await searchUsers(q, user.id)); }
    finally { setSearching(false); }
  }

  async function doSendRequest(username) {
    setSending(username);
    try {
      await sendFriendRequest(username, user.id);
      setSent(prev => new Set([...prev, username]));
      showFlash("Request sent!");
    } catch (e) { showFlash(e.message); }
    finally { setSending(null); }
  }

  async function doAccept(id) {
    await acceptRequest(id, user.id);
    onFriendsChange();
    showFlash("Friend added!");
  }

  async function doReject(id) {
    await rejectRequest(id, user.id);
    onFriendsChange();
  }

  async function doRemove(friendId) {
    setRemoving(friendId);
    try {
      await removeFriend(friendId, user.id);
      // If this was the active chat, close it
      if (activeFriend?.id === friendId) onSelectFriend(null);
      onFriendsChange();
      showFlash("Friend removed");
    } catch (e) { showFlash(e.message); }
    finally { setRemoving(null); setConfirmRemove(null); }
  }

  const pendingCount = pendingRequests.length;

  return (
    <aside style={s.sidebar}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.appLogo}>
          <span style={s.logoEmoji}>💬</span>
          <span style={s.appName}>RealChat</span>
        </div>
        <div style={s.onlineDot} title="Connected" />
      </div>

      {/* Tabs */}
      <div style={s.tabRow}>
        {[
          ["friends", "Chats"],
          ["requests", pendingCount > 0 ? `Requests (${pendingCount})` : "Requests"],
          ["add", "+ Add"],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            ...s.tabBtn,
            ...(tab === id ? s.tabBtnOn : {}),
            ...(id === "requests" && pendingCount > 0 ? { color:"#f59e0b" } : {}),
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Flash message */}
      {flash && <div style={s.flash}>{flash}</div>}

      {/* Body */}
      <div style={s.body}>

        {/* ── FRIENDS LIST ── */}
        {tab === "friends" && (
          friends.length === 0
            ? <div style={s.empty}>
                <div style={{ fontSize:32, marginBottom:8 }}>👥</div>
                <p style={{ margin:0 }}>No friends yet</p>
                <p style={{ margin:"4px 0 0", fontSize:12, color:"#444" }}>Go to "+ Add" to find people</p>
              </div>
            : friends.map(f => (
              <div key={f.id} style={s.friendRowWrap}>
                <button onClick={() => onSelectFriend(f)}
                  style={{ ...s.friendRow, ...(activeFriend?.id === f.id ? s.friendRowOn : {}) }}>
                  <Avatar user={f} size={36} />
                  <div style={s.friendMeta}>
                    <span style={s.friendName}>{f.username}</span>
                    <span style={s.friendSub}>tap to chat</span>
                  </div>
                </button>

                {/* Remove friend button */}
                {confirmRemove === f.id ? (
                  <div style={s.confirmRow}>
                    <span style={s.confirmText}>Remove?</span>
                    <button onClick={() => doRemove(f.id)} disabled={removing === f.id}
                      style={s.confirmYes}>{removing === f.id ? "..." : "Yes"}</button>
                    <button onClick={() => setConfirmRemove(null)} style={s.confirmNo}>No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmRemove(f.id)} style={s.removeBtn} title="Remove friend">
                    ✕
                  </button>
                )}
              </div>
            ))
        )}

        {/* ── PENDING REQUESTS ── */}
        {tab === "requests" && (
          pendingRequests.length === 0
            ? <div style={s.empty}>
                <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
                <p style={{ margin:0 }}>No pending requests</p>
              </div>
            : pendingRequests.map(r => (
              <div key={r.id} style={s.reqCard}>
                <Avatar user={r.sender} size={34} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={s.reqName}>{r.sender.username}</p>
                  <p style={s.reqSub}>wants to connect</p>
                </div>
                <button onClick={() => doAccept(r.id)} style={s.acceptBtn}>✓</button>
                <button onClick={() => doReject(r.id)} style={s.rejectBtn}>✕</button>
              </div>
            ))
        )}

        {/* ── ADD FRIEND ── */}
        {tab === "add" && (
          <div>
            <div style={s.searchWrap}>
              <span style={s.searchIcon}>🔍</span>
              <input style={s.searchInput} value={searchQ}
                onChange={e => doSearch(e.target.value)}
                placeholder="Search by username…" autoFocus />
            </div>

            {searching && <p style={{ ...s.empty, marginTop:12 }}>Searching…</p>}

            {results.map(u => {
              const isFriend  = friends.some(f => f.id === u.id);
              const requested = sent.has(u.username);
              return (
                <div key={u.id} style={s.resultRow}>
                  <Avatar user={u} size={34} />
                  <span style={s.resultName}>{u.username}</span>
                  {isFriend
                    ? <span style={s.alreadyTag}>Friends</span>
                    : <button
                        disabled={requested || sending === u.username}
                        onClick={() => doSendRequest(u.username)}
                        style={{ ...s.addBtn, ...(requested ? s.addBtnSent : {}) }}>
                        {sending === u.username ? "…" : requested ? "Sent ✓" : "Add"}
                      </button>}
                </div>
              );
            })}

            {!searching && searchQ && results.length === 0 && (
              <p style={{ ...s.empty, marginTop:16 }}>No users found</p>
            )}
          </div>
        )}
      </div>

      {/* User panel */}
      <div style={s.userPanel}>
        <Avatar user={user} size={32} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={s.myName}>{user.username}</div>
          <div style={s.myOnline}>● online</div>
        </div>
        <button onClick={onLogout} style={s.logoutBtn} title="Logout">↩</button>
      </div>
    </aside>
  );
}

const s = {
  sidebar:      { width:260, background:"#0a0a0a", borderRight:"1px solid #161616", display:"flex", flexDirection:"column", height:"100vh", flexShrink:0 },
  header:       { padding:"18px 16px 14px", borderBottom:"1px solid #161616", display:"flex", alignItems:"center", justifyContent:"space-between" },
  appLogo:      { display:"flex", alignItems:"center", gap:8 },
  logoEmoji:    { fontSize:20 },
  appName:      { fontSize:16, fontWeight:700, color:"#fff", letterSpacing:"-0.3px" },
  onlineDot:    { width:8, height:8, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 6px #22c55e" },
  tabRow:       { display:"flex", padding:"10px 8px 0", gap:2 },
  tabBtn:       { flex:1, padding:"8px 4px", background:"none", border:"none", borderRadius:"8px 8px 0 0", fontSize:12, fontWeight:500, color:"#444", cursor:"pointer", transition:"all 0.15s" },
  tabBtnOn:     { background:"#111", color:"#fff", borderBottom:"2px solid #6366f1" },
  flash:        { margin:"8px 10px 0", padding:"8px 12px", background:"#6366f122", border:"1px solid #6366f133", borderRadius:8, fontSize:12, color:"#a5b4fc", textAlign:"center" },
  body:         { flex:1, overflowY:"auto", padding:"10px 8px" },
  empty:        { textAlign:"center", color:"#555", fontSize:13, marginTop:32, lineHeight:1.6, padding:"0 16px" },
  friendRowWrap:{ display:"flex", alignItems:"center", gap:2, marginBottom:2, borderRadius:10, overflow:"hidden", background:"transparent", transition:"background 0.1s" },
  friendRow:    { flex:1, display:"flex", alignItems:"center", gap:10, padding:"9px 10px", background:"none", border:"none", borderRadius:10, cursor:"pointer", textAlign:"left", transition:"background 0.12s" },
  friendRowOn:  { background:"#161616" },
  friendMeta:   { display:"flex", flexDirection:"column", minWidth:0 },
  friendName:   { fontSize:14, fontWeight:500, color:"#e5e5e5", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  friendSub:    { fontSize:11, color:"#444", marginTop:1 },
  removeBtn:    { background:"none", border:"none", color:"#333", fontSize:14, cursor:"pointer", padding:"8px 6px", borderRadius:6, flexShrink:0, transition:"color 0.15s", lineHeight:1 },
  confirmRow:   { display:"flex", alignItems:"center", gap:4, padding:"0 6px", flexShrink:0 },
  confirmText:  { fontSize:11, color:"#f87171", whiteSpace:"nowrap" },
  confirmYes:   { background:"#7f1d1d", color:"#fca5a5", border:"none", borderRadius:5, padding:"3px 8px", fontSize:11, cursor:"pointer", fontWeight:600 },
  confirmNo:    { background:"#1a1a1a", color:"#666", border:"none", borderRadius:5, padding:"3px 8px", fontSize:11, cursor:"pointer" },
  reqCard:      { display:"flex", alignItems:"center", gap:8, background:"#111", border:"1px solid #1a1a1a", borderRadius:10, padding:"10px 10px", marginBottom:6 },
  reqName:      { fontSize:13, fontWeight:600, color:"#e5e5e5", margin:0 },
  reqSub:       { fontSize:11, color:"#444", margin:0 },
  acceptBtn:    { background:"#052e16", color:"#4ade80", border:"1px solid #166534", borderRadius:6, padding:"5px 9px", cursor:"pointer", fontSize:13, fontWeight:700 },
  rejectBtn:    { background:"#1c0a0a", color:"#f87171", border:"1px solid #7f1d1d", borderRadius:6, padding:"5px 9px", cursor:"pointer", fontSize:13, fontWeight:700 },
  searchWrap:   { display:"flex", alignItems:"center", background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:10, padding:"0 10px", marginBottom:8 },
  searchIcon:   { fontSize:14, marginRight:6, opacity:0.5 },
  searchInput:  { flex:1, padding:"10px 0", background:"transparent", border:"none", color:"#e5e5e5", fontSize:13, outline:"none", fontFamily:"inherit" },
  resultRow:    { display:"flex", alignItems:"center", gap:10, padding:"8px 6px", borderBottom:"1px solid #111" },
  resultName:   { flex:1, fontSize:14, color:"#e5e5e5", fontWeight:500 },
  addBtn:       { background:"#6366f1", color:"#fff", border:"none", borderRadius:7, padding:"5px 14px", fontSize:12, fontWeight:600, cursor:"pointer", transition:"background 0.15s" },
  addBtnSent:   { background:"#1a1a2e", color:"#6366f1", cursor:"default" },
  alreadyTag:   { fontSize:11, color:"#22c55e", fontWeight:600 },
  userPanel:    { display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderTop:"1px solid #161616" },
  myName:       { fontSize:13, fontWeight:600, color:"#e5e5e5", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  myOnline:     { fontSize:11, color:"#22c55e" },
  logoutBtn:    { background:"none", border:"none", color:"#444", fontSize:18, cursor:"pointer", transition:"color 0.15s" },
};