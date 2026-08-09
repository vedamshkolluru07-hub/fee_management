-- ======================================================
-- 001_cms_schema.sql
-- Website Management (CMS) schema — Home page builder,
-- About page, Enquiries, Connect links, Site theme.
-- PostgreSQL.
-- ======================================================

-- ------------------------------------------------------
-- HOME PAGE BLOCKS
-- Free-form canvas blocks (text or image). Each block has
-- a "status" of draft or published. Admin edits only ever
-- touch draft rows; Publish copies draft -> published.
-- Position/size stored as PERCENT (0-100) of the canvas so
-- the layout can be scaled responsively on the frontend.
-- ------------------------------------------------------
CREATE TABLE IF NOT EXISTS home_blocks (
  id SERIAL PRIMARY KEY,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',        -- 'draft' | 'published'
  block_type VARCHAR(16) NOT NULL,                    -- 'text' | 'image'
  text_content TEXT,                                  -- used when block_type = 'text'
  images JSONB NOT NULL DEFAULT '[]',                 -- used when block_type = 'image'
                                                       -- [{ "url": "...", "s3Key": "...", "caption": "..." }]
  pos_x NUMERIC(6,2) NOT NULL DEFAULT 0,               -- % from left
  pos_y NUMERIC(6,2) NOT NULL DEFAULT 0,               -- % from top
  width NUMERIC(6,2) NOT NULL DEFAULT 30,              -- % of canvas width
  height NUMERIC(6,2) NOT NULL DEFAULT 20,             -- % of canvas height
  z_index INT NOT NULL DEFAULT 0,
  style JSONB NOT NULL DEFAULT '{}',                  -- { fontSize, color, backgroundColor, textAlign, ... }
  created_by INT,
  updated_by INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_home_block_type CHECK (block_type IN ('text','image')),
  CONSTRAINT chk_home_block_status CHECK (status IN ('draft','published'))
);

CREATE INDEX IF NOT EXISTS idx_home_blocks_status ON home_blocks(status);

-- ------------------------------------------------------
-- ABOUT PAGE BLOCKS
-- Text-only, ordered top-to-bottom, same draft/publish pattern.
-- ------------------------------------------------------
CREATE TABLE IF NOT EXISTS about_blocks (
  id SERIAL PRIMARY KEY,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',        -- 'draft' | 'published'
  text_content TEXT NOT NULL DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  created_by INT,
  updated_by INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_about_block_status CHECK (status IN ('draft','published'))
);

CREATE INDEX IF NOT EXISTS idx_about_blocks_status ON about_blocks(status);

-- ------------------------------------------------------
-- ENQUIRY TYPES — admin-editable dropdown options for the
-- public query box. Seeded with core school enquiry types.
-- ------------------------------------------------------
CREATE TABLE IF NOT EXISTS enquiry_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(48) UNIQUE NOT NULL,
  label VARCHAR(120) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO enquiry_types (code, label, display_order) VALUES
  ('admission',    'Admission Enquiry',              1),
  ('fee',          'Fee Enquiry',                    2),
  ('transport',    'Transport Enquiry',              3),
  ('tc_document',  'Transfer Certificate / Document', 4),
  ('academic',     'Academic Enquiry',               5),
  ('job_career',   'Job / Career Enquiry',           6),
  ('hostel',       'Hostel Enquiry',                 7),
  ('complaint',    'Complaint / Feedback',           8),
  ('other',        'Other',                          9)
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------
-- ENQUIRIES — public query box submissions.
-- ------------------------------------------------------
CREATE TABLE IF NOT EXISTS enquiries (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(32) NOT NULL,
  message TEXT NOT NULL,
  enquiry_type_id INT NOT NULL REFERENCES enquiry_types(id),
  status VARCHAR(16) NOT NULL DEFAULT 'new',          -- 'new' | 'in_progress' | 'resolved'
  deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_enquiry_status CHECK (status IN ('new','in_progress','resolved'))
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_deleted ON enquiries(deleted);

-- ------------------------------------------------------
-- CONNECT LINKS — floating hover widget. Only rows with
-- is_enabled = true AND a non-empty value are shown publicly.
-- ------------------------------------------------------
CREATE TABLE IF NOT EXISTS connect_links (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(32) UNIQUE NOT NULL,   -- 'whatsapp' | 'instagram' | 'facebook' | 'email' | 'phone' | 'youtube' | 'linkedin' | 'twitter'
  value VARCHAR(512) NOT NULL DEFAULT '', -- phone number, handle, email address, or full URL — flexible
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO connect_links (platform, value, is_enabled, display_order) VALUES
  ('whatsapp',  '', false, 1),
  ('instagram', '', false, 2),
  ('facebook',  '', false, 3),
  ('email',     '', false, 4),
  ('phone',     '', false, 5),
  ('youtube',   '', false, 6),
  ('linkedin',  '', false, 7),
  ('twitter',   '', false, 8)
ON CONFLICT (platform) DO NOTHING;

-- ------------------------------------------------------
-- SITE THEME — single-row table for admin-adjustable colors
-- across the public frontend (home/about/widgets).
-- ------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_theme (
  id INT PRIMARY KEY DEFAULT 1,
  primary_color VARCHAR(16) NOT NULL DEFAULT '#2563eb',
  secondary_color VARCHAR(16) NOT NULL DEFAULT '#f3f4f6',
  background_color VARCHAR(16) NOT NULL DEFAULT '#ffffff',
  text_color VARCHAR(16) NOT NULL DEFAULT '#111827',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_site_theme_single_row CHECK (id = 1)
);

INSERT INTO site_theme (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
