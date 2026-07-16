import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api.js";

export default function Analytics() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = slug ? api.eventAnalytics(slug) : api.overview();
    load.then(setData).catch(console.error).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="loading" style={{ height: 300 }}>Loading…</div>;
  if (!data) return <div className="empty"><h3>No data available</h3></div>;

  // Per-event analytics
  if (slug) {
    return (
      <div>
        <div className="page-header">
          <div>
            <button className="btn ghost small" onClick={() => navigate(`/admin/events/${slug}`)} style={{ marginBottom: 8 }}>← Back to Event</button>
            <h1 className="page-title">{data.event?.name} <em>Analytics</em></h1>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{data.photos?.total || 0}</div>
            <div className="stat-label">Total Photos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data.photos?.done || 0}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data.photos?.failed || 0}</div>
            <div className="stat-label">Failed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data.downloads || 0}</div>
            <div className="stat-label">Downloads</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data.galleryViews || 0}</div>
            <div className="stat-label">Gallery Views</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data.qrScans || 0}</div>
            <div className="stat-label">QR Scans</div>
          </div>
        </div>

        {data.topThemes?.length > 0 && (
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-title">Top Themes</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={{ padding: "8px 0", fontSize: 12, color: "var(--mute)", fontWeight: 600 }}>Theme</th>
                  <th style={{ padding: "8px 0", fontSize: 12, color: "var(--mute)", fontWeight: 600, textAlign: "right" }}>Photos</th>
                </tr>
              </thead>
              <tbody>
                {data.topThemes.map((t, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px 0", fontSize: 14 }}>{t.name}</td>
                    <td style={{ padding: "10px 0", fontSize: 14, textAlign: "right", fontWeight: 700 }}>{t.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.hourly?.length > 0 && (
          <div className="card">
            <div className="card-title">Photos Per Hour (Last 24h)</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, padding: "10px 0" }}>
              {data.hourly.map((h, i) => {
                const max = Math.max(...data.hourly.map((r) => r.count));
                const pct = max ? (h.count / max) * 100 : 0;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--mute)" }}>{h.count}</span>
                    <div style={{ width: "100%", height: `${pct}%`, minHeight: 2, background: "var(--brand-primary)", borderRadius: 4 }} />
                    <span style={{ fontSize: 9, color: "var(--mute)" }}>{new Date(h.hour).getHours()}h</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Org-wide overview
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics <em>Overview</em></h1>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{data.events?.total || 0}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.photos?.total || 0}</div>
          <div className="stat-label">Total Photos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.downloads || 0}</div>
          <div className="stat-label">Downloads</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.recentActivity?.photo_taken || 0}</div>
          <div className="stat-label">Photos (7d)</div>
        </div>
      </div>

      {data.topEvents?.length > 0 && (
        <div className="card">
          <div className="card-title">Top Events by Photos</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: "8px 0", fontSize: 12, color: "var(--mute)", fontWeight: 600 }}>Event</th>
                <th style={{ padding: "8px 0", fontSize: 12, color: "var(--mute)", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "8px 0", fontSize: 12, color: "var(--mute)", fontWeight: 600, textAlign: "right" }}>Photos</th>
              </tr>
            </thead>
            <tbody>
              {data.topEvents.map((ev, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--line)", cursor: "pointer" }} onClick={() => navigate(`/admin/events/${ev.slug}/analytics`)}>
                  <td style={{ padding: "10px 0", fontSize: 14 }}>{ev.name}</td>
                  <td style={{ padding: "10px 0" }}><span className={`badge ${ev.status}`}>{ev.status}</span></td>
                  <td style={{ padding: "10px 0", fontSize: 14, textAlign: "right", fontWeight: 700 }}>{ev.photo_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
