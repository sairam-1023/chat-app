// src/components/AuthPage.jsx
import { useState } from "react";
import { loginUser, registerUser } from "../api/client";

const COLORS = ["indigo","rose","emerald","amber","sky","violet","orange"];
const CMAP   = { indigo:"#e0e7ff", rose:"#ffe4e6", emerald:"#d1fae5", amber:"#fef3c7", sky:"#e0f2fe", violet:"#ede9fe", orange:"#ffedd5" };
const CTEXT  = { indigo:"#3730a3", rose:"#9f1239", emerald:"#065f46", amber:"#92400e", sky:"#0c4a6e", violet:"#4c1d95", orange:"#7c2d12" };

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
      <div style={s.card}>
        <div style={s.logo}>
          <div style={{ fontSize: 44 }}>💬</div>
          <h1 style={s.title}>RealChat</h1>
          <p style={s.sub}>Private messaging with friend requests</p>
        </div>

        <div style={s.tabs}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ ...s.tab, ...(mode === m ? s.tabOn : {}) }}>
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={s.form}>
          <label style={s.label}>Username</label>
          <input style={s.input} value={username} onChange={e => setUser(e.target.value)} placeholder="your_username" required autoFocus />

          <label style={s.label}>Password</label>
          <input style={s.input} type="password" value={password} onChange={e => setPass(e.target.value)} placeholder="••••••••" required />

          {mode === "register" && (
            <>
              <label style={s.label}>Avatar color</label>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)} style={{
                    width:30, height:30, borderRadius:"50%", background:CMAP[c], cursor:"pointer",
                    border: color === c ? `3px solid ${CTEXT[c]}` : "3px solid transparent",
                  }} />
                ))}
              </div>
            </>
          )}

          {error && <p style={s.err}>{error}</p>}
          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p style={s.switch}>
          {mode === "login" ? "No account? " : "Already registered? "}
          <span style={s.link} onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Create one" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}

const s = {
  page:  { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f8fafc", fontFamily:"'Segoe UI',system-ui,sans-serif" },
  card:  { background:"#fff", borderRadius:16, padding:"40px 36px", width:380, boxShadow:"0 4px 24px rgba(0,0,0,0.08)", border:"1px solid #e2e8f0" },
  logo:  { textAlign:"center", marginBottom:24 },
  title: { fontSize:26, fontWeight:700, color:"#1e293b", margin:"4px 0 0" },
  sub:   { fontSize:13, color:"#94a3b8", marginTop:4 },
  tabs:  { display:"flex", background:"#f1f5f9", borderRadius:10, padding:4, marginBottom:22 },
  tab:   { flex:1, padding:"8px 0", border:"none", background:"transparent", borderRadius:8, fontSize:14, cursor:"pointer", color:"#64748b", fontWeight:500 },
  tabOn: { background:"#fff", color:"#1e293b", boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
  form:  { display:"flex", flexDirection:"column", gap:12 },
  label: { fontSize:13, fontWeight:600, color:"#475569" },
  input: { padding:"10px 14px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:14, outline:"none", color:"#1e293b" },
  err:   { color:"#dc2626", fontSize:13, background:"#fef2f2", padding:"8px 12px", borderRadius:8, margin:0 },
  btn:   { padding:12, background:"#6366f1", color:"#fff", border:"none", borderRadius:8, fontSize:15, fontWeight:600, cursor:"pointer", marginTop:4 },
  switch:{ textAlign:"center", fontSize:13, color:"#64748b", marginTop:16 },
  link:  { color:"#6366f1", cursor:"pointer", fontWeight:600 },
};