import React, { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { api, setToken, isLoggedIn } from "./api.js";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EventCreate from "./pages/EventCreate.jsx";
import EventDetail from "./pages/EventDetail.jsx";
import ThemeEditor from "./pages/ThemeEditor.jsx";
import GalleryAdmin from "./pages/GalleryAdmin.jsx";
import Analytics from "./pages/Analytics.jsx";
import "./styles.css";

// ── Auth Context ──
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn()) {
      api.me().then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

// ── Layout ──
function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <div className="nav-brand" onClick={() => navigate("/admin")}>
          <span className="nav-logo">CrewCam</span>
          <span className="nav-badge">Admin</span>
        </div>
        <div className="nav-links">
          <button onClick={() => navigate("/admin")} className="nav-link">Events</button>
          <button onClick={() => navigate("/admin/analytics")} className="nav-link">Analytics</button>
        </div>
        {user && (
          <div className="nav-user">
            <span className="nav-user-name">{user.name || user.email}</span>
            <button onClick={() => { logout(); navigate("/admin/login"); }} className="nav-link">Logout</button>
          </div>
        )}
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/admin/events/new" element={<ProtectedRoute><Layout><EventCreate /></Layout></ProtectedRoute>} />
          <Route path="/admin/events/:slug" element={<ProtectedRoute><Layout><EventDetail /></Layout></ProtectedRoute>} />
          <Route path="/admin/events/:slug/themes/:themeId" element={<ProtectedRoute><Layout><ThemeEditor /></Layout></ProtectedRoute>} />
          <Route path="/admin/events/:slug/photos" element={<ProtectedRoute><Layout><GalleryAdmin /></Layout></ProtectedRoute>} />
          <Route path="/admin/events/:slug/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
