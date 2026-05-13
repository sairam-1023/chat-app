import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing:border-box; }
  body, html { margin:0; padding:0; height:100%; overflow:hidden; background:#080808; }
  #root { height:100%; }

  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:#1a1a1a; border-radius:4px; }
  ::-webkit-scrollbar-thumb:hover { background:#222; }

  input:focus, textarea:focus {
    border-color:#6366f1 !important;
    box-shadow:0 0 0 3px rgba(99,102,241,0.12) !important;
  }

  @keyframes bounce {
    0%,60%,100% { transform:translateY(0); background:#333; }
    30% { transform:translateY(-5px); background:#6366f1; }
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0); }
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);