import React from "react";
import ReactDOM from "react-dom/client";
// Self-hosted fonts (Google's CDN is blocked in this environment) — served from
// our own origin so they always load. Neue Haas Unica (UI text) is @font-face'd
// in index.html from public/fonts/; Bricolage stays for the "rake" wordmark only.
import "@fontsource/sora/400.css";                 // loader line keeps the previous face
import "@fontsource-variable/bricolage-grotesque"; // family: 'Bricolage Grotesque Variable'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import BaseballTracker from "./BaseballTracker.jsx";
import Landing from "./Landing.jsx";

// rake.club        -> the pitch
// rake.club/<slug> -> a club's live board
// The slug is cosmetic for now (one club, still driven by ESPN_LEAGUE_ID), but
// it fixes the URL shape before anything else is built on top of it.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/if-can-can" element={<BaseballTracker />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
