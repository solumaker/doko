/*
  # Free plan refactor + admin panel foundation

  1. Companies
    - Add free_doc_limit (default 50) — editable per client by admin panel
    - Add free_plan_anchor (default created_at) — anchor date for 30-day cycle

  2. Subscription usage RPC
    - Removes 7-day trial concept; "trial" maps to permanent "Plan Gratuito"
    - is_trial_active returned as true whenever no paid subscription is active
    - Reset window for free plan: next_reset = anchor + N*30d (rolling)
    - Documents counted within current 30-day window

  3. Admin users
    - Table for internal DOKO admin operators (separate from clients)
    - Service-role-only access
*/

ALTER TABLE companies ADD COLUMN IF NOT EXISTS free_doc_limit integer NOT NULL DEFAULT 50;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS free_plan_anchor timestamptz;

UPDATE companies SET free_plan_anchor = COALESCE(free_plan_anchor, created_at);

CREATE OR REPLACE FUNCTION get_subscription_usage(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub subscriptions;
  v_company record;
  v_docs_used integer;
  v_free_docs_used integer;
  v_docs_extra integer;
  v_users_count integer;
  v_anchor timestamptz;
  v_now timestamptz := now();
  v_period_days integer := 30;
  v_periods_elapsed integer;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_is_subscription_expired boolean := false;
  v_has_active_sub boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND company_id = p_company_id
  ) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT id, created_at, free_doc_limit, free_plan_anchor
  INTO v_company
  FROM companies WHERE id = p_company_id;

  SELECT * INTO v_sub FROM subscriptions WHERE company_id = p_company_id LIMIT 1;

  v_has_active_sub := v_sub.id IS NOT NULL AND v_sub.status IN ('active', 'trialing');

  v_anchor := COALESCE(v_company.free_plan_anchor, v_company.created_at, v_now);
  v_periods_elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_anchor)) / (v_period_days * 86400))::int);
  v_window_start := v_anchor + (v_periods_elapsed * v_period_days || ' days')::interval;
  v_window_end := v_window_start + (v_period_days || ' days')::interval;

  SELECT count(*) INTO v_free_docs_used
  FROM documents
  WHERE company_id = p_company_id
    AND created_at >= v_window_start
    AND created_at < v_window_end;

  IF v_sub.id IS NOT NULL AND v_sub.status = 'canceled' THEN
    v_is_subscription_expired := true;
  END IF;

  IF v_has_active_sub OR (v_sub.id IS NOT NULL AND v_sub.status = 'past_due') THEN
    SELECT count(*) INTO v_docs_used
    FROM documents
    WHERE company_id = p_company_id
      AND created_at >= v_sub.current_period_start
      AND created_at < v_sub.current_period_end;
  ELSE
    v_docs_used := 0;
  END IF;

  SELECT COALESCE(sum(documents_remaining), 0) INTO v_docs_extra
  FROM document_packs
  WHERE company_id = p_company_id AND documents_remaining > 0;

  SELECT count(*) INTO v_users_count
  FROM (
    SELECT id FROM profiles WHERE company_id = p_company_id
    UNION
    SELECT driver_id FROM driver_company_links WHERE company_id = p_company_id AND is_active = true
  ) AS combined_users;

  RETURN jsonb_build_object(
    'documents_used', v_docs_used,
    'document_limit', COALESCE(v_sub.document_limit, 0),
    'documents_extra_remaining', v_docs_extra,
    'users_count', v_users_count,
    'user_limit', COALESCE(v_sub.user_limit, 0),
    'plan', v_sub.plan,
    'status', v_sub.status,
    'current_period_start', v_sub.current_period_start,
    'current_period_end', v_sub.current_period_end,
    'trial_ends_at', NULL,
    'is_trial_active', NOT v_has_active_sub,
    'is_subscription_expired', v_is_subscription_expired,
    'trial_docs_used', v_free_docs_used,
    'trial_doc_limit', COALESCE(v_company.free_doc_limit, 50),
    'free_window_start', v_window_start,
    'free_window_end', v_window_end,
    'free_doc_limit', COALESCE(v_company.free_doc_limit, 50),
    'free_docs_used', v_free_docs_used,
    'cancel_at_period_end', COALESCE(v_sub.cancel_at_period_end, false),
    'pending_plan', v_sub.pending_plan,
    'pending_plan_effective_date', v_sub.pending_plan_effective_date
  );
END;
$$;

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admin_users' AND policyname='admin_users_no_client_access') THEN
    CREATE POLICY "admin_users_no_client_access" ON admin_users FOR SELECT TO authenticated USING (false);
  END IF;
END $$;
