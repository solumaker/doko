/*
  # Remember previous OBSERVACIONES text for control documents

  ## Purpose
  Extends the "remembered data" feature (party_history, vehicle_history) to
  the free-text OBSERVACIONES field, so the app can suggest recently used
  notes when creating the next document, same as it already does for the
  counterparty, origin, destination and vehicle plates.

  ## New Table
  - `observation_history`
    - `id` (uuid, primary key)
    - `company_id` (uuid, FK -> companies)
    - `text` (text) - the observations text as entered by the user
    - `text_hash` (text, generated) - md5(trim(text)), used as the dedup key
      since a plain btree unique index on unbounded free text is unsafe
    - `use_count` (integer) - how many times this exact text was reused
    - `last_used` (timestamptz)
    - `created_at` (timestamptz)

  ## Unique constraint
  One row per (company_id, text_hash) pair - upserted on reuse.

  ## Security
  RLS enabled, same company-scoped policies as party_history/vehicle_history.
*/

CREATE TABLE IF NOT EXISTS observation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  text_hash text GENERATED ALWAYS AS (md5(trim(text))) STORED,
  use_count integer NOT NULL DEFAULT 1,
  last_used timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, text_hash)
);

ALTER TABLE observation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own company observation history"
  ON observation_history FOR SELECT
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own company observation history"
  ON observation_history FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own company observation history"
  ON observation_history FOR UPDATE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS observation_history_company_idx ON observation_history(company_id, last_used DESC);

-- Backfill from existing documents (grouped by the raw trimmed text so a
-- single INSERT never targets the same generated text_hash twice)
INSERT INTO observation_history (company_id, text, use_count, last_used)
SELECT
  company_id,
  text,
  count(*),
  max(created_at)
FROM (
  SELECT company_id, trim(content->>'observations') AS text, created_at
  FROM documents
  WHERE trim(COALESCE(content->>'observations', '')) <> ''
) src
GROUP BY company_id, text
ON CONFLICT (company_id, text_hash) DO UPDATE SET
  use_count = observation_history.use_count + EXCLUDED.use_count,
  last_used = GREATEST(observation_history.last_used, EXCLUDED.last_used);
