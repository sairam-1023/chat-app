// src/App.jsx  (v4 — black theme + remove friend + push notifications)

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

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

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

  useEffect(() => {
    if (user) refreshData(user);
  }, [user?.id]);

  useEffect(() => {
    if (user && permission === "default") {
      setTimeout(() => requestPermission(), 2000);
    }
  }, [user?.id]);

  const handleWS = useCallback((data) => {

    if (data.type === "dm") {
      setLiveMsgs(prev => [...prev, data]);
      notify(`💬 ${data.sender?.username}`, data.content, `dm-${data.sender?.id}`);

    } else if (data.type === "friend_request") {
      setPending(prev => {
        if (prev.find(r => r.id === data.request_id)) return prev;
        return [...prev, {
          id: data.request_id, status:"pending",
          sender: data.from, receiver: user,
          created_at: new Date().toISOString(),
        }];
      });
      showToast(`📩 ${data.from.username} sent you a friend request`);
      notify("👋 New Friend Request", `${data.from.username} wants to connect`, `fr-${data.request_id}`);

    } else if (data.type === "request_accepted") {
      refreshData(user);
      showToast(`✅ ${data.friend.username} accepted your request!`);
      notify("✅ Request Accepted!", `${data.friend.username} is now your friend`, `accept-${data.friend.id}`);

    } else if (data.type === "friend_removed") {
      // The other user removed us — update our friends list + close their chat if open
      refreshData(user);
      setActive(prev => prev?.id === data.by_user_id ? null : prev);
      showToast("A friend removed you from their list");
    }

  }, [user?.id, permission]);

  const { send: sendWS } = useWebSocket(user?.id, handleWS);

  function handleAuth(u) {
    setUser(u);
    localStorage.setItem("chat_user", JSON.stringify(u));
    refreshData(u);
  }

  function handleLogout() {
    setUser(null); setFriends([]); setPending([]);
    setActive(null); setLiveMsgs([]);
    localStorage.removeItem("chat_user");
  }

  if (!user) return <AuthPage onAuth={handleAuth} />;

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif", background:"#080808" }}>
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
            <div style={emptyIcon}>💬</div>
            <p style={emptyTitle}>Your messages</p>
            <p style={emptySub}>Select a friend to start a private conversation</p>

            {permission === "default" && (
              <button onClick={requestPermission} style={notifBtn}>
                🔔 Enable notifications
              </button>
            )}
            {permission === "granted" && (
              <p style={{ fontSize:12, color:"#22c55e", marginTop:12 }}>✓ Notifications enabled</p>
            )}
            {permission === "denied" && (
              <p style={{ fontSize:12, color:"#f87171", marginTop:12 }}>
                Notifications blocked — enable in browser settings
              </p>
            )}
          </div>
        )}
      </main>

      {toast && <div style={toastStyle}>{toast}</div>}
    </div>
  );
}

const centered   = { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", textAlign:"center", padding:24 };
const emptyIcon  = { fontSize:52, filter:"drop-shadow(0 0 30px rgba(99,102,241,0.3))", marginBottom:16 };
const emptyTitle = { fontSize:20, fontWeight:700, color:"#fff", margin:"0 0 8px", letterSpacing:"-0.3px" };
const emptySub   = { fontSize:14, color:"#444", margin:0 };
const notifBtn   = { marginTop:20, padding:"10px 22px", background:"#6366f122", color:"#a5b4fc", border:"1px solid #6366f133", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" };
const toastStyle = { position:"fixed", bottom:24, right:24, background:"#111", color:"#e5e5e5", border:"1px solid #1a1a1a", padding:"12px 20px", borderRadius:12, fontSize:13, fontWeight:500, boxShadow:"0 8px 32px rgba(0,0,0,0.6)", zIndex:9999, maxWidth:320 };