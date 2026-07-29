-- ============================================================
-- 001_enums_and_schema.sql
-- Caporales San Gabriel — Enums y esquema base
-- ============================================================

-- ENUMS
CREATE TYPE user_role AS ENUM (
  'super_admin', 'pending', 'approved', 'rejected', 'suspended'
);
CREATE TYPE costume_type AS ENUM ('rent', 'sale');
CREATE TYPE costume_status AS ENUM ('disponible', 'reservado', 'arrendado');
CREATE TYPE audit_action AS ENUM (
  'user_approved', 'user_rejected', 'user_suspended',
  'user_reactivated', 'user_deleted',
  'event_created', 'event_updated', 'event_deleted',
  'rental_confirmed', 'sale_confirmed'
);

-- PROFILES
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  rut             TEXT UNIQUE NOT NULL,
  phone           TEXT NOT NULL,
  address         TEXT NOT NULL,
  city            TEXT NOT NULL,
  id_card_path    TEXT,                       -- ruta en bucket 'id-cards'
  role            user_role NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  suspended_reason TEXT,
  suspended_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVENTS
CREATE TABLE events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  event_date          DATE NOT NULL,
  max_global_rentals  INTEGER NOT NULL DEFAULT 50 CHECK (max_global_rentals > 0),
  max_user_rentals    INTEGER NOT NULL DEFAULT 1  CHECK (max_user_rentals > 0),
  is_archived         BOOLEAN NOT NULL DEFAULT false,
  created_by          UUID NOT NULL REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- COSTUMES
CREATE TABLE costumes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        costume_type NOT NULL,
  year        TEXT NOT NULL,
  size        TEXT NOT NULL,
  boot_size   TEXT NOT NULL,
  price       INTEGER NOT NULL CHECK (price > 0),   -- en CLP
  bank_info   TEXT NOT NULL,
  image_paths TEXT[] NOT NULL DEFAULT '{}',          -- fotos del traje
  status      costume_status NOT NULL DEFAULT 'disponible',
  is_sold     BOOLEAN NOT NULL DEFAULT false,        -- soft delete para ventas confirmadas
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Un traje de venta NO puede tener eventos asociados (validado por trigger)
  CONSTRAINT rent_type_only_has_events CHECK (
    type = 'rent' OR (type = 'sale')
  )
);

-- COSTUME_EVENTS (solo trajes de tipo 'rent')
CREATE TABLE costume_events (
  costume_id  UUID NOT NULL REFERENCES costumes(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
  PRIMARY KEY (costume_id, event_id)
);

-- RENTALS
CREATE TABLE rentals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  costume_id    UUID NOT NULL REFERENCES costumes(id) ON DELETE CASCADE,
  renter_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  rut           TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT NOT NULL,
  event_id      UUID NOT NULL REFERENCES events(id),
  voucher_path  TEXT,                               -- NULL hasta que el upload sea exitoso
  status        TEXT NOT NULL DEFAULT 'reservado'
                  CHECK (status IN ('reservado', 'arrendado')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SALES
CREATE TABLE sales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  costume_id    UUID NOT NULL REFERENCES costumes(id) ON DELETE CASCADE,
  buyer_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  rut           TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT NOT NULL,
  voucher_path  TEXT,                               -- NULL hasta upload exitoso
  status        TEXT NOT NULL DEFAULT 'reservado'
                  CHECK (status IN ('reservado', 'completado')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID NOT NULL REFERENCES auth.users(id),
  action         audit_action NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  details        JSONB NOT NULL DEFAULT '{}',
  ip_address     INET,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- APPROVAL TOKENS (para links de aprobar/rechazar en emails)
CREATE TABLE approval_tokens (
  token          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action         TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
  used           BOOLEAN NOT NULL DEFAULT false,
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);