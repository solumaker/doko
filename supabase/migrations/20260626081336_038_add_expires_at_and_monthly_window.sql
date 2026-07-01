-- Add expires_at to document_packs
ALTER TABLE document_packs ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Helper: compute the next monthly reset boundary given a subscription period_start
CREATE OR REPLACE FUNCTION next_monthly_reset(p_period_start timestamptz, p_now timestamptz DEFAULT now())
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_period_start + (
    (floor(extract(epoch FROM (p_now - p_period_start)) / extract(epoch FROM interval '1 month'))::int + 1)
    * interval '1 month'
  );
$$;

-- Update consume_document_pack_quota to skip expired packs
CREATE OR REPLACE FUNCTION consume_document_pack_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
  v_docs_in_period integer;
  v_total_plan_limit integer;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_pack record;
BEGIN
  SELECT id, document_limit, current_period_start, current_period_end, status
  INTO v_sub
  FROM subscriptions
  WHERE company_id = NEW.company_id
    AND status IN ('active', 'trialing')
  LIMIT 1;

  IF v_sub.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate monthly window
  v_window_start := v_sub.current_period_start + (
    floor(extract(epoch FROM (now() - v_sub.current_period_start)) / extract(epoch FROM interval '1 month'))::int
    * interval '1 month'
  );
  v_window_end := v_window_start + interval '1 month';

  SELECT count(*) INTO v_docs_in_period
  FROM documents
  WHERE company_id = NEW.company_id
    AND created_at >= v_window_start
    AND created_at < v_window_end;

  v_total_plan_limit := COALESCE(v_sub.document_limit, 0);

  IF v_docs_in_period > v_total_plan_limit THEN
    FOR v_pack IN
      SELECT id, documents_remaining
      FROM document_packs
      WHERE company_id = NEW.company_id
        AND documents_remaining > 0
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY purchased_at ASC
      LIMIT 1
    LOOP
      UPDATE document_packs
      SET documents_remaining = documents_remaining - 1
      WHERE id = v_pack.id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Update get_subscription_usage to use monthly window and filter expired packs
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
  v_docs_extra integer;
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
    -- Calculate monthly window within billing period
    v_months_elapsed := floor(extract(epoch FROM (now() - v_sub.current_period_start)) / extract(epoch FROM interval '1 month'))::int;
    IF v_months_elapsed < 0 THEN v_months_elapsed := 0; END IF;
    v_window_start := v_sub.current_period_start + (v_months_elapsed * interval '1 month');
    v_window_end := v_window_start + interval '1 month';

    -- Cap window_end at period_end
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

  -- Only count non-expired packs
  SELECT COALESCE(sum(documents_remaining), 0) INTO v_docs_extra
  FROM document_packs
  WHERE company_id = p_company_id
    AND documents_remaining > 0
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
    'documents_extra_remaining', v_docs_extra,
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
