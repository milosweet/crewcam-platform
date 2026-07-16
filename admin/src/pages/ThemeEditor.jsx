import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api.js";

export default function ThemeEditor() {
  const { slug, themeId } = useParams();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadTheme(); }, [slug, themeId]);

  const loadTheme = async () => {
    try {
      const data = await api.listThemes(slug);
      const t = (data.themes || []).find((t) => String(t.id) === String(themeId));
      if (!t) { setError("Theme not found"); return; }
      setTheme(t);
      setForm({
        name: t.name || "",
        mode: t.mode || "custom",
        gemini_prompt: t.gemini_prompt || "",
        background_url: t.background_url || "",
        overlay_url: t.overlay_url || "",
        sort_order: t.sort_order || 0,
        is_default: t.is_default || false,
      });
    } catch (err) { setError(err.message); }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.updateTheme(slug, themeId, form);
      await loadTheme();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  const deleteTheme = async () => {
    if (!confirm("Delete this theme?")) return;
    try {
      await api.deleteTheme(slug, themeId);
      navigate(`/admin/events/${slug}`);
    } catch (err) { setError(err.message); }
  };

  if (!theme) return <div className="loading" style={{ height: 300 }}>Loading…</div>;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn ghost small" onClick={() => navigate(`/admin/events/${slug}`)} style={{ marginBottom: 8 }}>← Back to Event</button>
          <h1 className="page-title">Theme: <em>{theme.name}</em></h1>
        </div>
      </div>

      {error && <div style={{ background: "rgba(231,76,60,.15)", border: "1px solid var(--red)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "var(--red)" }}>{error}</div>}

      <form onSubmit={save} style={{ maxWidth: 720 }}>
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-title">Theme Settings</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={set("name")} required />
            </div>
            <div className="form-group">
              <label className="form-label">Mode</label>
              <select className="form-input" value={form.mode} onChange={set("mode")}>
                <option value="fun">Fun</option>
                <option value="corporate">Corporate</option>
                <option value="headshot">Headshot</option>
                <option value="group">Group</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Sort Order</label>
              <input className="form-input" type="number" value={form.sort_order} onChange={set("sort_order")} />
            </div>
            <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 24 }}>
              <input type="checkbox" checked={form.is_default} onChange={set("is_default")} id="isDefault" style={{ width: 18, height: 18, accentColor: "var(--brand-primary)" }} />
              <label htmlFor="isDefault" style={{ fontSize: 14 }}>Default theme</label>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-title">Gemini Prompt</div>
          <p style={{ fontSize: 12, color: "var(--mute)", marginBottom: 10 }}>
            This prompt is sent to Gemini along with the guest's headshot. It should describe the scene you want the guest composited into.
            The system automatically wraps this with face-preservation instructions.
          </p>
          <div className="form-group">
            <textarea className="form-input" value={form.gemini_prompt} onChange={set("gemini_prompt")} rows={6}
              placeholder="Place this person on the deck of a racing yacht during the America's Cup, dramatic ocean spray, golden hour lighting…" />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-title">Assets (Optional)</div>
          <div className="form-group">
            <label className="form-label">Background Image URL</label>
            <input className="form-input" value={form.background_url} onChange={set("background_url")} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="form-label">Overlay Image URL</label>
            <input className="form-input" value={form.overlay_url} onChange={set("overlay_url")} placeholder="https://..." />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Save Theme"}</button>
          <button className="btn danger small" type="button" onClick={deleteTheme}>Delete Theme</button>
        </div>
      </form>
    </div>
  );
}
