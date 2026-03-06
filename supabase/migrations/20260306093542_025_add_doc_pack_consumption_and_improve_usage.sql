/*
  # Document pack consumption trigger + improved get_subscription_usage

  1. New Trigger Function
    - `consume_document_pack_quota()` - Automatically decrements `documents_remaining`
      on the oldest document_pack row when a document is created and the subscription
      plan limit has been exceeded. This ensures purchased extra documents are properly
      consumed instead of being a bottomless pool.

  2. Updated Function
    - `get_subscription_usage(p_company_id)` now returns:
      - `current_period_start` (previously missing, needed for quota calculations)
      - Handles canceled subscriptions whose period has ended (is_subscription_expired)
      - Handles past_due status correctly

  3. Important Notes
    - The trigger fires AFTER INSERT on documents
    - It only decrements packs when subscription plan limit is exceeded
    - During trial, packs are not consumed (trial has its own 50-doc limit)
*/

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
  v_excess integer;
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

  SELECT count(*) INTO v_docs_in_period
  FROM documents
  WHERE company_id = NEW.company_id
    AND created_at >= v_sub.current_period_start
    AND created_at < v_sub.current_period_end;

  v_total_plan_limit := COALESCE(v_sub.document_limit, 0);

  IF v_docs_in_period > v_total_plan_limit THEN
    v_excess := v_docs_in_period - v_total_plan_limit;

    FOR v_pack IN
      SELECT id, documents_remaining
      FROM document_packs
      WHERE company_id = NEW.company_id
        AND documents_remaining > 0
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_consume_doc_pack_quota'
  ) THEN
    CREATE TRIGGER trg_consume_doc_pack_quota
      AFTER INSERT ON documents
      FOR EACH ROW
      EXECUTE FUNCTION consume_document_pack_quota();
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
  v_is_subscription_expired boolean;
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

  v_is_trial := v_is_trial_time
    AND v_is_trial_docs
    AND (v_sub.id IS NULL OR v_sub.status NOT IN ('active', 'trialing'));

  v_is_subscription_expired := false;
  IF v_sub.id IS NOT NULL AND v_sub.status = 'canceled' THEN
    v_is_subscription_expired := true;
  END IF;

  IF v_sub.id IS NOT NULL AND v_sub.status IN ('active', 'trialing', 'past_due') THEN
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
    'current_period_start', v_sub.current_period_start,
    'current_period_end', v_sub.current_period_end,
    'trial_ends_at', v_trial_ends_at,
    'is_trial_active', v_is_trial,
    'is_subscription_expired', v_is_subscription_expired,
    'trial_docs_used', v_trial_docs_used,
    'trial_doc_limit', TRIAL_DOC_LIMIT,
    'cancel_at_period_end', COALESCE(v_sub.cancel_at_period_end, false),
    'pending_plan', v_sub.pending_plan,
    'pending_plan_effective_date', v_sub.pending_plan_effective_date
  );
END;
$$;
