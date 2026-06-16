-- Add company_role column to companies table to differentiate Cargador Contractual from Transportista Efectivo
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS company_role text NOT NULL DEFAULT 'transportista'
CHECK (company_role IN ('cargador', 'transportista'));

-- Update register_company_and_user to accept the new role parameter
CREATE OR REPLACE FUNCTION public.register_company_and_user(
  p_full_name text,
  p_email text,
  p_company_name text,
  p_company_cif text,
  p_company_address text DEFAULT ''::text,
  p_company_city text DEFAULT ''::text,
  p_company_province text DEFAULT ''::text,
  p_company_postal_code text DEFAULT ''::text,
  p_company_phone text DEFAULT ''::text,
  p_company_role text DEFAULT 'transportista'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_profile profiles;
  v_role text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
    RETURN jsonb_build_object('error', 'User already has a profile');
  END IF;

  v_role := CASE WHEN p_company_role IN ('cargador', 'transportista') THEN p_company_role ELSE 'transportista' END;

  INSERT INTO companies (name, cif, address, city, province, postal_code, phone, trial_ends_at, company_role)
  VALUES (p_company_name, p_company_cif, p_company_address, p_company_city,
    p_company_province, p_company_postal_code, p_company_phone, now() + interval '7 days', v_role)
  RETURNING id INTO v_company_id;

  INSERT INTO profiles (id, company_id, role, full_name, email)
  VALUES (v_user_id, v_company_id, 'admin', p_full_name, p_email)
  RETURNING * INTO v_profile;

  RETURN jsonb_build_object(
    'success', true,
    'company_id', v_company_id,
    'profile', row_to_json(v_profile)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;