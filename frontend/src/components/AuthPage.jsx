// =============================================================================
// src/components/AuthPage.jsx
//
// The login / register screen shown before the user enters the chat.
// Manages its own local form state; calls the API layer on submit.
// On success, calls onAuth(user) to lift the user object up to App.jsx.
// =============================================================================

import { useState } from "react";
import { loginUser, registerUser } from "../api/client";

const COLORS = ["indigo", "rose", "emerald", "amber", "sky", "violet", "orange"];

const COLOR_MAP = {
  indigo:  { bg: "#e0e7ff", text: "#3730a3" },
  rose:    { bg: "#ffe4e6", text: "#9f1239" },
  emerald: { bg: "#d1fae5", text: "#065f46" },
  amber:   { bg: "#fef3c7", text: "#92400e" },
  sky:     { bg: "#e0f2fe", text: "#0c4a6e" },
  violet:  { bg: "#ede9fe", text: "#4c1d95" },
  orange:  { bg: "#ffedd5", text: "#7c2d12" },
};

export default function AuthPage({ onAuth }) {
  const [mode, setMode]       = useState("login");   // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [color, setColor]     = useState("indigo");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user =
        mode === "login"
          ? await loginUser(username, password)
          : await registerUser(username, password, color);
      onAuth(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logo / title */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>💬</div>
          <h1 style={styles.title}>RealChat</h1>
          <p style={styles.subtitle}>Real-time messaging powered by WebSockets</p>
        </div>

        {/* Tab toggle */}
        <div style={styles.tabs}>
          {["login", "register"].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              style={{ ...styles.tab, ...(mode === m ? styles.tabActive : {}) }}
            >
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_username"
            required
            autoFocus
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {/* Avatar color picker — only shown on register */}
          {mode === "register" && (
            <div>
              <label style={styles.label}>Avatar color</label>
              <div style={styles.colorRow}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      ...styles.colorDot,
                      background: COLOR_MAP[c].bg,
                      border: color === c
                        ? `3px solid ${COLOR_MAP[c].text}`
                        : "3px solid transparent",
                    }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p style={styles.switchText}>
          {mode === "login" ? "No account? " : "Already registered? "}
          <span
            style={styles.switchLink}
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ---- Inline styles (no external CSS needed) ----
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8fafc",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "40px 36px",
    width: 380,
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    border: "1px solid #e2e8f0",
  },
  logo: { textAlign: "center", marginBottom: 28 },
  logoIcon: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 700, color: "#1e293b", margin: 0 },
  subtitle: { fontSize: 13, color: "#94a3b8", marginTop: 4 },
  tabs: {
    display: "flex",
    background: "#f1f5f9",
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: "8px 0",
    border: "none",
    background: "transparent",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
    color: "#64748b",
    fontWeight: 500,
    transition: "all 0.15s",
  },
  tabActive: {
    background: "#fff",
    color: "#1e293b",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  label: { fontSize: 13, fontWeight: 600, color: "#475569" },
  input: {
    padding: "10px 14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    color: "#1e293b",
    transition: "border-color 0.15s",
  },
  colorRow: { display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    cursor: "pointer",
    transition: "transform 0.1s",
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
    background: "#fef2f2",
    padding: "8px 12px",
    borderRadius: 8,
    margin: 0,
  },
  btn: {
    padding: "12px",
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    transition: "background 0.15s",
  },
  switchText: { textAlign: "center", fontSize: 13, color: "#64748b", marginTop: 16 },
  switchLink: { color: "#6366f1", cursor: "pointer", fontWeight: 600 },
};