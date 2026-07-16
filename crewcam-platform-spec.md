# CrewCam Platform — Technical Specification

## How to Use This Spec with Claude Code

1. Create a new directory for the platform: `mkdir crewcam-platform && cd crewcam-platform`
2. Clone the existing codebase nearby for reference: `git clone https://github.com/milosweet/crewcam-backend.git ../crewcam-backend-ref`
3. Copy this spec into the new project: `cp crewcam-platform-spec.md .`
4. Open Claude Code and tell it:

> Read crewcam-platform-spec.md. Also read through ../crewcam-backend-ref to understand the existing codebase — especially the Gemini render pipeline, the booth HTML files, and the Express routes. Then start with Phase 1: initialize the project, install dependencies, and create the database migration with all tables from the spec.

5. Work through phases one at a time. After each phase, test before moving to the next.

## Overview

CrewCam is an AI-powered photobooth platform. It currently exists as a single-event app deployed on Railway using Node.js/Express, with Gemini API for AI photo compositing. This spec describes the new **multi-tenant platform** that can serve many events from a single deployment.

The existing codebase has: an Express backend, vanilla HTML frontends (attractor, kiosk, operator screens), a Gemini-based render pipeline for compositing guests into themed scenes, QR code sharing, and a photo gallery. Photos are currently stored on a Railway persistent volume.
## Existing Codebase

The current single-event CrewCam app lives at: `https://github.com/milosweet/crewcam-backend.git`

**Before starting, clone this repo and study these files:**
- The Gemini compositing pipeline (look for the render/compositing logic that calls the Gemini API — this is the core IP to port)
- The attractor, kiosk, and operator HTML files (these become the booth templates)
- The Express routes for photo capture, gallery, and QR sharing
- Any environment variable usage (`BOOTH_SHARED_KEY`, `PUBLIC_URL`, `GEMINI_API_KEY`, etc.)

The new platform is a fresh repo, but the render pipeline, booth HTML, and frontend JS should be ported directly — not rewritten from scratch.

## Architecture

**Single deployment, multi-tenant.** One app serves all events. Each event gets a unique slug (e.g., `pharma-tampa-2026`), and that slug routes requests to the correct config, theme, and storage.

**Tech stack:**
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Railway addon)
- **File storage:** Cloudflare R2 (S3-compatible) — photos organized by event
- **AI:** Gemini API for all photo compositing
- **Admin dashboard:** React (Vite) — served as static build from Express
- **Booth frontends:** Vanilla HTML templates (from current codebase), dynamically themed
- **Hosting:** Railway

---
## Database Schema (PostgreSQL)

### organizations

| Column     | Type        | Notes                    |
|------------|-------------|--------------------------|
| id         | uuid        | PK, default gen_random_uuid() |
| name       | varchar(255)| Organization name        |
| slug       | varchar(100)| Unique, URL-safe         |
| logo_url   | text        | Nullable                 |
| plan       | varchar(20) | 'starter', 'pro', 'enterprise' — for future use |
| created_at | timestamptz | Default now()            |
| updated_at | timestamptz | Default now()            |

### users

| Column        | Type        | Notes                          |
|---------------|-------------|--------------------------------|
| id            | uuid        | PK                             |
| org_id        | uuid        | FK → organizations.id          |
| email         | varchar(255)| Unique                         |
| name          | varchar(255)|                                |
| password_hash | text        | bcrypt                         |
| role          | varchar(20) | 'admin' or 'operator'          |
| created_at    | timestamptz | Default now()                  |
### events

| Column         | Type         | Notes                                    |
|----------------|--------------|------------------------------------------|
| id             | uuid         | PK                                       |
| org_id         | uuid         | FK → organizations.id                    |
| name           | varchar(255) |                                          |
| slug           | varchar(100) | Unique across all orgs                   |
| status         | varchar(20)  | 'draft', 'live', 'archived'              |
| starts_at      | timestamptz  |                                          |
| ends_at        | timestamptz  |                                          |
| booth_key      | varchar(64)  | Shared key for operator/kiosk auth       |
| max_kiosks     | int          | Default 2                                |
| gallery_public | boolean      | Default true                             |
| settings       | jsonb        | Extensible config (QR options, watermark, etc.) |
| created_at     | timestamptz  | Default now()                            |
| updated_at     | timestamptz  | Default now()                            |

