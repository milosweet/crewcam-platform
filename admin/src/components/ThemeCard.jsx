import React from "react";

export default function ThemeCard({ theme, onClick }) {
  return (
    <div className="card" onClick={onClick} style={{ cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div className="card-title" style={{ margin: 0 }}>{theme.name}</div>
        {theme.is_default && <span className="badge live">default</span>}
      </div>
      <div style={{ fontSize: 12, color: "var(--mute)", marginBottom: 8 }}>
        Mode: {theme.mode} &middot; Order: {theme.sort_order || 0}
      </div>
      {theme.gemini_prompt && (
        <p style={{ fontSize: 12, color: "var(--mute)", lineHeight: 1.5, margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
          {theme.gemini_prompt}
        </p>
      )}
    </div>
  );
}
