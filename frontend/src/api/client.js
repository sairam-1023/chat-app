// =============================================================================
// src/api/client.js
//
// This file is the ONLY place that knows the backend URL.
// Every component imports from here — never writes fetch() calls directly.
// This pattern is called the "API layer" or "service layer".
//
// If you ever change the backend URL or add auth headers,
// you change it HERE and nowhere else.
// =============================================================================

const BASE = "http://localhost:8000";

// Generic helper — throws if the response is not 2xx
async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ---- Auth ----

export const registerUser = (username, password, avatar_color) =>
  request("/register", {
    method: "POST",
    body: JSON.stringify({ username, password, avatar_color }),
  });

export const loginUser = (username, password) =>
  request("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

// ---- Rooms ----

export const getRooms = () => request("/rooms");

export const createRoom = (name, description = "") =>
  request("/rooms", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });

// ---- Messages (history) ----

export const getMessages = (roomId, limit = 50) =>
  request(`/rooms/${roomId}/messages?limit=${limit}`);