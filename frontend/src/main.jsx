// =============================================================================
// src/main.jsx — React entry point
//
// This is the first JS file the browser runs.
// It mounts the React app into the <div id="root"> in index.html.
// ReactDOM.createRoot is the React 18 API for concurrent rendering.
// =============================================================================

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Global CSS reset — keeps browsers consistent
const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
  #root { height: 100%; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);