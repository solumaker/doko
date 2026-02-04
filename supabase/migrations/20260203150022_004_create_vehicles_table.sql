/*
  # Create Vehicles Table
  
  1. New Tables
    - `vehicles`
      - `id` (uuid, primary key) - Unique identifier
      - `company_id` (uuid) - References companies.id for multi-tenant isolation
      - `tractor_plate` (text) - Tractor/cab license plate (required)
      - `trailer_plate` (text) - Trailer license plate (optional)
      - `alias` (text) - Vehicle nickname/alias
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Security
    - Enable RLS on `vehicles` table
*/

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tractor_plate text NOT NULL,
  trailer_plate text DEFAULT '',
  alias text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS vehicles_company_id_idx ON vehicles(company_id);