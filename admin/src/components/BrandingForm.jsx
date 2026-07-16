import React, { useState, useEffect } from "react";
import api from "../api.js";

export default function BrandingForm({ slug }) {
  const [branding, setBranding] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => { loadBranding(); }, [slug]);

  const loadBranding = async () => {
    try {
      const data = await api.getBranding(slug);
      const b = data.branding || {};
      setBranding(b);
      setForm({
        primary_color: b.primary_color || "#e74c3c",
        secondary_color: b.secondary_color || "#2c3e50",
        accent_color: b.accent_color || "#f39c12",
        background_color: b.background_color || "#0a0a0a",
        text_color: b.text_color || "#ffffff",
        font_heading: b.font_heading || "Space Grotesk",
        font_body: b.font_body || "Inter",
        logo_url: b.logo_url || "",
        tagline: b.tagline || "",
        gallery_public: b.gallery_public !== false,
      });
    } catch (err) { setError(err.message); }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      await api.updateBranding(slug, form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  if (!branding) return <div className="loading" style={{ height: 200 }}>Loading…</div>;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <form onSubmit={save} style={{ maxWidth: 560 }}>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-title">Colors</div>
        {[
          ["primary_color", "Primary"],
          ["secondary_color", "Secondary"],
          ["accent_color", "Accent"],
          ["background_color", "Background"],
          ["text_color", "Text"],
        ].map(([key, label]) => (
          <div key={key} className="form-group" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="color" value={form[key] || "#000000"} onChange={set(key)} style={{ width: 40, height: 32, border: "none", cursor: "pointer" }} />
            <label className="form-label" style={{ margin: 0, flex: 1 }}>{label}</label>
            <input className="form-input" value={form[key] || ""} onChange={set(key)} style={{ width: 120 }} />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-title">Typography</div>
        <div className="form-group">
          <label className="form-label">Heading Font</label>
          <input className="form-input" value={form.font_heading || ""} onChange={set("font_heading")} />
        </div>
        <div className="form-group">
          <label className="form-label">Body Font</label>
          <input className="form-input" value={form.font_body || ""} onChange={set("font_body")} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-title">Other</div>
        <div className="form-group">
          <label className="form-label">Logo URL</label>
          <input className="form-input" value={form.logo_url || ""} onChange={set("logo_url")} placeholder="https://..." />
        </div>
        <div className="form-group">
          <label className="form-label">Tagline</label>
          <input className="form-input" value={form.tagline || ""} onChange={set("tagline")} placeholder="Your event tagline" />
        </div>
        <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={form.gallery_public} onChange={set("gallery_public")} id="galleryPublic" style={{ width: 18, height: 18, accentColor: "var(--brand-primary)" }} />
          <label htmlFor="galleryPublic" style={{ fontSize: 14 }}>Public gallery</label>
        </div>
      </div>

      {error && <div style={{ background: "rgba(231,76,60,.15)", border: "1px solid var(--red)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--red)" }}>{error}</div>}
      {success && <div style={{ background: "rgba(46,204,113,.15)", border: "1px solid var(--green)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--green)" }}>Branding saved!</div>}

      <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Save Branding"}</button>
    </form>
  );
}
