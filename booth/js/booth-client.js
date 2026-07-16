// booth-client.js — Shared webcam, capture, and render-polling logic for all booth pages.
// Depends on theme-loader.js having already set up window.__crewcam.

(function () {
  "use strict";

  const CC = window.__crewcam || {};

  // ── Webcam ──────────────────────────────────────────────

  let _stream = null;

  /**
   * Start the webcam and insert a <video> into `containerEl`.
   * Returns the <video> element. Caller can style/position it.
   */
  async function startCamera(containerEl, opts = {}) {
    if (_stream) return containerEl.querySelector("video");

    const width = opts.width || 1280;
    const height = opts.height || 1280;

    try {
      _stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width, height },
        audio: false,
      });

      const v = document.createElement("video");
      v.autoplay = true;
      v.playsInline = true;
      v.muted = true;
      v.srcObject = _stream;

      // iPhone Continuity Camera comes through upside-down
      const label = (_stream.getVideoTracks()[0]?.label || "").toLowerCase();
      if (label.includes("iphone") || label.includes("continuity")) {
        v.classList.add("cam-inverted");
      }

      containerEl.appendChild(v);
      return v;
    } catch (e) {
      console.error("[booth-client] Camera error:", e);
      return null;
    }
  }

  /** Stop the camera stream and remove the <video>. */
  function stopCamera(containerEl) {
    if (_stream) {
      _stream.getTracks().forEach((t) => t.stop());
      _stream = null;
    }
    const v = containerEl?.querySelector("video");
    if (v) v.remove();
  }

  // ── Snapshot ─────────────────────────────────────────────

  /**
   * Capture a square JPEG from the live video.
   * Mirrors horizontally by default (front camera). Returns a data URL.
   */
  function snapPhoto(videoEl, opts = {}) {
    if (!videoEl) return null;
    const zoom = opts.zoom || 1;
    const s = Math.min(videoEl.videoWidth, videoEl.videoHeight);
    const crop = s / zoom;
    const c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    const ctx = c.getContext("2d");

    const inverted = videoEl.classList.contains("cam-inverted");
    ctx.save();
    ctx.translate(s / 2, s / 2);
    if (inverted) {
      ctx.scale(1, -1);
    } else {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      videoEl,
      (videoEl.videoWidth - crop) / 2,
      (videoEl.videoHeight - crop) / 2,
      crop,
      crop,
      -s / 2,
      -s / 2,
      s,
      s
    );
    ctx.restore();

    return c.toDataURL("image/jpeg", 0.9);
  }

  // ── API helpers ─────────────────────────────────────────

  /**
   * Submit a photo to the render pipeline.
   * Returns { photo: { id, status, theme } } on success.
   */
  async function submitCapture(photoDataUrl, themeId, kioskNumber) {
    const url = CC.apiUrl("/capture");
    const res = await fetch(url, {
      method: "POST",
      headers: CC.headers(),
      body: JSON.stringify({
        photo: photoDataUrl,
        theme_id: themeId || undefined,
        kiosk_number: kioskNumber || 1,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Capture failed (${res.status})`);
    }
    return res.json();
  }

  /**
   * Poll a photo's render status until it completes or fails.
   * Calls `onUpdate(photo)` on each poll tick.
   * Returns the final photo object.
   */
  async function pollStatus(photoId, onUpdate, intervalMs = 1500) {
    const url = CC.apiUrl(`/photos/${photoId}/status`);
    const headers = CC.headers();
    delete headers["Content-Type"]; // GET request

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) throw new Error(`Status poll failed (${res.status})`);
          const data = await res.json();
          const photo = data.photo;

          if (onUpdate) onUpdate(photo);

          if (photo.status === "done") {
            resolve(photo);
          } else if (photo.status === "failed") {
            reject(new Error(photo.error || "Render failed"));
          } else {
            setTimeout(poll, intervalMs);
          }
        } catch (err) {
          reject(err);
        }
      };
      poll();
    });
  }

  /**
   * Fetch recent photos for the operator view.
   */
  async function fetchPhotos(limit = 50, offset = 0) {
    const url = CC.apiUrl(`/photos?limit=${limit}&offset=${offset}`);
    const headers = CC.headers();
    delete headers["Content-Type"];

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Photo list failed (${res.status})`);
    return res.json();
  }

  // ── Countdown helper ────────────────────────────────────

  /**
   * Run a visual countdown. Calls `onTick(remaining)` each second
   * and resolves when it reaches 0. Returns an abort function.
   */
  function countdown(seconds, onTick) {
    let remaining = seconds;
    let timer = null;
    let _resolve;

    const promise = new Promise((resolve) => {
      _resolve = resolve;
      const tick = () => {
        if (onTick) onTick(remaining);
        if (remaining <= 0) {
          resolve();
          return;
        }
        remaining--;
        timer = setTimeout(tick, 1000);
      };
      tick();
    });

    promise.abort = () => {
      if (timer) clearTimeout(timer);
      _resolve();
    };

    return promise;
  }

  // ── Screen navigation ───────────────────────────────────

  /** Show a screen element by id, hide all siblings with class `screen`. */
  function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("on"));
    const target = document.getElementById(screenId);
    if (target) target.classList.add("on");
  }

  // ── Toast ───────────────────────────────────────────────

  function toast(msg, durationMs = 3000) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("on");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("on"), durationMs);
  }

  // ── Utilities ───────────────────────────────────────────

  /** HTML-escape a string for safe insertion. */
  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  /** Format a date string as a short relative time. */
  function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  // ── Export ──────────────────────────────────────────────

  CC.cam = { start: startCamera, stop: stopCamera, snap: snapPhoto };
  CC.api = { submitCapture, pollStatus, fetchPhotos };
  CC.ui = { showScreen, toast, countdown, esc, timeAgo };
})();
