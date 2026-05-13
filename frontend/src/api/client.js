// src/api/client.js
// All HTTP calls to the FastAPI backend. Only this file knows the base URL.

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function req(path, options = {}) {
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

// Auth
export const registerUser = (username, password, avatar_color) =>
  req("/register", { method: "POST", body: JSON.stringify({ username, password, avatar_color }) });

export const loginUser = (username, password) =>
  req("/login", { method: "POST", body: JSON.stringify({ username, password }) });

// Users
export const searchUsers = (q, me) => req(`/users/search?q=${encodeURIComponent(q)}&me=${me}`);

// Friend requests
export const sendFriendRequest  = (username, me)    => req(`/friend-requests?me=${me}`, { method: "POST", body: JSON.stringify({ username }) });
export const getPendingRequests = (me)               => req(`/friend-requests/pending?me=${me}`);
export const acceptRequest      = (id, me)           => req(`/friend-requests/${id}/accept?me=${me}`, { method: "POST" });
export const rejectRequest      = (id, me)           => req(`/friend-requests/${id}/reject?me=${me}`, { method: "POST" });
export const getFriends         = (me)               => req(`/friends?me=${me}`);

// DMs
export const getDMHistory = (otherId, me) => req(`/dm/${otherId}?me=${me}`);