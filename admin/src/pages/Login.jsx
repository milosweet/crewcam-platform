import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      setError(err.message || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-darker)" }}>
      <form onSubmit={handleSubmit} style={{ width: 380 }}>
        <div className="card" style={{ padding: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontFamily: "Archivo, sans-serif", fontWeight: 900, fontSize: 24, textTransform: "uppercase" }}>CrewCam</div>
            <div style={{ fontFamily: "Space Mono, monospace", fontSize: 11, letterSpacing: ".14em", color: "var(--brand-primary)", textTransform: "uppercase", marginTop: 4 }}>Admin Dashboard</div>
          </div>

          {error && <div style={{ background: "rgba(231,76,60,.15)", border: "1px solid var(--red)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "var(--red)" }}>{error}</div>}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>
      </form>
    </div>
  );
}
