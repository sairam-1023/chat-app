// src/components/AuthPage.jsx — black aesthetic theme

import { useState } from "react";
import { loginUser, registerUser } from "../api/client";

const COLORS = ["indigo","rose","emerald","amber","sky","violet","orange"];
const CMAP   = { indigo:"#4f46e5",rose:"#e11d48",emerald:"#059669",amber:"#d97706",sky:"#0284c7",violet:"#7c3aed",orange:"#ea580c" };

export default function AuthPage({ onAuth }) {
  const [mode, setMode]     = useState("login");
  const [username, setUser] = useState("");
  const [password, setPass] = useState("");
  const [color, setColor]   = useState("indigo");
  const [error, setError]   = useState("");
  const [loading, setLoad]  = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(""); setLoad(true);
    try {
      const user = mode === "login"
        ? await loginUser(username, password)
        : await registerUser(username, password, color);
      onAuth(user);
    } catch (err) { setError(err.message); }
    finally { setLoad(false); }
  }

  return (
    <div style={s.page}>
      {/* Subtle grid background */}
      <div style={s.grid} />

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoIcon}>💬</div>
          <h1 style={s.title}>RealChat</h1>
          <p style={s.sub}>Private · Secure · Real-time</p>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ ...s.tab, ...(mode === m ? s.tabOn : {}) }}>
              {m === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Username</label>
            <input style={s.input} value={username}
              onChange={e => setUser(e.target.value)}
              placeholder="your_username" required autoFocus />
          </div>

          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password}
              onChange={e => setPass(e.target.value)}
              placeholder="••••••••" required />
          </div>

          {mode === "register" && (
            <div style={s.field}>
              <label style={s.label}>Avatar color</label>
              <div style={{ display:"flex", gap:10, marginTop:6, flexWrap:"wrap" }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)} style={{
                    width:28, height:28, borderRadius:"50%",
                    background: CMAP[c],
                    cursor:"pointer",
                    border: color === c ? `3px solid #fff` : "3px solid transparent",
                    boxShadow: color === c ? `0 0 0 2px ${CMAP[c]}` : "none",
                    transition: "all 0.15s",
                  }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={s.errBox}>
              <span style={{ marginRight:6 }}>⚠️</span>{error}
            </div>
          )}

          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? (
              <span style={s.spinner}>◌</span>
            ) : mode === "login" ? "Sign in →" : "Create account →"}
          </button>
        </form>

        <p style={s.switchText}>
          {mode === "login" ? "Don't have an account?" : "Already registered?"}
          {" "}
          <span style={s.switchLink}
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Register" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
    background:"#080808", fontFamily:"'Segoe UI',system-ui,sans-serif", position:"relative", overflow:"hidden",
  },
  grid: {
    position:"absolute", inset:0, zIndex:0,
    backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
    backgroundSize:"40px 40px",
  },
  card: {
    position:"relative", zIndex:1,
    background:"#111", border:"1px solid #222",
    borderRadius:20, padding:"40px 36px", width:380,
    boxShadow:"0 0 60px rgba(99,102,241,0.08), 0 24px 48px rgba(0,0,0,0.6)",
  },
  logoWrap: { textAlign:"center", marginBottom:28 },
  logoIcon: { fontSize:44, filter:"drop-shadow(0 0 20px rgba(99,102,241,0.5))" },
  title:    { fontSize:28, fontWeight:700, color:"#fff", margin:"8px 0 4px", letterSpacing:"-0.5px" },
  sub:      { fontSize:13, color:"#555", marginTop:4 },
  tabs:     { display:"flex", background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:12, padding:4, marginBottom:24, gap:4 },
  tab:      { flex:1, padding:"9px 0", border:"none", background:"transparent", borderRadius:9, fontSize:14, cursor:"pointer", color:"#555", fontWeight:500, transition:"all 0.15s" },
  tabOn:    { background:"#1a1a1a", color:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.5)" },
  form:     { display:"flex", flexDirection:"column", gap:16 },
  field:    { display:"flex", flexDirection:"column", gap:6 },
  label:    { fontSize:12, fontWeight:600, color:"#666", textTransform:"uppercase", letterSpacing:"0.06em" },
  input:    {
    padding:"12px 14px", background:"#0d0d0d", border:"1px solid #222",
    borderRadius:10, fontSize:14, outline:"none", color:"#fff",
    transition:"border-color 0.15s, box-shadow 0.15s",
    fontFamily:"inherit",
  },
  errBox: {
    background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)",
    borderRadius:8, padding:"10px 14px", fontSize:13, color:"#f87171",
    display:"flex", alignItems:"center",
  },
  btn: {
    padding:"13px", background:"#6366f1", color:"#fff",
    border:"none", borderRadius:10, fontSize:15, fontWeight:600,
    cursor:"pointer", marginTop:4, letterSpacing:"0.02em",
    boxShadow:"0 0 20px rgba(99,102,241,0.3)",
    transition:"background 0.15s, box-shadow 0.15s",
  },
  spinner:    { animation:"spin 1s linear infinite", display:"inline-block" },
  switchText: { textAlign:"center", fontSize:13, color:"#555", marginTop:20 },
  switchLink: { color:"#6366f1", cursor:"pointer", fontWeight:600 },
};