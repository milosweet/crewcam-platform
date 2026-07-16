import React from "react";

export default function EventCard({ event, onClick }) {
  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "No date";

  return (
    <div className="card" onClick={onClick} style={{ cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div className="card-title" style={{ margin: 0 }}>{event.name}</div>
        <span className={`badge ${event.status}`}>{event.status}</span>
      </div>
      <div style={{ fontSize: 13, color: "var(--mute)", display: "flex", flexDirection: "column", gap: 4 }}>
        <span>{dateStr}</span>
        {event.location && <span>{event.location}</span>}
      </div>
    </div>
  );
}
