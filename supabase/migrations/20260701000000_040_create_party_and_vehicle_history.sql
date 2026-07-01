/*
  # Generalize "remembered data" history for control documents

  ## Purpose
  Requirement: every time a control document is generated, its data must be
  saved so it can optionally be reused when creating the next document.
  `shipper_history` already did this, but only for the contractual shipper
  and it was never surfaced in the UI. This migration generalizes that idea
  to also cover the counterparty when acting as cargador (transportista
  efectivo), origin, destination and vehicle plates.

  ## New Tables
  - `party_history` - one row per distinct party (nombre + domicilio) ever
    used in a document, tagged by `party_type`:
    'contractual_shipper' | 'transportista_efectivo' | 'origin' | 'destination'.
    Replaces `shipper_history` (data migrated below).
  - `vehicle_history` - one row per distinct tractor plate ever used, with
    its usual trailer plates.

  Both tables track `use_count` / `last_used` so the app can offer the most
  relevant suggestions first, same pattern as the original `shipper_history`.

  ## Data migration
  - Existing `shipper_history` rows are copied into `party_history` as
    'contractual_shipper'.
  - All four party types and vehicle plates are additionally backfilled from
    the existing `documents.content` JSON (pre-aggregated by the unique key
    so a single INSERT never touches the same target row twice), so
    suggestions are populated immediately from documents created before this
    migration.
  - `shipper_history` is dropped once its data has been copied over, since
    nothing else in the codebase reads from it directly (the app will read
    `party_history` going forward).

  ## Security
  RLS enabled on both new tables, mirroring the `shipper_history` policies:
  users can only read/write history belonging to their own company.
*/

CREATE TABLE IF NOT EXISTS party_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  party_type text NOT NULL CHECK (party_type IN ('contractual_shipper', 'transportista_efectivo', 'origin', 'destination')),
  nombre text NOT NULL DEFAULT '',
  nif text NOT NULL DEFAULT '',
  domicilio text NOT NULL DEFAULT '',
  poblacion text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  use_count integer NOT NULL DEFAULT 1,
  last_used timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, party_type, nombre, domicilio)
);

ALTER TABLE party_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own company party history"
  ON party_history FOR SELECT
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own company party history"
  ON party_history FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own company party history"
  ON party_history FOR UPDATE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS party_history_company_type_idx ON party_history(company_id, party_type, last_used DESC);

CREATE TABLE IF NOT EXISTS vehicle_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tractor_plate text NOT NULL DEFAULT '',
  trailer_plate_1 text NOT NULL DEFAULT '',
  trailer_plate_2 text NOT NULL DEFAULT '',
  use_count integer NOT NULL DEFAULT 1,
  last_used timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, tractor_plate)
);

ALTER TABLE vehicle_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own company vehicle history"
  ON vehicle_history FOR SELECT
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own company vehicle history"
  ON vehicle_history FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own company vehicle history"
  ON vehicle_history FOR UPDATE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS vehicle_history_company_idx ON vehicle_history(company_id, last_used DESC);

-- Migrate existing shipper_history rows over as 'contractual_shipper' entries
-- (grouped by the party_history unique key so a single INSERT never targets the same row twice)
INSERT INTO party_history (company_id, party_type, nombre, nif, domicilio, poblacion, postal_code, use_count, last_used)
SELECT
  company_id,
  'contractual_shipper',
  nombre,
  (array_agg(nif ORDER BY last_used DESC))[1],
  domicilio,
  (array_agg(poblacion ORDER BY last_used DESC))[1],
  '',
  sum(use_count),
  max(last_used)
FROM shipper_history
GROUP BY company_id, nombre, domicilio
ON CONFLICT (company_id, party_type, nombre, domicilio) DO UPDATE SET
  use_count = party_history.use_count + EXCLUDED.use_count,
  last_used = GREATEST(party_history.last_used, EXCLUDED.last_used);

-- Backfill contractual_shipper / transportista_efectivo / origin / destination from existing documents
INSERT INTO party_history (company_id, party_type, nombre, nif, domicilio, poblacion, postal_code, use_count, last_used)
SELECT
  company_id,
  'contractual_shipper',
  nombre,
  (array_agg(nif ORDER BY created_at DESC))[1],
  domicilio,
  (array_agg(poblacion ORDER BY created_at DESC))[1],
  (array_agg(postal_code ORDER BY created_at DESC))[1],
  count(*),
  max(created_at)
FROM (
  SELECT
    company_id,
    COALESCE(content->'contractual_shipper'->>'nombre', '') AS nombre,
    content->'contractual_shipper'->>'domicilio' AS domicilio,
    COALESCE(content->'contractual_shipper'->>'nif', '') AS nif,
    COALESCE(content->'contractual_shipper'->>'poblacion', '') AS poblacion,
    COALESCE(content->'contractual_shipper'->>'postal_code', '') AS postal_code,
    created_at
  FROM documents
  WHERE trim(COALESCE(content->'contractual_shipper'->>'domicilio', '')) <> ''
) src
GROUP BY company_id, nombre, domicilio
ON CONFLICT (company_id, party_type, nombre, domicilio) DO UPDATE SET
  use_count = party_history.use_count + EXCLUDED.use_count,
  last_used = GREATEST(party_history.last_used, EXCLUDED.last_used);

