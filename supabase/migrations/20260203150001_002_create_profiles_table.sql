/*
  # Create Profiles Table
  
  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - References auth.users.id
      - `company_id` (uuid) - References companies.id, links user to company
      - `role` (text) - User role: 'admin' (company owner) or 'driver' (worker)
      - `full_name` (text) - User's full name
      - `email` (text) - User's email
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Security
    - Enable RLS on `profiles` table
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS profiles_company_id_idx ON profiles(company_id);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);