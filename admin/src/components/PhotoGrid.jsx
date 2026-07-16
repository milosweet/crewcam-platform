import React from "react";

export default function PhotoGrid({ photos }) {
  if (!photos?.length) return null;

  return (
    <div className="photo-grid">
      {photos.map((photo) => {
        const src = photo.thumbnail_url || photo.rendered_url || photo.original_url;
        return (
          <div key={photo.id} className="photo-card">
            {src ? (
              <img src={src} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 8 }} />
            ) : (
              <div style={{ width: "100%", aspectRatio: "3/4", background: "var(--line)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--mute)" }}>
                No image
              </div>
            )}
            <div style={{ padding: "8px 0 0", fontSize: 11, color: "var(--mute)", display: "flex", justifyContent: "space-between" }}>
              <span>{photo.theme_name || "—"}</span>
              <span className={`badge ${photo.status}`}>{photo.status}</span>
            </div>
            {photo.share_code && (
              <div style={{ fontSize: 10, fontFamily: "Space Mono, monospace", color: "var(--mute)", marginTop: 2 }}>
                {photo.share_code}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
