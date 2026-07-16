import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api.js";
import PhotoGrid from "../components/PhotoGrid.jsx";

export default function GalleryAdmin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const LIMIT = 48;

  useEffect(() => { loadPhotos(); }, [slug, offset]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const data = await api.listPhotos(slug, LIMIT, offset);
      setPhotos((prev) => offset === 0 ? data.photos : [...prev, ...data.photos]);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn ghost small" onClick={() => navigate(`/admin/events/${slug}`)} style={{ marginBottom: 8 }}>← Back to Event</button>
          <h1 className="page-title">Photo <em>Gallery</em></h1>
        </div>
        <span style={{ fontFamily: "Space Mono, monospace", fontSize: 12, letterSpacing: ".16em", color: "var(--mute)", textTransform: "uppercase" }}>
          {total} photos
        </span>
      </div>

      {photos.length === 0 && !loading ? (
        <div className="empty">
          <h3>No photos yet</h3>
          <p>Photos will appear here once guests start using the booth.</p>
        </div>
      ) : (
        <>
          <PhotoGrid photos={photos} />
          {offset + LIMIT < total && (
            <div style={{ textAlign: "center", padding: 24 }}>
              <button className="btn ghost small" onClick={() => setOffset(offset + LIMIT)} disabled={loading}>
                {loading ? "Loading…" : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
