// =============================================================================
// src/components/Sidebar.jsx
//
// Left panel showing:
//   - Current user info + logout button
//   - List of all rooms (fetched from GET /rooms)
//   - "New room" form to create a room (POST /rooms)
//   - Online indicator (green dot)
//
// Props:
//   user         — the logged-in user object
//   rooms        — array of room objects from the API
//   activeRoom   — currently selected room
//   onRoomSelect — called when user clicks a room
//   onRoomsChange — called after a new room is created (triggers refetch)
//   onLogout     — called when user clicks Logout
// =============================================================================

import { useState } from "react";
import { createRoom } from "../api/client";

const COLOR_MAP = {
  indigo:  { bg: "#e0e7ff", text: "#3730a3" },
  rose:    { bg: "#ffe4e6", text: "#9f1239" },
  emerald: { bg: "#d1fae5", text: "#065f46" },
  amber:   { bg: "#fef3c7", text: "#92400e" },
  sky:     { bg: "#e0f2fe", text: "#0c4a6e" },
  violet:  { bg: "#ede9fe", text: "#4c1d95" },
  orange:  { bg: "#ffedd5", text: "#7c2d12" },
};

const ROOM_ICONS = ["#", "⚡", "🎯", "🔥", "💡", "🛸", "🎸"];

export default function Sidebar({ user, rooms, activeRoom, onRoomSelect, onRoomsChange, onLogout }) {
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newName, setNewName]         = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [creating, setCreating]       = useState(false);
  const [error, setError]             = useState("");

  const colors = COLOR_MAP[user.avatar_color] || COLOR_MAP.indigo;
  const initials = user.username.slice(0, 2).toUpperCase();

  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      await createRoom(newName.trim(), newDesc.trim());
      setNewName("");
      setNewDesc("");
      setShowNewRoom(false);
      onRoomsChange(); // tell App.jsx to refetch the rooms list
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <aside style={styles.sidebar}>

      {/* App header */}
      <div style={styles.header}>
        <span style={styles.appName}>💬 RealChat</span>
        <div style={styles.onlinePip} title="Connected" />
      </div>

      {/* Rooms section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionLabel}>Rooms</span>
          <button
            style={styles.addBtn}
            onClick={() => setShowNewRoom(!showNewRoom)}
            title="Create new room"
          >
            {showNewRoom ? "✕" : "+"}
          </button>
        </div>

        {/* New room form */}
        {showNewRoom && (
          <form onSubmit={handleCreateRoom} style={styles.newRoomForm}>
            <input
              style={styles.miniInput}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Room name"
              required
              autoFocus
            />
            <input
              style={styles.miniInput}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
            />
            {error && <p style={styles.miniError}>{error}</p>}
            <button type="submit" disabled={creating} style={styles.createBtn}>
              {creating ? "Creating…" : "Create room"}
            </button>
          </form>
        )}

        {/* Room list */}
        <div style={styles.roomList}>
          {rooms.map((room, i) => {
            const isActive = activeRoom?.id === room.id;
            return (
              <button
                key={room.id}
                onClick={() => onRoomSelect(room)}
                style={{
                  ...styles.roomItem,
                  ...(isActive ? styles.roomItemActive : {}),
                }}
              >
                <span style={styles.roomIcon}>{ROOM_ICONS[i % ROOM_ICONS.length]}</span>
                <div style={styles.roomText}>
                  <span style={styles.roomName}>{room.name}</span>
                  {room.description && (
                    <span style={styles.roomDesc}>{room.description}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* User panel at bottom */}
      <div style={styles.userPanel}>
        <div
          style={{
            ...styles.avatar,
            background: colors.bg,
            color: colors.text,
          }}
        >
          {initials}
        </div>
        <div style={styles.userInfo}>
          <span style={styles.userName}>{user.username}</span>
          <span style={styles.userStatus}>● online</span>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn} title="Log out">
          ↩
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 240,
    background: "#1e293b",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    height: "100vh",
  },
  header: {
    padding: "20px 16px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #334155",
  },
  appName: { fontSize: 16, fontWeight: 700, color: "#f1f5f9" },
  onlinePip: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#22c55e",
  },
  section: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "12px 0" },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px 8px",
  },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" },
  addBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: 18,
    cursor: "pointer",
    lineHeight: 1,
    padding: "0 2px",
  },
  newRoomForm: {
    padding: "0 12px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  miniInput: {
    padding: "7px 10px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 6,
    color: "#f1f5f9",
    fontSize: 13,
    outline: "none",
  },
  miniError: { color: "#f87171", fontSize: 12, margin: 0 },
  createBtn: {
    padding: "7px",
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  roomList: { overflowY: "auto", flex: 1, padding: "0 8px" },
  roomItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "8px 10px",
    background: "none",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    textAlign: "left",
    color: "#94a3b8",
    transition: "background 0.1s",
    marginBottom: 2,
  },
  roomItemActive: {
    background: "#334155",
    color: "#f1f5f9",
  },
  roomIcon: { fontSize: 16, flexShrink: 0 },
  roomText: { display: "flex", flexDirection: "column", minWidth: 0 },
  roomName: { fontSize: 14, fontWeight: 500, color: "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  roomDesc: { fontSize: 11, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userPanel: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderTop: "1px solid #334155",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  userInfo: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  userName: { fontSize: 13, fontWeight: 600, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userStatus: { fontSize: 11, color: "#22c55e" },
  logoutBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: 18,
    cursor: "pointer",
    flexShrink: 0,
  },
};