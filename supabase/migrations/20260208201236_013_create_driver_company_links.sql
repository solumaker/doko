/*
  # Create Driver Company Links for PIN-based Access

  1. New Tables
    - `driver_company_links`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, FK to profiles) - the driver's user id
      - `company_id` (uuid, FK to companies) - the company
      - `pin_hash` (text) - bcrypt hash of 4-digit PIN
      - `access_token` (text, unique) - permanent URL token shared via WhatsApp
      - `is_active` (boolean) - company can deactivate without deleting
      - `created_at` (timestamptz)
      - Unique constraint on (driver_id, company_id)

  2. Changes to documents
    - Add `driver_name` (text) - snapshot of who created the document

  3. Helper Functions
    - `verify_driver_pin` - validates access_token + PIN combo
    - `create_driver_link` - creates link with hashed PIN
    - `change_driver_pin` - updates PIN hash for a link
    - `toggle_driver_link` - activates/deactivates a link

  4. Security
    - Enable RLS on driver_company_links
    - Admins can manage links for their own company only
    - PIN verification runs via SECURITY DEFINER (no direct PIN hash exposure)
*/

CREATE TABLE IF NOT EXISTS driver_company_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  access_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, company_id)
);

ALTER TABLE driver_company_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS dcl_driver_id_idx ON driver_company_links(driver_id);
CREATE INDEX IF NOT EXISTS dcl_company_id_idx ON driver_company_links(company_id);
CREATE INDEX IF NOT EXISTS dcl_access_token_idx ON driver_company_links(access_token);

CREATE POLICY "Admins can view company driver links"
  ON driver_company_links FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert company driver links"
  ON driver_company_links FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update company driver links"
  ON driver_company_links FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete company driver links"
  ON driver_company_links FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'driver_name'
  ) THEN
    ALTER TABLE documents ADD COLUMN driver_name text DEFAULT '';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION verify_driver_pin(p_access_token text, p_pin text)
RETURNS TABLE(driver_id uuid, company_id uuid, link_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT dcl.driver_id, dcl.company_id, dcl.id AS link_id
  FROM driver_company_links dcl
  WHERE dcl.access_token = p_access_token
    AND dcl.is_active = true
    AND dcl.pin_hash = extensions.crypt(p_pin, dcl.pin_hash);
END;
$$;

CREATE OR REPLACE FUNCTION create_driver_link(p_driver_id uuid, p_company_id uuid, p_pin text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  INSERT INTO driver_company_links (driver_id, company_id, pin_hash)
  VALUES (p_driver_id, p_company_id, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  RETURNING access_token INTO v_token;

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION change_driver_pin(p_link_id uuid, p_new_pin text, p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE driver_company_links
  SET pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf'))
  WHERE id = p_link_id AND company_id = p_company_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION toggle_driver_link(p_link_id uuid, p_is_active boolean, p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE driver_company_links
  SET is_active = p_is_active
  WHERE id = p_link_id AND company_id = p_company_id;

  RETURN FOUND;
END;
$$;
