/*
  # Add DNI-based driver login

  1. Changes to `profiles` table
    - Add unique partial index on LOWER(dni) WHERE role = 'driver' AND dni != ''
    - This ensures each driver has a unique DNI across the system
    - Index on LOWER(dni) for case-insensitive lookups

  2. New functions
    - `verify_driver_pin_by_dni(p_dni, p_pin)` - Validates driver login by DNI + PIN
      - Case-insensitive DNI lookup
      - Joins profiles with driver_company_links
      - Returns driver_id, company_id, link_id, access_token on success
    - `change_own_driver_pin(p_driver_id, p_current_pin, p_new_pin)` - Allows driver to change their own PIN
      - Verifies current PIN before changing
      - Returns boolean success

  3. Security
    - Both functions are SECURITY DEFINER to prevent direct PIN hash exposure
    - change_own_driver_pin requires the driver's own ID (enforced by edge function auth check)
*/

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_driver_dni_unique
  ON profiles (LOWER(dni))
  WHERE role = 'driver' AND dni IS NOT NULL AND dni != '';

CREATE OR REPLACE FUNCTION verify_driver_pin_by_dni(p_dni text, p_pin text)
RETURNS TABLE(driver_id uuid, company_id uuid, link_id uuid, access_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id AS driver_id, dcl.company_id, dcl.id AS link_id, dcl.access_token
  FROM profiles p
  JOIN driver_company_links dcl ON dcl.driver_id = p.id
  WHERE LOWER(p.dni) = LOWER(p_dni)
    AND p.role = 'driver'
    AND p.dni IS NOT NULL
    AND p.dni != ''
    AND dcl.is_active = true
    AND dcl.pin_hash = extensions.crypt(p_pin, dcl.pin_hash);
END;
$$;

CREATE OR REPLACE FUNCTION change_own_driver_pin(p_driver_id uuid, p_current_pin text, p_new_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_found boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM driver_company_links
    WHERE driver_id = p_driver_id
      AND is_active = true
      AND pin_hash = extensions.crypt(p_current_pin, pin_hash)
  ) INTO v_found;

  IF NOT v_found THEN
    RETURN false;
  END IF;

  UPDATE driver_company_links
  SET pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf'))
  WHERE driver_id = p_driver_id
    AND is_active = true;

  RETURN true;
END;
$$;
