CREATE OR REPLACE FUNCTION admin_verify_password(p_email text, p_password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM admin_users
  WHERE lower(email) = lower(p_email)
    AND password_hash = crypt(p_password, password_hash);
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_verify_password(text, text) FROM public, anon, authenticated;

INSERT INTO admin_users (email, password_hash, full_name)
SELECT 'admin@doko.app', crypt('DokoAdmin2026!', gen_salt('bf')), 'DOKO Admin'
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE lower(email) = 'admin@doko.app');