INSERT INTO party_history (company_id, party_type, nombre, nif, domicilio, poblacion, postal_code, use_count, last_used)
SELECT
  company_id,
  'transportista_efectivo',
  nombre,
  (array_agg(nif ORDER BY created_at DESC))[1],
  domicilio,
  (array_agg(poblacion ORDER BY created_at DESC))[1],
  (array_agg(postal_code ORDER BY created_at DESC))[1],
  count(*),
  max(created_at)
FROM (
  SELECT
    company_id,
    COALESCE(content->'transportista_efectivo'->>'nombre', '') AS nombre,
    content->'transportista_efectivo'->>'domicilio' AS domicilio,
    COALESCE(content->'transportista_efectivo'->>'nif', '') AS nif,
    COALESCE(content->'transportista_efectivo'->>'poblacion', '') AS poblacion,
    COALESCE(content->'transportista_efectivo'->>'postal_code', '') AS postal_code,
    created_at
  FROM documents
  WHERE trim(COALESCE(content->'transportista_efectivo'->>'domicilio', '')) <> ''
) src
GROUP BY company_id, nombre, domicilio
ON CONFLICT (company_id, party_type, nombre, domicilio) DO UPDATE SET
  use_count = party_history.use_count + EXCLUDED.use_count,
  last_used = GREATEST(party_history.last_used, EXCLUDED.last_used);

INSERT INTO party_history (company_id, party_type, nombre, nif, domicilio, poblacion, postal_code, use_count, last_used)
SELECT
  company_id,
  'origin',
  nombre,
  (array_agg(nif ORDER BY created_at DESC))[1],
  domicilio,
  (array_agg(poblacion ORDER BY created_at DESC))[1],
  (array_agg(postal_code ORDER BY created_at DESC))[1],
  count(*),
  max(created_at)
FROM (
  SELECT
    company_id,
    COALESCE(content->'origin'->>'empresa', content->'origin'->>'name', '') AS nombre,
    COALESCE(content->'origin'->>'domicilio', content->'origin'->>'address') AS domicilio,
    COALESCE(content->'origin'->>'nif', '') AS nif,
    COALESCE(content->'origin'->>'poblacion', content->'origin'->>'city', '') AS poblacion,
    COALESCE(content->'origin'->>'postal_code', '') AS postal_code,
    created_at
  FROM documents
  WHERE trim(COALESCE(content->'origin'->>'domicilio', content->'origin'->>'address', '')) <> ''
) src
GROUP BY company_id, nombre, domicilio
ON CONFLICT (company_id, party_type, nombre, domicilio) DO UPDATE SET
  use_count = party_history.use_count + EXCLUDED.use_count,
  last_used = GREATEST(party_history.last_used, EXCLUDED.last_used);

INSERT INTO party_history (company_id, party_type, nombre, nif, domicilio, poblacion, postal_code, use_count, last_used)
SELECT
  company_id,
  'destination',
  nombre,
  (array_agg(nif ORDER BY created_at DESC))[1],
  domicilio,
  (array_agg(poblacion ORDER BY created_at DESC))[1],
  (array_agg(postal_code ORDER BY created_at DESC))[1],
  count(*),
  max(created_at)
FROM (
  SELECT
    company_id,
    COALESCE(content->'destination'->>'empresa', content->'destination'->>'name', '') AS nombre,
    COALESCE(content->'destination'->>'domicilio', content->'destination'->>'address') AS domicilio,
    COALESCE(content->'destination'->>'nif', '') AS nif,
    COALESCE(content->'destination'->>'poblacion', content->'destination'->>'city', '') AS poblacion,
    COALESCE(content->'destination'->>'postal_code', '') AS postal_code,
    created_at
  FROM documents
  WHERE trim(COALESCE(content->'destination'->>'domicilio', content->'destination'->>'address', '')) <> ''
) src
GROUP BY company_id, nombre, domicilio
ON CONFLICT (company_id, party_type, nombre, domicilio) DO UPDATE SET
  use_count = party_history.use_count + EXCLUDED.use_count,
  last_used = GREATEST(party_history.last_used, EXCLUDED.last_used);

-- Backfill vehicle plates from existing documents
INSERT INTO vehicle_history (company_id, tractor_plate, trailer_plate_1, trailer_plate_2, use_count, last_used)
SELECT
  company_id,
  tractor_plate,
  (array_agg(trailer_plate_1 ORDER BY created_at DESC))[1],
  (array_agg(trailer_plate_2 ORDER BY created_at DESC))[1],
  count(*),
  max(created_at)
FROM (
  SELECT
    company_id,
    content->'vehicle'->>'tractor_plate' AS tractor_plate,
    COALESCE(content->'vehicle'->>'trailer_plate_1', content->'vehicle'->>'trailer_plate', '') AS trailer_plate_1,
    COALESCE(content->'vehicle'->>'trailer_plate_2', '') AS trailer_plate_2,
    created_at
  FROM documents
  WHERE trim(COALESCE(content->'vehicle'->>'tractor_plate', '')) <> ''
) src
GROUP BY company_id, tractor_plate
ON CONFLICT (company_id, tractor_plate) DO UPDATE SET
  trailer_plate_1 = EXCLUDED.trailer_plate_1,
  trailer_plate_2 = EXCLUDED.trailer_plate_2,
  use_count = vehicle_history.use_count + EXCLUDED.use_count,
  last_used = GREATEST(vehicle_history.last_used, EXCLUDED.last_used);

DROP TABLE IF EXISTS shipper_history;
