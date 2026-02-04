/*
  # Create Registration Function
  
  1. New Function
    - `register_company_and_user` - Handles complete registration process
    - Executes with SECURITY DEFINER to bypass RLS
    - Creates company, then profile for the authenticated user
  
  2. Security
    - Function runs with elevated privileges to bypass RLS during registration
    - Only creates data for the currently authenticated user
    - Validates that user doesn't already have a profile
*/

CREATE OR REPLACE FUNCTION register_company_and_user(
  p_full_name text,
  p_email text,
  p_company_name text,
  p_company_cif text,
  p_company_address text DEFAULT '',
  p_company_city text DEFAULT '',
  p_company_province text DEFAULT '',
  p_company_postal_code text DEFAULT '',
  p_company_phone text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_profile profiles;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  
  -- Check if user already has a profile
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
    RETURN jsonb_build_object('error', 'User already has a profile');
  END IF;
  
  -- Create the company
  INSERT INTO companies (name, cif, address, city, province, postal_code, phone)
  VALUES (p_company_name, p_company_cif, p_company_address, p_company_city, 
          p_company_province, p_company_postal_code, p_company_phone)
  RETURNING id INTO v_company_id;
  
  -- Create the profile
  INSERT INTO profiles (id, company_id, role, full_name, email)
  VALUES (v_user_id, v_company_id, 'admin', p_full_name, p_email)
  RETURNING * INTO v_profile;
  
  -- Return success with company_id
  RETURN jsonb_build_object(
    'success', true,
    'company_id', v_company_id,
    'profile', row_to_json(v_profile)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;