/*
  # Create admin profile function

  ## Summary
  Adds a SECURITY DEFINER function to insert admin profiles, bypassing RLS.
  This is needed because the edge function uses the service_role_key but RLS
  policies with auth.uid() checks still block inserts when there is no user context.

  ## New Functions
  - `create_admin_profile(p_id, p_company_id, p_role, p_full_name, p_email, p_dni)`
    Inserts a row into profiles with SECURITY DEFINER so RLS is bypassed.
    Returns true on success.
*/

CREATE OR REPLACE FUNCTION public.create_admin_profile(
  p_id uuid,
  p_company_id uuid,
  p_role text,
  p_full_name text,
  p_email text,
  p_dni text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO profiles (id, company_id, role, full_name, email, dni)
  VALUES (p_id, p_company_id, p_role, p_full_name, p_email, p_dni);
  RETURN true;
END;
$$;
