/*
  # Create Companies Table
  
  1. New Tables
    - `companies`
      - `id` (uuid, primary key) - Unique identifier for the company
      - `name` (text) - Company name
      - `cif` (text) - Tax ID (CIF in Spain)
      - `address` (text) - Company address
      - `city` (text) - City
      - `province` (text) - Province
      - `postal_code` (text) - Postal code
      - `phone` (text) - Contact phone
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Security
    - Enable RLS on `companies` table
    - Policies will be added after profiles table is created
*/

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cif text NOT NULL,
  address text DEFAULT '',
  city text DEFAULT '',
  province text DEFAULT '',
  postal_code text DEFAULT '',
  phone text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;