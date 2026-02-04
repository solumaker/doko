/*
  # Create Locations Table
  
  1. New Tables
    - `locations`
      - `id` (uuid, primary key) - Unique identifier
      - `company_id` (uuid) - References companies.id for multi-tenant isolation
      - `name` (text) - Location alias/name
      - `address` (text) - Street address
      - `city` (text) - City/Population
      - `province` (text) - Province
      - `postal_code` (text) - Postal code
      - `contact_name` (text) - Contact person name
      - `phone` (text) - Contact phone
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Security
    - Enable RLS on `locations` table
*/

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  contact_name text DEFAULT '',
  phone text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS locations_company_id_idx ON locations(company_id);