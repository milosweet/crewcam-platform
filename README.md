# CrewCam Platform

Multi-tenant AI photobooth platform. Create and deploy branded photobooths for any event from a single deployment. Guests take a headshot, choose a creative theme, and Gemini AI composites them into a photorealistic scene in seconds.

## Architecture

- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **File storage:** Cloudflare R2 (S3-compatible)
- **AI compositing:** Google Gemini API
- **Admin dashboard:** React (Vite)
- **Booth frontends:** Vanilla HTML, dynamically branded via CSS custom properties
- **Hosting:** Railway

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Cloudflare R2 bucket (or any S3-compatible store)
- Google Gemini API key

### 1. Install dependencies

```bash
npm install
cd admin && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your database URL, R2 credentials, Gemini API key, and JWT secret
```

### 3. Set up the database

```bash
npm run migrate     # create tables
npm run seed        # insert demo data
```

The seed script prints admin credentials and booth URLs.

### 4. Build the admin dashboard

```bash
cd admin && npm run build && cd ..
```

### 5. Start the server

```bash
npm run dev          # development (auto-restart on changes)
# or
npm start            # production
```

The server starts on `http://localhost:8787`.

### 6. Try it out

- **Admin:** http://localhost:8787/admin — log in with `admin@crewcam.demo` / `admin123`
- **Booth URLs** are printed by the seed script and visible in the admin event detail under the "Links" tab
- **Gallery** is public at `/gallery/{event-slug}`

## Project Structure

```
crewcam-platform/
├── server/
│   ├── index.js              # Express entry point
│   ├── config/               # database, storage (R2), gemini
│   ├── db/                   # migrations, seed
│   ├── middleware/            # auth, booth key, event context, error handling, rate limiting
│   ├── routes/               # auth, events, themes, branding, photos, booth, gallery, analytics
│   └── services/             # render pipeline, storage, thumbnails, QR codes
├── booth/
│   ├── css/booth-base.css    # shared booth styles with CSS custom properties
│   ├── js/                   # theme-loader.js, booth-client.js
│   └── templates/            # attractor.html, kiosk.html, operator.html
├── gallery/
│   ├── event.html            # public event gallery with infinite scroll
│   └── photo.html            # single photo share page
├── admin/                    # React (Vite) admin dashboard
│   └── src/
│       ├── pages/            # Login, Dashboard, EventCreate, EventDetail, ThemeEditor, GalleryAdmin, Analytics
│       └── components/       # EventCard, ThemeCard, BrandingForm, PhotoGrid
├── shared/                   # enums.js, constants.js
├── railway.toml              # Railway deployment config
└── .env.example
```

## Key Concepts

**Multi-tenancy:** Every event gets a unique slug. All booth URLs, API calls, and storage paths are scoped by slug. One deployment serves unlimited events.

**Dynamic branding:** Each event has its own colors, fonts, logo, and tagline. The booth HTML templates use CSS custom properties (`--brand-primary`, etc.) that are injected at runtime — same HTML, different look for every event.

**AI compositing pipeline:** A guest's headshot is sent to Gemini alongside a theme's creative prompt, wrapped with face-preservation instructions. Gemini returns a photorealistic composite. The pipeline is async — the booth gets a 202 response immediately and polls for completion.

**Auth model:** Admin dashboard uses JWT. Booth pages authenticate with a per-event `booth_key`. The public gallery requires no auth.

## Deploy to Railway

1. Push the repo to GitHub
2. Create a new Railway project and link the repo
3. Add a PostgreSQL addon
4. Set environment variables (see `.env.example`)
5. Railway auto-detects `railway.toml` and handles build + deploy

The build command installs dependencies, builds the admin dashboard, and the start command runs the migration then starts the server.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public URL for R2 bucket |
| `GEMINI_API_KEY` | Google Gemini API key |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `PUBLIC_URL` | Base URL of the deployment |
| `PORT` | Server port (default: 8787) |
| `ALLOWED_ORIGIN` | CORS origin (default: *) |
