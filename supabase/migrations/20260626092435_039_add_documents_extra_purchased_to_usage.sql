CREATE OR REPLACE FUNCTION get_subscription_usage(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub subscriptions;
  v_trial_ends_at timestamptz;
  v_docs_used integer;
  v_docs_extra_remaining integer;
  v_docs_extra_purchased integer;
  v_users_count integer;
  v_is_trial boolean;
  v_free_window_start timestamptz;
  v_free_window_end timestamptz;
  v_free_docs_used integer;
  v_free_doc_limit integer := 20;
  v_extra_unit_price numeric;
  v_normalized_plan text;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_months_elapsed integer;
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

  SELECT trial_ends_at INTO v_trial_ends_at
  FROM companies WHERE id = p_company_id;

  v_is_trial := (v_trial_ends_at IS NOT NULL AND v_trial_ends_at > now());

  SELECT * INTO v_sub
  FROM subscriptions
  WHERE company_id = p_company_id
  LIMIT 1;

  IF v_sub.id IS NOT NULL THEN
    v_months_elapsed := floor(extract(epoch FROM (now() - v_sub.current_period_start)) / extract(epoch FROM interval '1 month'))::int;
    IF v_months_elapsed < 0 THEN v_months_elapsed := 0; END IF;
    v_window_start := v_sub.current_period_start + (v_months_elapsed * interval '1 month');
    v_window_end := v_window_start + interval '1 month';

    IF v_window_end > v_sub.current_period_end THEN
      v_window_end := v_sub.current_period_end;
    END IF;

    SELECT count(*) INTO v_docs_used
    FROM documents
    WHERE company_id = p_company_id
      AND created_at >= v_window_start
      AND created_at < v_window_end;
  ELSE
    v_docs_used := 0;
    v_window_start := NULL;
    v_window_end := NULL;
  END IF;

  -- Sum of remaining (for canCreate checks)
  SELECT COALESCE(sum(documents_remaining), 0) INTO v_docs_extra_remaining
  FROM document_packs
  WHERE company_id = p_company_id
    AND documents_remaining > 0
    AND (expires_at IS NULL OR expires_at > now());

  -- Sum of total purchased (for display: total monthly capacity)
  SELECT COALESCE(sum(documents_purchased), 0) INTO v_docs_extra_purchased
  FROM document_packs
  WHERE company_id = p_company_id
    AND (expires_at IS NULL OR expires_at > now());

  SELECT count(*) INTO v_users_count
  FROM (
    SELECT id FROM profiles WHERE company_id = p_company_id
    UNION
    SELECT driver_id FROM driver_company_links WHERE company_id = p_company_id AND is_active = true
  ) AS combined_users;

  v_free_window_start := date_trunc('month', now());
  v_free_window_end := (date_trunc('month', now()) + interval '1 month');

  SELECT count(*) INTO v_free_docs_used
  FROM documents
  WHERE company_id = p_company_id
    AND created_at >= v_free_window_start
    AND created_at < v_free_window_end;

  v_normalized_plan := CASE
    WHEN v_sub.plan IN ('basico','autonomo') THEN 'basico'
    WHEN v_sub.plan IN ('pro','pyme','flotas') THEN 'pro'
    ELSE v_sub.plan
  END;

  SELECT price_per_10_eur INTO v_extra_unit_price
  FROM extra_pack_config
  WHERE plan = v_normalized_plan;

  RETURN jsonb_build_object(
    'documents_used', v_docs_used,
    'document_limit', COALESCE(v_sub.document_limit, 0),
    'documents_extra_remaining', v_docs_extra_remaining,
    'documents_extra_purchased', v_docs_extra_purchased,
    'users_count', v_users_count,
    'user_limit', COALESCE(v_sub.user_limit, 0),
    'plan', v_sub.plan,
    'normalized_plan', v_normalized_plan,
    'status', v_sub.status,
    'billing_cycle', COALESCE(v_sub.billing_cycle, 'monthly'),
    'document_tier', v_sub.document_tier,
    'stripe_price_id', v_sub.stripe_price_id,
    'current_period_start', v_sub.current_period_start,
    'current_period_end', v_sub.current_period_end,
    'window_start', v_window_start,
    'window_end', v_window_end,
    'trial_ends_at', v_trial_ends_at,
    'is_trial_active', v_is_trial,
    'is_subscription_expired', false,
    'free_doc_limit', v_free_doc_limit,
    'free_docs_used', v_free_docs_used,
    'free_window_start', v_free_window_start,
    'free_window_end', v_free_window_end,
    'trial_docs_used', v_free_docs_used,
    'trial_doc_limit', v_free_doc_limit,
    'cancel_at_period_end', COALESCE(v_sub.cancel_at_period_end, false),
    'pending_plan', v_sub.pending_plan,
    'pending_plan_effective_date', v_sub.pending_plan_effective_date,
    'extra_unit_price', v_extra_unit_price
  );
END;
$$;
