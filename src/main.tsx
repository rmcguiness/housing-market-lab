import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Dashboard } from "./ui/pages/Dashboard.js";
import { Compare } from "./ui/pages/Compare.js";
import { Dynamics } from "./ui/pages/Dynamics.js";
import { Documentation } from "./ui/pages/Documentation.js";
import "katex/dist/katex.min.css";
import "./ui/theme.css";

function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">▦</span>
          <div>
            <h1>Housing Market Lab</h1>
            <p>Economic-policy simulator · agent-based · NYC-calibrated</p>
          </div>
        </div>
        <nav className="app-nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/compare">Plan vs. market</NavLink>
          <NavLink to="/dynamics">Over time</NavLink>
          <NavLink to="/docs">Methodology</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/dynamics" element={<Dynamics />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