### event_branding

| Column              | Type         | Notes                         |
|---------------------|--------------|-------------------------------|
| id                  | uuid         | PK                            |
| event_id            | uuid         | FK → events.id, unique (1:1)  |
| primary_color       | varchar(7)   | Hex, e.g. '#1a2b3c'           |
| secondary_color     | varchar(7)   |                               |
| logo_url            | text         | Event-specific logo           |
| attractor_heading   | varchar(255) | Idle screen heading           |
| attractor_subheading| varchar(255) |                               |
| gallery_footer_text | text         | Footer on gallery pages       |
### themes

| Column         | Type         | Notes                                         |
|----------------|--------------|-----------------------------------------------|
| id             | uuid         | PK                                            |
| event_id       | uuid         | FK → events.id                                |
| name           | varchar(255) | e.g. 'Sailing Adventure'                      |
| mode           | varchar(20)  | 'fun', 'corporate', 'headshot', 'group'       |
| gemini_prompt  | text         | The Gemini API prompt for this theme           |
| background_url | text         | Background image URL in R2                     |
| overlay_url    | text         | Optional overlay image URL                     |
| sort_order     | int          | Display order in kiosk                         |
| is_default     | boolean      | Default false, one per event should be true    |
| created_at     | timestamptz  | Default now()                                  |

### photos

| Column         | Type         | Notes                                    |
|----------------|--------------|------------------------------------------|
| id             | uuid         | PK                                       |
| event_id       | uuid         | FK → events.id                           |
| theme_id       | uuid         | FK → themes.id                           |
| original_url   | text         | Raw photo in R2                          |
| rendered_url   | text         | Composited result in R2                  |
| thumbnail_url  | text         | Thumbnail in R2                          |
| kiosk_number   | int          |                                          |
| share_code     | varchar(8)   | Unique, for individual photo sharing     |
| download_count | int          | Default 0                                |
| status         | varchar(20)  | 'processing', 'done', 'failed'           |
| error_message  | text         | Nullable, populated on failure           |
| created_at     | timestamptz  | Default now()                            |
### analytics_events

| Column     | Type         | Notes                                     |
|------------|--------------|-------------------------------------------|
| id         | bigserial    | PK                                        |
| event_id   | uuid         | FK → events.id                            |
| action     | varchar(50)  | 'photo_taken', 'qr_scanned', 'downloaded', 'gallery_viewed' |
| metadata   | jsonb        | Flexible payload (kiosk number, theme, etc.) |
| created_at | timestamptz  | Default now()                             |

**Indexes to create:**
- `events.slug` (unique)
- `events.org_id` + `status`
- `photos.event_id` + `created_at` (for gallery pagination)
- `photos.share_code` (unique)
- `analytics_events.event_id` + `created_at`
- `themes.event_id`

---

## Project Structure

