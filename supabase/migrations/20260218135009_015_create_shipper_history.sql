/*
  # Create shipper_history table

  ## Purpose
  Stores the history of contractual shippers used in documents so the app can
  offer autocomplete suggestions when creating new documents.

  ## New Tables
  - `shipper_history`
    - `id` (uuid, primary key)
    - `company_id` (uuid, FK → companies) – shipper belongs to a transport company
    - `nombre` (text) – shipper company name
    - `nif` (text) – shipper tax ID
    - `domicilio` (text) – street address
    - `poblacion` (text) – city/town
    - `use_count` (integer) – how many times used; incremented on reuse
    - `last_used` (timestamptz) – last time this shipper was used in a document
    - `created_at` (timestamptz)

  ## Unique constraint
  One row per (company_id, nif) pair – upserted on reuse.

  ## Security
  RLS enabled. Users can only read/write shipper history belonging to their own company.
*/

CREATE TABLE IF NOT EXISTS shipper_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT '',
  nif text NOT NULL DEFAULT '',
  domicilio text NOT NULL DEFAULT '',
  poblacion text NOT NULL DEFAULT '',
  use_count integer NOT NULL DEFAULT 1,
  last_used timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, nif)
);

ALTER TABLE shipper_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own company shipper history"
  ON shipper_history FOR SELECT
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own company shipper history"
  ON shipper_history FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own company shipper history"
  ON shipper_history FOR UPDATE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS shipper_history_company_id_idx ON shipper_history(company_id);
CREATE INDEX IF NOT EXISTS shipper_history_last_used_idx ON shipper_history(company_id, last_used DESC);
