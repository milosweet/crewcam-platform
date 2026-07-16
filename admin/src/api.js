// api.js — Thin fetch wrapper for the CrewCam API

const BASE = "/api";

function getToken() {
  return localStorage.getItem("crewcam_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("crewcam_token", token);
  else localStorage.removeItem("crewcam_token");
}

export function isLoggedIn() {
  return !!getToken();
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    window.location.href = "/admin/login";
    throw new Error("Unauthorized");
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // Auth
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/auth/me"),

  // Events
  listEvents: (status) =>
    request(`/events${status ? `?status=${status}` : ""}`),
  getEvent: (slug) => request(`/events/${slug}`),
  createEvent: (data) =>
    request("/events", { method: "POST", body: JSON.stringify(data) }),
  updateEvent: (slug, data) =>
    request(`/events/${slug}`, { method: "PUT", body: JSON.stringify(data) }),
  updateEventStatus: (slug, status) =>
    request(`/events/${slug}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  deleteEvent: (slug) =>
    request(`/events/${slug}`, { method: "DELETE" }),

  // Themes
  listThemes: (slug) => request(`/events/${slug}/themes`),
  createTheme: (slug, data) =>
    request(`/events/${slug}/themes`, { method: "POST", body: JSON.stringify(data) }),
  updateTheme: (slug, id, data) =>
    request(`/events/${slug}/themes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTheme: (slug, id) =>
    request(`/events/${slug}/themes/${id}`, { method: "DELETE" }),

  // Branding
  getBranding: (slug) => request(`/events/${slug}/branding`),
  updateBranding: (slug, data) =>
    request(`/events/${slug}/branding`, { method: "PUT", body: JSON.stringify(data) }),

  // Analytics
  eventAnalytics: (slug) => request(`/events/${slug}/analytics`),
  overview: () => request("/analytics/overview"),

  // Gallery (admin view of photos)
  listPhotos: (slug, limit = 50, offset = 0) =>
    request(`/gallery/${slug}/photos?limit=${limit}&offset=${offset}`),
};

export default api;
