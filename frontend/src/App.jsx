// src/App.jsx  (v3 — with Push Notifications)

import { useState, useEffect, useCallback } from "react";
import AuthPage   from "./components/AuthPage";
import Sidebar    from "./components/Sidebar";
import DMWindow   from "./components/DMWindow";
import { getFriends, getPendingRequests } from "./api/client";
import { useWebSocket } from "./hooks/useWebSocket";
import { useNotifications } from "./hooks/useNotifications";

export default function App() {
  const [user, setUser]             = useState(() => {
    try { return JSON.parse(localStorage.getItem("chat_user")); } catch { return null; }
  });
  const [friends, setFriends]       = useState([]);
  const [pendingReqs, setPending]   = useState([]);
  const [activeFriend, setActive]   = useState(null);
  const [liveMessages, setLiveMsgs] = useState([]);
  const [toast, setToast]           = useState("");

  const { permission, requestPermission, notify } = useNotifications();

  // ── Toast helper ──────────────────────────────────────────────────────────
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  // ── Fetch friends + pending requests from API ─────────────────────────────
  async function refreshData(currentUser) {
    const u = currentUser || user;
    if (!u) return;
    try {
      const [f, p] = await Promise.all([
        getFriends(u.id),
        getPendingRequests(u.id),
      ]);
      setFriends(f);
      setPending(p);
    } catch (e) {
      console.error("refreshData failed", e);
    }
  }

  // Run on login and on page load if already logged in
  useEffect(() => {
    if (user) refreshData(user);
  }, [user?.id]);

  // Ask for notification permission 2s after login (non-intrusive)
  useEffect(() => {
    if (user && permission === "default") {
      setTimeout(() => requestPermission(), 2000);
    }
  }, [user?.id]);

  // ── WebSocket message handler ─────────────────────────────────────────────
  const handleWS = useCallback((data) => {

    // ---- Incoming DM ----
    if (data.type === "dm") {
      setLiveMsgs(prev => [...prev, data]);
      // Show notification only if tab is not focused
      notify(
        `💬 ${data.sender?.username}`,
        data.content,
        `dm-${data.sender?.id}`
      );

    // ---- Incoming friend request ----
    } else if (data.type === "friend_request") {
      setPending(prev => {
        if (prev.find(r => r.id === data.request_id)) return prev;
        return [...prev, {
          id:         data.request_id,
          status:     "pending",
          sender:     data.from,
          receiver:   user,
          created_at: new Date().toISOString(),
        }];
      });
      showToast(`📩 ${data.from.username} sent you a friend request`);
      notify(
        "👋 New Friend Request",
        `${data.from.username} wants to connect with you`,
        `fr-${data.request_id}`
      );

    // ---- Friend request accepted ----
    } else if (data.type === "request_accepted") {
      refreshData(user);
      showToast(`✅ ${data.friend.username} accepted your request!`);
      notify(
        "✅ Request Accepted!",
        `${data.friend.username} accepted your friend request. Say hello!`,
        `accept-${data.friend.id}`
      );
    }

  }, [user?.id, permission]);

  const { send: sendWS } = useWebSocket(user?.id, handleWS);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  function handleAuth(u) {
    setUser(u);
    localStorage.setItem("chat_user", JSON.stringify(u));
    refreshData(u);
  }

  function handleLogout() {
    setUser(null);
    setFriends([]);
    setPending([]);
    setActive(null);
    setLiveMsgs([]);
    localStorage.removeItem("chat_user");
  }

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!user) return <AuthPage onAuth={handleAuth} />;

  // ── Logged in ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <Sidebar
        user={user}
        friends={friends}
        pendingRequests={pendingReqs}
        activeFriend={activeFriend}
        onSelectFriend={setActive}
        onFriendsChange={() => refreshData(user)}
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
            <p style={{ fontSize:18, color:"#64748b", marginTop:16 }}>
              Select a friend to start a private chat
            </p>
            <p style={{ fontSize:13, color:"#94a3b8" }}>
              Only you and your friend can see your messages
            </p>
            {permission === "default" && (
              <button onClick={requestPermission} style={notifBtn}>
                🔔 Enable notifications
              </button>
            )}
            {permission === "granted" && (
              <p style={{ fontSize:12, color:"#22c55e", marginTop:8 }}>
                ✓ Notifications enabled
              </p>
            )}
            {permission === "denied" && (
              <p style={{ fontSize:12, color:"#f87171", marginTop:8 }}>
                Notifications blocked — enable in browser settings
              </p>
            )}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && <div style={toastStyle}>{toast}</div>}
    </div>
  );
}

const centered = {
  display:"flex", flexDirection:"column", alignItems:"center",
  justifyContent:"center", height:"100%", textAlign:"center", padding:24,
};

const notifBtn = {
  marginTop:16, padding:"10px 20px",
  background:"#6366f1", color:"#fff",
  border:"none", borderRadius:8,
  fontSize:14, fontWeight:600, cursor:"pointer",
};

const toastStyle = {
  position:"fixed", bottom:24, right:24,
  background:"#1e293b", color:"#f1f5f9",
  padding:"12px 20px", borderRadius:10,
  fontSize:14, fontWeight:500,
  boxShadow:"0 4px 16px rgba(0,0,0,0.2)",
  zIndex:9999, maxWidth:320,
};