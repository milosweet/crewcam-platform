import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

export default function EventCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", date: "", location: "", max_kiosks: 1 });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = await api.createEvent({
        name: form.name,
        date: form.date || undefined,
        location: form.location || undefined,
        max_kiosks: parseInt(form.max_kiosks) || 1,
      });
      navigate(`/admin/events/${data.event.slug}`);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">New <em>Event</em></h1>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <div className="card">
          {error && <div style={{ background: "rgba(231,76,60,.15)", border: "1px solid var(--red)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "var(--red)" }}>{error}</div>}

          <div className="form-group">
            <label className="form-label">Event Name *</label>
            <input className="form-input" value={form.name} onChange={set("name")} required placeholder="Summer Conference 2026" />
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={set("date")} />
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" value={form.location} onChange={set("location")} placeholder="Tampa Convention Center" />
          </div>

          <div className="form-group">
            <label className="form-label">Max Kiosks</label>
            <input className="form-input" type="number" min="1" max="20" value={form.max_kiosks} onChange={set("max_kiosks")} />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Creating…" : "Create Event"}</button>
            <button className="btn ghost" type="button" onClick={() => navigate("/admin")}>Cancel</button>
          </div>
        </div>
      </form>
    </div>
  );
}
