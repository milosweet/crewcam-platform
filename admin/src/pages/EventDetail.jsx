import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api.js";
import ThemeCard from "../components/ThemeCard.jsx";
import BrandingForm from "../components/BrandingForm.jsx";

export default function EventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [themes, setThemes] = useState([]);
  const [tab, setTab] = useState("settings");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");

  useEffect(() => { loadEvent(); }, [slug]);

  const loadEvent = async () => {
    try {
      const data = await api.getEvent(slug);
      setEvent(data.event);
      setForm({ name: data.event.name, date: data.event.date?.split("T")[0] || "", location: data.event.location || "", max_kiosks: data.event.max_kiosks || 1 });
      const tData = await api.listThemes(slug);
      setThemes(tData.themes || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateEvent(slug, form);
      await loadEvent();
      setError("");
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  const changeStatus = async (newStatus) => {
    try {
      await api.updateEventStatus(slug, newStatus);
      await loadEvent();
    } catch (err) { setError(err.message); }
  };

  const deleteEvent = async () => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    try {
      await api.deleteEvent(slug);
      navigate("/admin");
    } catch (err) { setError(err.message); }
  };

  const createTheme = async () => {
    try {
      const data = await api.createTheme(slug, { name: "New Theme", mode: "fun", gemini_prompt: "Place this person in a creative scene." });
      navigate(`/admin/events/${slug}/themes/${data.theme.id}`);
    } catch (err) { setError(err.message); }
  };

  if (!event) return <div className="loading" style={{ height: 300 }}>Loading…</div>;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const boothUrl = `${window.location.origin}/booth/${event.slug}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{event.name}</h1>
          <span className={`badge ${event.status}`}>{event.status}</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {event.status === "draft" && <button className="btn small" onClick={() => changeStatus("live")}>Go Live</button>}
          {event.status === "live" && <button className="btn ghost small" onClick={() => changeStatus("archived")}>Archive</button>}
          {event.status === "archived" && <button className="btn ghost small" onClick={() => changeStatus("draft")}>Reactivate</button>}
          <button className="btn ghost small" onClick={() => navigate(`/admin/events/${slug}/photos`)}>Photos</button>
          <button className="btn ghost small" onClick={() => navigate(`/admin/events/${slug}/analytics`)}>Analytics</button>
        </div>
      </div>

      {error && <div style={{ background: "rgba(231,76,60,.15)", border: "1px solid var(--red)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "var(--red)" }}>{error}</div>}

      <div className="tabs">
        {["settings", "themes", "branding", "links"].map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "settings" && (
        <form onSubmit={saveSettings} style={{ maxWidth: 560 }}>
          <div className="card">
            <div className="card-title">Event Settings</div>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name || ""} onChange={set("name")} required />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date || ""} onChange={set("date")} />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location || ""} onChange={set("location")} />
            </div>
            <div className="form-group">
              <label className="form-label">Max Kiosks</label>
              <input className="form-input" type="number" min="1" max="20" value={form.max_kiosks || 1} onChange={set("max_kiosks")} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              {event.status === "draft" && <button className="btn danger small" type="button" onClick={deleteEvent}>Delete Event</button>}
            </div>
          </div>
        </form>
      )}

      {tab === "themes" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0 }}>Themes ({themes.length})</div>
            <button className="btn small" onClick={createTheme}>+ Add Theme</button>
          </div>
          {themes.length === 0 ? (
            <div className="empty"><h3>No themes</h3><p>Add a theme with a Gemini prompt to get started.</p></div>
          ) : (
            <div className="event-grid">
              {themes.map((t) => (
                <ThemeCard key={t.id} theme={t} onClick={() => navigate(`/admin/events/${slug}/themes/${t.id}`)} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "branding" && <BrandingForm slug={slug} />}

      {tab === "links" && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-title">Booth Links</div>
          <p style={{ fontSize: 13, color: "var(--mute)", marginBottom: 14 }}>
            Share these URLs with your booth operator. The booth key is included automatically.
          </p>
          {["attractor", "kiosk", "operator"].map((page) => (
            <div key={page} className="form-group">
              <label className="form-label">{page}</label>
              <input className="form-input" readOnly value={`${boothUrl}/${page}?key=${event.booth_key || ""}`} onClick={(e) => { e.target.select(); navigator.clipboard?.writeText(e.target.value); }} />
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Public Gallery</label>
            <input className="form-input" readOnly value={`${window.location.origin}/gallery/${event.slug}`} onClick={(e) => { e.target.select(); navigator.clipboard?.writeText(e.target.value); }} />
          </div>
        </div>
      )}
    </div>
  );
}
