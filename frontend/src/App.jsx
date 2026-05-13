// =============================================================================
// src/App.jsx — Root component
//
// This is the top of the React component tree. It owns:
//   - user state (null = not logged in)
//   - rooms list (fetched from REST API)
//   - activeRoom (currently selected room)
//
// State flow (one direction, top down):
//
//   App
//   ├── user → passed to Sidebar, ChatWindow
//   ├── rooms → passed to Sidebar
//   └── activeRoom → passed to ChatWindow
//
// Event flow (bottom up via callbacks):
//
//   AuthPage  ──onAuth(user)──────► App sets user
//   Sidebar   ──onRoomSelect(r)──► App sets activeRoom
//   Sidebar   ──onRoomsChange()──► App refetches rooms
//   Sidebar   ──onLogout()───────► App clears user
// =============================================================================

import { useState, useEffect } from "react";
import AuthPage   from "./components/AuthPage";
import Sidebar    from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import { getRooms } from "./api/client";

export default function App() {
  // user: null until logged in; then { id, username, avatar_color }
  const [user, setUser] = useState(() => {
    // Persist login across page refreshes using localStorage
    const saved = localStorage.getItem("chat_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [rooms, setRooms]           = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Fetch rooms whenever user logs in
  useEffect(() => {
    if (!user) return;
    fetchRooms();
  }, [user]);

  async function fetchRooms() {
    setLoadingRooms(true);
    try {
      const data = await getRooms();
      setRooms(data);
      // Auto-select the first room
      if (data.length > 0 && !activeRoom) {
        setActiveRoom(data[0]);
      }
    } catch (err) {
      console.error("Failed to load rooms:", err);
    } finally {
      setLoadingRooms(false);
    }
  }

  function handleAuth(userData) {
    setUser(userData);
    localStorage.setItem("chat_user", JSON.stringify(userData));
  }

  function handleLogout() {
    setUser(null);
    setActiveRoom(null);
    setRooms([]);
    localStorage.removeItem("chat_user");
  }

  // ---- Not logged in ----
  if (!user) {
    return <AuthPage onAuth={handleAuth} />;
  }

  // ---- Logged in ----
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar
        user={user}
        rooms={rooms}
        activeRoom={activeRoom}
        onRoomSelect={setActiveRoom}
        onRoomsChange={fetchRooms}
        onLogout={handleLogout}
      />

      <main style={{ flex: 1, overflow: "hidden" }}>
        {loadingRooms ? (
          <div style={centeredStyle}>Loading rooms…</div>
        ) : activeRoom ? (
          <ChatWindow room={activeRoom} user={user} />
        ) : (
          <div style={centeredStyle}>
            <p style={{ fontSize: 18, color: "#94a3b8" }}>Select a room to start chatting</p>
          </div>
        )}
      </main>
    </div>
  );
}

const centeredStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  color: "#64748b",
};