-- 001_initial.sql — CrewCam Platform schema

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ══════════════════════════════════════════
-- Organizations
-- ══════════════════════════════════════════
CREATE TABLE organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(255) NOT NULL,
  slug        varchar(100) NOT NULL UNIQUE,
  logo_url    text,
  plan        varchar(20) NOT NULL DEFAULT 'starter',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════
-- Users (admin team members)
-- ══════════════════════════════════════════
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email         varchar(255) NOT NULL UNIQUE,
  name          varchar(255) NOT NULL,
  password_hash text NOT NULL,
  role          varchar(20) NOT NULL DEFAULT 'admin',
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT users_role_check CHECK (role IN ('admin', 'operator'))
);

CREATE INDEX idx_users_org ON users(org_id);

-- ══════════════════════════════════════════
-- Events
-- ══════════════════════════════════════════
CREATE TABLE events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name           varchar(255) NOT NULL,
  slug           varchar(100) NOT NULL UNIQUE,
  status         varchar(20) NOT NULL DEFAULT 'draft',
  starts_at      timestamptz,
  ends_at        timestamptz,
  booth_key      varchar(64) NOT NULL,
  max_kiosks     int NOT NULL DEFAULT 2,
  gallery_public boolean NOT NULL DEFAULT true,
  settings       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT events_status_check CHECK (status IN ('draft', 'live', 'archived'))
);

CREATE INDEX idx_events_org_status ON events(org_id, status);

-- ══════════════════════════════════════════
-- Event Branding (1:1 with events)
-- ══════════════════════════════════════════
CREATE TABLE event_branding (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id             uuid NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  primary_color        varchar(7) DEFAULT '#000000',
  secondary_color      varchar(7) DEFAULT '#ffffff',
  logo_url             text,
  attractor_heading    varchar(255) DEFAULT 'Welcome!',
  attractor_subheading varchar(255) DEFAULT 'Step up for a photo',
  gallery_footer_text  text
);

-- ══════════════════════════════════════════
-- Themes (many per event)
-- ══════════════════════════════════════════
CREATE TABLE themes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name           varchar(255) NOT NULL,
  mode           varchar(20) NOT NULL DEFAULT 'fun',
  gemini_prompt  text NOT NULL,
  background_url text,
  overlay_url    text,
  sort_order     int NOT NULL DEFAULT 0,
  is_default     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT themes_mode_check CHECK (mode IN ('fun', 'corporate', 'headshot', 'group'))
);

CREATE INDEX idx_themes_event ON themes(event_id);

-- ══════════════════════════════════════════
-- Photos
-- ══════════════════════════════════════════
CREATE TABLE photos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  theme_id       uuid NOT NULL REFERENCES themes(id) ON DELETE SET NULL,
  original_url   text,
  rendered_url   text,
  thumbnail_url  text,
  kiosk_number   int,
  share_code     varchar(8) NOT NULL UNIQUE,
  download_count int NOT NULL DEFAULT 0,
  status         varchar(20) NOT NULL DEFAULT 'processing',
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT photos_status_check CHECK (status IN ('processing', 'done', 'failed'))
);

CREATE INDEX idx_photos_event_created ON photos(event_id, created_at DESC);

-- ══════════════════════════════════════════
-- Analytics Events
-- ══════════════════════════════════════════
CREATE TABLE analytics_events (
  id         bigserial PRIMARY KEY,
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  action     varchar(50) NOT NULL,
  metadata   jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_event_created ON analytics_events(event_id, created_at DESC);