```
crewcam-platform/
├── package.json
├── .env.example
├── docker-compose.yml              # local Postgres for dev
├── railway.toml
│
├── server/                          # Express API backend
│   ├── index.js                     # app entry, middleware stack│   ├── config/
│   │   ├── database.js              # pg Pool
│   │   ├── storage.js               # S3/R2 client (@aws-sdk/client-s3)
│   │   └── gemini.js                # Gemini API setup
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_initial.sql      # all tables above
│   │   │   └── ...
│   │   ├── seed.js                  # demo org + event + themes
│   │   └── migrate.js               # simple migration runner
│   ├── routes/
│   │   ├── auth.js                  # POST /api/auth/login, /logout, GET /me
│   │   ├── events.js                # CRUD /api/events
│   │   ├── themes.js                # CRUD /api/events/:slug/themes
│   │   ├── branding.js              # GET/PUT /api/events/:slug/branding
│   │   ├── photos.js                # capture + render pipeline
│   │   ├── booth.js                 # booth config + frontend serving
│   │   ├── gallery.js               # public gallery + share pages
│   │   └── analytics.js             # stats endpoints
│   ├── middleware/
│   │   ├── eventContext.js          # loads event from :slug param
│   │   ├── authGuard.js             # JWT verification
│   │   └── boothKeyAuth.js          # per-event booth key check
│   ├── services/
│   │   ├── renderPipeline.js        # Gemini compositing (port from current)
│   │   ├── storageService.js        # R2 upload/download/presign
│   │   ├── thumbnailService.js      # sharp-based thumbnail generation
│   │   └── qrService.js             # QR code generation
│   └── utils/
│       ├── slugify.js
│       └── shareCode.js             # random 8-char codes│
├── admin/                            # React admin dashboard (Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── src/
│   │   ├── App.jsx                   # router + auth context
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx         # event list + org stats
│   │   │   ├── EventCreate.jsx       # new event wizard
│   │   │   ├── EventDetail.jsx       # settings, themes, branding tabs
│   │   │   ├── ThemeEditor.jsx       # prompt editing, asset upload, preview
│   │   │   ├── GalleryAdmin.jsx      # photo grid + moderation
│   │   │   └── Analytics.jsx         # per-event charts
│   │   └── components/
│   │       ├── EventCard.jsx
│   │       ├── ThemeCard.jsx
│   │       ├── BrandingForm.jsx
│   │       └── PhotoGrid.jsx
│   └── public/
│
├── booth/                            # event-facing booth frontends
│   ├── templates/
│   │   ├── attractor.html            # idle screen, loads branding dynamically
│   │   ├── kiosk.html                # photo capture UI
│   │   └── operator.html             # operator dashboard
│   ├── css/
│   │   └── booth-base.css            # CSS custom properties for branding
│   ├── js/
│   │   ├── booth-client.js           # shared capture/render logic│   │   └── theme-loader.js           # fetch event config, apply branding
│   └── assets/                       # default fallback assets
│
├── gallery/                          # public gallery pages
│   ├── event.html                    # /gallery/:slug
│   └── photo.html                    # /photo/:shareCode
│
└── shared/
    ├── constants.js
    └── enums.js                      # status, mode, role enums
```

---

## API Routes

### Auth
- `POST /api/auth/login` — email + password → JWT
- `POST /api/auth/logout` — invalidate session
- `GET  /api/auth/me` — current user + org info

### Events (admin auth required)
- `GET    /api/events` — list org's events (filterable by status)
- `POST   /api/events` — create event (auto-generates slug + booth_key)
- `GET    /api/events/:slug` — event detail with config
- `PUT    /api/events/:slug` — update event
- `PUT    /api/events/:slug/status` — transition: draft → live → archived
- `DELETE /api/events/:slug` — delete (draft only)

### Themes (admin auth required)
- `GET    /api/events/:slug/themes` — list themes for event
- `POST   /api/events/:slug/themes` — add theme (name, mode, prompt, assets)- `PUT    /api/events/:slug/themes/:id` — update theme
- `DELETE /api/events/:slug/themes/:id` — remove theme

### Branding (admin auth required)
- `GET  /api/events/:slug/branding` — get branding config
- `PUT  /api/events/:slug/branding` — update colors, text
- `POST /api/events/:slug/branding/logo` — upload logo file

### Booth / Photos (booth key auth)
- `POST /api/booth/:slug/capture` — upload photo → starts render pipeline
- `GET  /api/booth/:slug/config` — full booth config (themes, branding, settings)
- `GET  /api/booth/:slug/photos` — recent photos for operator view
- `GET  /api/booth/:slug/photos/:id/status` — poll render progress

### Gallery (public)
- `GET /gallery/:slug` — public event gallery page (HTML)
- `GET /photo/:shareCode` — single photo share page (HTML)
- `GET /api/gallery/:slug/photos` — paginated photo list (JSON, for infinite scroll)
- `GET /api/photo/:shareCode/download` — download file + increment counter

