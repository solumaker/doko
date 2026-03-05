/*
  # Fix: Trial banner persists after user subscribes

  ## Problem
  When a user subscribes to a paid plan while still within the trial period,
  the `is_trial_active` flag remained `true` because it only checked
  `trial_ends_at` (still in the future) and document count — not whether
  a paid subscription already existed.

  ## Fix
  The `get_subscription_usage` function now sets `is_trial_active = false`
  whenever the company has an active or trialing subscription row, regardless
  of whether `trial_ends_at` is still in the future.

  ## Changed
  - `get_subscription_usage`: adds `AND (v_sub.id IS NULL OR v_sub.status NOT IN ('active', 'trialing'))`
    to the `v_is_trial` computation
*/

CREATE OR REPLACE FUNCTION get_subscription_usage(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub subscriptions;
  v_trial_ends_at timestamptz;
  v_company_created_at timestamptz;
  v_docs_used integer;
  v_trial_docs_used integer;
  v_docs_extra integer;
  v_users_count integer;
  v_is_trial_time boolean;
  v_is_trial_docs boolean;
  v_is_trial boolean;
  TRIAL_DOC_LIMIT constant integer := 50;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND company_id = p_company_id
  ) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT trial_ends_at, created_at INTO v_trial_ends_at, v_company_created_at
  FROM companies WHERE id = p_company_id;

  -- Fetch subscription first so we can use it in trial check
  SELECT * INTO v_sub
  FROM subscriptions
  WHERE company_id = p_company_id
  LIMIT 1;

  v_is_trial_time := (v_trial_ends_at IS NOT NULL AND v_trial_ends_at > now());

  SELECT count(*) INTO v_trial_docs_used
  FROM documents
  WHERE company_id = p_company_id
    AND created_at >= COALESCE(v_company_created_at, v_trial_ends_at - interval '7 days');

  v_is_trial_docs := (v_trial_docs_used < TRIAL_DOC_LIMIT);

  -- Trial is only active if time and docs allow AND no paid subscription exists
  v_is_trial := v_is_trial_time
    AND v_is_trial_docs
    AND (v_sub.id IS NULL OR v_sub.status NOT IN ('active', 'trialing'));

  IF v_sub.id IS NOT NULL THEN
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
  WHERE company_id = p_company_id
    AND documents_remaining > 0;

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
    'current_period_end', v_sub.current_period_end,
    'trial_ends_at', v_trial_ends_at,
    'is_trial_active', v_is_trial,
    'trial_docs_used', v_trial_docs_used,
    'trial_doc_limit', TRIAL_DOC_LIMIT,
    'cancel_at_period_end', COALESCE(v_sub.cancel_at_period_end, false),
    'pending_plan', v_sub.pending_plan,
    'pending_plan_effective_date', v_sub.pending_plan_effective_date
  );
END;
$$;
