// server/config/gemini.js — Gemini API for AI photo compositing
// Ported from crewcam-backend lib/gemini.js

const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** Parse "data:image/jpeg;base64,XXXX" into { mimeType, base64 }. */
function parseDataUrl(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!m) throw new Error("photo must be a base64 data URL, e.g. data:image/jpeg;base64,...");
  return { mimeType: m[1], base64: m[2] };
}

/** Wrap the creative prompt with identity-preservation instructions. */
function identityAnchoredPrompt(scene) {
  return [
    "Photorealistic photograph. Output exactly ONE single image — never a collage, grid, composite, split-frame, or multiple images in one.",
    "Keep the exact face, hair, skin tone, age and identity of the person in the provided reference image.",
    "Do not beautify, age, slim or otherwise alter their facial features.",
    "Place that same person, full likeness preserved, into this scene:",
    scene.trim(),
    "Natural lighting, realistic depth of field, candid premium event-photo quality.",
    "No text, captions, logos or watermarks rendered in the image.",
  ].join(" ");
}

/**
 * Render a single scene via Gemini.
 * @param {object} o
 * @param {string} o.photoDataUrl   Guest headshot as a base64 data URL.
 * @param {string} o.prompt         The scene description.
 * @param {string} [o.aspectRatio]  "3:4" portrait by default.
 * @param {string} [o.model]        Defaults to gemini-2.5-flash-image.
 * @returns {Promise<{dataUrl: string, mimeType: string}>}
 */
export async function renderScene({
  photoDataUrl,
  prompt,
  aspectRatio = "3:4",
  model = "gemini-2.5-flash-image",
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY environment variable");

  const { mimeType, base64 } = parseDataUrl(photoDataUrl);

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: identityAnchoredPrompt(prompt) },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio },
    },
  };

  const res = await fetch(ENDPOINT(model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 400)}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find((p) => p.inlineData || p.inline_data);

  if (!imgPart) {
    const txt = parts.map((p) => p.text || "").join(" ").trim();
    throw new Error(
      `No image returned. ${txt ? "Model said: " + txt.slice(0, 300) : "Likely a safety block."}`
    );
  }

  const inline = imgPart.inlineData || imgPart.inline_data;
  const outMime = inline.mimeType || inline.mime_type || "image/png";
  return { dataUrl: `data:${outMime};base64,${inline.data}`, mimeType: outMime };
}
