/*
  # Anchor the free-plan reset window to the signup date, not the calendar month

  ## Problem
  `get_subscription_usage` computed the free-plan window as
  `date_trunc('month', now())` .. `+ interval '1 month'`, i.e. every account
  resets on the 1st of the calendar month regardless of when it signed up.
  This is a regression: migration 035 originally anchored the reset to
  `companies.free_plan_anchor` (defaulting to `created_at`) with a rolling
  window, but the rewrite in 037/038/039 replaced that with the calendar-month
  version and left `free_plan_anchor` unused ever since.

  Expected behaviour (per product spec): an account created on 22/08 at 12:23
  should show 0 documents used right after signup, count up as documents are
  generated, and reset back to 0 on 22/09 (one month after signup) — not on
  the 1st of the next calendar month.

  ## Fix
  Restore the rolling window, anchored at
  `COALESCE(companies.free_plan_anchor, companies.created_at)`, using the same
  "months elapsed since anchor" math already used for paid subscriptions'
  monthly window in this same function, so both paths behave consistently.

  ## Also in this migration
  - `companies.free_doc_limit` is a dead column since 037 (the function now
    always uses a hardcoded 20 instead of reading it), but it's still shown/
    editable in the admin panel with a stale default of 50. Its default and
    existing values are updated to 20 to match actual enforcement and avoid
    misleading admins into thinking the free limit is 50.
*/

ALTER TABLE companies ALTER COLUMN free_doc_limit SET DEFAULT 20;
UPDATE companies SET free_doc_limit = 20 WHERE free_doc_limit = 50;

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
  v_free_anchor timestamptz;
  v_free_months_elapsed integer;
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

  -- Rolling monthly window anchored at signup (free_plan_anchor, falling
  -- back to created_at), not the calendar month — same math as the paid
  -- subscription window above, so an account created on the 22nd resets on
  -- the 22nd of the next month, not on the 1st.
  SELECT COALESCE(free_plan_anchor, created_at) INTO v_free_anchor
  FROM companies WHERE id = p_company_id;

  v_free_months_elapsed := floor(extract(epoch FROM (now() - v_free_anchor)) / extract(epoch FROM interval '1 month'))::int;
  IF v_free_months_elapsed < 0 THEN v_free_months_elapsed := 0; END IF;
  v_free_window_start := v_free_anchor + (v_free_months_elapsed * interval '1 month');
  v_free_window_end := v_free_window_start + interval '1 month';

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