### Analytics (admin auth required)
- `GET /api/events/:slug/analytics` — per-event stats
- `GET /api/analytics/overview` — org-wide dashboard stats

### Booth Frontends (booth key in query param)
- `GET /booth/:slug/attractor?key=BOOTH_KEY` — idle attract screen
- `GET /booth/:slug/kiosk?key=BOOTH_KEY` — photo capture screen
- `GET /booth/:slug/operator?key=BOOTH_KEY` — operator controls

---
## Key Implementation Notes

### Multi-tenancy via event slug
Every booth-facing and gallery-facing URL includes the event slug. The `eventContext` middleware loads the event row + branding + themes from the database and attaches it to `req.event`. All downstream handlers use this rather than hardcoded config.

### Photo pipeline (port from current CrewCam)
1. Kiosk captures photo via webcam, POSTs to `/api/booth/:slug/capture`
2. Server uploads original to R2 at `events/{eventId}/originals/{photoId}.jpg`
3. Server loads the selected theme's `gemini_prompt` and calls Gemini API
4. Gemini composites the guest into the themed scene
5. Result uploaded to R2 at `events/{eventId}/rendered/{photoId}.jpg`
6. Thumbnail generated with `sharp` and uploaded
7. Photo row status updated to 'done', share_code generated
8. QR code generated pointing to `/photo/{shareCode}`

### Branding injection
Booth HTML templates use CSS custom properties (`--brand-primary`, `--brand-secondary`, etc.). On load, `theme-loader.js` fetches `/api/booth/:slug/config` and sets these properties + replaces logo/heading/subheading elements. No build step needed — same HTML template serves every event with different branding.

### Storage layout in R2
```
crewcam-storage/
├── events/
│   ├── {eventId}/
│   │   ├── originals/{photoId}.jpg
│   │   ├── rendered/{photoId}.jpg
│   │   ├── thumbnails/{photoId}.jpg
│   │   └── assets/          # theme backgrounds, overlays, logos
│   └── ...
```
### Auth model
- **Admin dashboard:** JWT-based. Users belong to an org. Admins can manage events, operators can view.
- **Booth frontends:** Per-event `booth_key` passed as query parameter. Simple but effective for on-site use — operators get the URL with the key baked in.
- **Gallery:** Public by default (controlled by `gallery_public` flag on event).

### Environment variables
```
DATABASE_URL=postgresql://...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=crewcam-storage
GEMINI_API_KEY=...
JWT_SECRET=...
PUBLIC_URL=https://crewcam.app  (or Railway URL)
NODE_ENV=production
```

---

## Build Phases (recommended order)

### Phase 1: Foundation
- Initialize project, install deps (express, pg, @aws-sdk/client-s3, sharp, jsonwebtoken, bcrypt, qrcode)
- Write migration 001_initial.sql with all tables
- Set up database config, migration runner, seed script
- Set up R2 storage client
- Basic Express app with health check
### Phase 2: API Core
- Auth routes (login, me)
- Events CRUD with eventContext middleware
- Themes CRUD
- Branding CRUD

### Phase 3: Render Pipeline
- Port the existing Gemini compositing pipeline from current CrewCam
- Wire up /api/booth/:slug/capture → render → R2 storage
- Photo status polling
- Thumbnail generation
- QR code generation

### Phase 4: Booth Frontends
- Port attractor, kiosk, operator HTML from current CrewCam
- Add theme-loader.js for dynamic branding
- Wire up to new API endpoints

### Phase 5: Gallery
- Public gallery page with infinite scroll
- Single photo share page
- Download endpoint with counter

### Phase 6: Admin Dashboard
- React app with Vite
- Login, event list, event create/edit
- Theme editor with prompt testing
- Branding configuration- Photo gallery with moderation
- Analytics page

### Phase 7: Polish & Deploy
- Error handling and logging
- Rate limiting on capture endpoint
- Railway config (railway.toml, Postgres addon, env vars)
- Seed data for demo/testing
- README with setup instructions