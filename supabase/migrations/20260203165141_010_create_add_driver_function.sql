/*
  # Create Add Driver Function
  
  1. New Function
    - `add_driver_to_company` - Allows admins to add drivers to their company
    - Executes with SECURITY DEFINER to bypass RLS
    - Only works if caller is an admin of the company
  
  2. Security
    - Validates that caller is an admin
    - Creates profile for the specified user_id with 'driver' role
    - Links driver to admin's company
*/

CREATE OR REPLACE FUNCTION add_driver_to_company(
  p_user_id uuid,
  p_full_name text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_company_id uuid;
  v_caller_role text;
  v_profile profiles;
BEGIN
  -- Get the current user ID
  v_caller_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  
  -- Get caller's company_id and role
  SELECT company_id, role INTO v_company_id, v_caller_role
  FROM profiles
  WHERE id = v_caller_id;
  
  -- Check if caller has a profile
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Caller does not have a profile');
  END IF;
  
  -- Check if caller is an admin
  IF v_caller_role != 'admin' THEN
    RETURN jsonb_build_object('error', 'Only admins can add drivers');
  END IF;
  
  -- Check if user already has a profile
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('error', 'User already has a profile');
  END IF;
  
  -- Create the driver profile
  INSERT INTO profiles (id, company_id, role, full_name, email)
  VALUES (p_user_id, v_company_id, 'driver', p_full_name, p_email)
  RETURNING * INTO v_profile;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'profile', row_to_json(v_profile)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;