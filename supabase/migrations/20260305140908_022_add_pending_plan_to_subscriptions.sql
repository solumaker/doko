/*
  # Add pending plan change tracking to subscriptions

  1. Changes to `subscriptions` table
    - `cancel_at_period_end` (boolean, default false) - true when the current subscription
      will cancel at period end (used for downgrades or scheduled cancellations)
    - `pending_plan` (text, nullable) - the next plan that will activate at the next
      billing period (set when a user changes plan mid-cycle via Stripe)
    - `pending_plan_effective_date` (timestamptz, nullable) - when the pending plan takes effect
      (mirrors current_period_end at the time the change was scheduled)

  2. Updated function
    - `get_subscription_usage` now returns `cancel_at_period_end`, `pending_plan`, and
      `pending_plan_effective_date` so the frontend can show "Your plan will change to X on DD/MM/YYYY"

  3. Notes
    - No data is deleted; new columns default to safe values
    - The stripe-webhook will populate pending_plan when Stripe fires
      customer.subscription.updated with a schedule or phase change
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'cancel_at_period_end'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'pending_plan'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN pending_plan text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'pending_plan_effective_date'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN pending_plan_effective_date timestamptz DEFAULT NULL;
  END IF;
END $$;

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

  v_is_trial_time := (v_trial_ends_at IS NOT NULL AND v_trial_ends_at > now());

  SELECT count(*) INTO v_trial_docs_used
  FROM documents
  WHERE company_id = p_company_id
    AND created_at >= COALESCE(v_company_created_at, v_trial_ends_at - interval '7 days');

  v_is_trial_docs := (v_trial_docs_used < TRIAL_DOC_LIMIT);

  v_is_trial := v_is_trial_time AND v_is_trial_docs;

  SELECT * INTO v_sub
  FROM subscriptions
  WHERE company_id = p_company_id
  LIMIT 1;

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
