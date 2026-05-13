// src/App.jsx  (v2 — Private DMs + Friend Requests)
//
// State owned here:
//   user          — logged-in user (null = not logged in)
//   friends       — accepted friends list
//   pendingReqs   — incoming pending friend requests
//   activeFriend  — the friend whose DM window is open
//   liveMessages  — all real-time DMs received this session
//
// WebSocket messages handled here (one WS for the whole app):
//   "friend_request"  → append to pendingReqs + show toast
//   "request_accepted"→ refetch friends + show toast
//   "dm"              → append to liveMessages

import { useState, useEffect, useCallback } from "react";
import AuthPage   from "./components/AuthPage";
import Sidebar    from "./components/Sidebar";
import DMWindow   from "./components/DMWindow";
import { getFriends, getPendingRequests } from "./api/client";
import { useWebSocket } from "./hooks/useWebSocket";

export default function App() {
  const [user, setUser]             = useState(() => {
    try { return JSON.parse(localStorage.getItem("chat_user")); } catch { return null; }
  });
  const [friends, setFriends]       = useState([]);
  const [pendingReqs, setPending]   = useState([]);
  const [activeFriend, setActive]   = useState(null);
  const [liveMessages, setLiveMsgs] = useState([]);
  const [toast, setToast]           = useState("");

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  // Handle all incoming WebSocket messages
  const handleWS = useCallback((data) => {
    if (data.type === "dm") {
      setLiveMsgs(prev => [...prev, data]);
    } else if (data.type === "friend_request") {
      // Someone sent me a request — show in sidebar + toast
      setPending(prev => {
        if (prev.find(r => r.id === data.request_id)) return prev;
        return [...prev, {
          id: data.request_id, status: "pending",
          sender: data.from, receiver: user,
          created_at: new Date().toISOString(),
        }];
      });
      showToast(`📩 ${data.from.username} sent you a friend request`);
    } else if (data.type === "request_accepted") {
      // My request was accepted — add to friends + toast
      setFriends(prev => prev.find(f => f.id === data.friend.id) ? prev : [...prev, data.friend]);
      showToast(`✅ ${data.friend.username} accepted your request!`);
    }
  }, [user]);

  const { send: sendWS } = useWebSocket(user?.id, handleWS);

  // Fetch friends + pending requests when logged in
  useEffect(() => {
    if (!user) return;
    refreshData();
  }, [user?.id]);

  async function refreshData() {
    if (!user) return;
    const [f, p] = await Promise.all([
      getFriends(user.id),
      getPendingRequests(user.id),
    ]);
    setFriends(f);
    setPending(p);
  }

  function handleAuth(u) {
    setUser(u);
    localStorage.setItem("chat_user", JSON.stringify(u));
  }

  function handleLogout() {
    setUser(null); setFriends([]); setPending([]); setActive(null); setLiveMsgs([]);
    localStorage.removeItem("chat_user");
  }

  if (!user) return <AuthPage onAuth={handleAuth} />;

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <Sidebar
        user={user}
        friends={friends}
        pendingRequests={pendingReqs}
        activeFriend={activeFriend}
        onSelectFriend={setActive}
        onFriendsChange={refreshData}
        onLogout={handleLogout}
      />

      <main style={{ flex:1, overflow:"hidden" }}>
        {activeFriend ? (
          <DMWindow
            me={user}
            friend={activeFriend}
            sendWS={sendWS}
            liveMessages={liveMessages}
          />
        ) : (
          <div style={centered}>
            <div style={{ fontSize:56 }}>🔒</div>
            <p style={{ fontSize:18, color:"#64748b", marginTop:16 }}>Select a friend to start a private chat</p>
            <p style={{ fontSize:13, color:"#94a3b8" }}>Only you and your friend can see your messages</p>
          </div>
        )}
      </main>

      {/* Toast notifications */}
      {toast && (
        <div style={toastStyle}>{toast}</div>
      )}
    </div>
  );
}

const centered = {
  display:"flex", flexDirection:"column", alignItems:"center",
  justifyContent:"center", height:"100%", textAlign:"center",
};

const toastStyle = {
  position:"fixed", bottom:24, right:24,
  background:"#1e293b", color:"#f1f5f9",
  padding:"12px 20px", borderRadius:10,
  fontSize:14, fontWeight:500,
  boxShadow:"0 4px 16px rgba(0,0,0,0.2)",
  zIndex:9999, maxWidth:300,
  animation:"fadeIn 0.2s ease",
};