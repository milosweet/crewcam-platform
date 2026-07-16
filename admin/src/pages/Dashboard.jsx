import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";
import EventCard from "../components/EventCard.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [overview, setOverview] = useState(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listEvents(filter || undefined),
      api.overview().catch(() => null),
    ]).then(([evData, ov]) => {
      setEvents(evData.events || []);
      setOverview(ov);
      setLoading(false);
    });
  }, [filter]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Your <em>Events</em></h1>
        <button className="btn" onClick={() => navigate("/admin/events/new")}>+ New Event</button>
      </div>

      {overview && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{overview.events?.total || 0}</div>
            <div className="stat-label">Total Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overview.events?.live || 0}</div>
            <div className="stat-label">Live Now</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overview.photos?.total || 0}</div>
            <div className="stat-label">Total Photos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overview.downloads || 0}</div>
            <div className="stat-label">Downloads</div>
          </div>
        </div>
      )}

      <div className="tabs">
        {["", "draft", "live", "archived"].map((f) => (
          <button key={f} className={`tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading" style={{ height: 200 }}>Loading…</div>
      ) : events.length === 0 ? (
        <div className="empty">
          <h3>No events yet</h3>
          <p>Create your first event to get started.</p>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => navigate("/admin/events/new")}>+ New Event</button>
        </div>
      ) : (
        <div className="event-grid">
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} onClick={() => navigate(`/admin/events/${ev.slug}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
