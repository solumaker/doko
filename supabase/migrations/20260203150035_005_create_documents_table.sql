/*
  # Create Documents Table
  
  1. New Tables
    - `documents`
      - `id` (uuid, primary key) - Unique identifier
      - `company_id` (uuid) - References companies.id for multi-tenant isolation
      - `creator_id` (uuid) - References auth.users.id (who created the document)
      - `content` (jsonb) - Full snapshot of document data (origin, destination, vehicle, cargo)
                           This preserves history even if master data changes
      - `departure_date` (timestamptz) - Scheduled departure date/time
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Notes
    - The `content` JSONB field stores a complete snapshot including:
      - origin: full location data at time of creation
      - destination: full location data at time of creation
      - vehicle: full vehicle data at time of creation
      - cargo: description, packages count, weight
      - company: company info at time of creation
  
  3. Security
    - Enable RLS on `documents` table
*/

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  content jsonb NOT NULL DEFAULT '{}',
  departure_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS documents_company_id_idx ON documents(company_id);
CREATE INDEX IF NOT EXISTS documents_creator_id_idx ON documents(creator_id);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents(created_at DESC);