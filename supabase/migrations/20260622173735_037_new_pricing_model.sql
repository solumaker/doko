/*
  # New pricing model: per-tier slider pricing for Basico & Pro + extra packs

  1. New tables
    - plan_tiers (catalog of available document tiers per plan with stripe price ids)
    - extra_pack_config (per-plan extra pack price)

  2. Modified
    - subscriptions: add billing_cycle, document_tier, stripe_price_id
    - subscriptions plan CHECK extended to include 'basico','pro','grandes_empresas'
    - get_subscription_usage: returns billing_cycle, document_tier, extra_unit_price

  3. Security
    - plan_tiers and extra_pack_config: RLS enabled, public read for authenticated
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'subscriptions' AND constraint_name = 'subscriptions_plan_check'
  ) THEN
    ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_plan_check;
  END IF;
END $$;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('autonomo','pyme','flotas','basico','pro','grandes_empresas'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN billing_cycle text NOT NULL DEFAULT 'monthly'
      CHECK (billing_cycle IN ('monthly','yearly'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'document_tier'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN document_tier integer;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN stripe_price_id text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS plan_tiers (
  plan text NOT NULL CHECK (plan IN ('basico','pro')),
  documents integer NOT NULL,
  price_monthly_eur numeric(10,2),
  price_yearly_eur numeric(10,2),
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  available_monthly boolean NOT NULL DEFAULT true,
  available_yearly boolean NOT NULL DEFAULT true,
  PRIMARY KEY (plan, documents)
);

ALTER TABLE plan_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read plan_tiers" ON plan_tiers;
CREATE POLICY "Authenticated can read plan_tiers"
  ON plan_tiers FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS extra_pack_config (
  plan text PRIMARY KEY CHECK (plan IN ('basico','pro')),
  price_per_10_eur numeric(10,2) NOT NULL,
  stripe_price_id text
);

ALTER TABLE extra_pack_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read extra_pack_config" ON extra_pack_config;
CREATE POLICY "Authenticated can read extra_pack_config"
  ON extra_pack_config FOR SELECT TO authenticated USING (true);

INSERT INTO plan_tiers (plan, documents, price_monthly_eur, price_yearly_eur, stripe_price_id_monthly, stripe_price_id_yearly, available_monthly, available_yearly) VALUES
  ('basico',   100, 10.59,   9.00, 'price_PLACEHOLDER_basico_100_monthly',  'price_PLACEHOLDER_basico_100_yearly',  true,  true),
  ('basico',   200, 18.82,  16.00, 'price_PLACEHOLDER_basico_200_monthly',  'price_PLACEHOLDER_basico_200_yearly',  true,  true),
  ('basico',   400, 34.12,  29.00, 'price_PLACEHOLDER_basico_400_monthly',  'price_PLACEHOLDER_basico_400_yearly',  true,  true),
  ('basico',   800, 64.71,  55.00, 'price_PLACEHOLDER_basico_800_monthly',  'price_PLACEHOLDER_basico_800_yearly',  true,  true),
  ('basico',  1500,116.47,  99.00, 'price_PLACEHOLDER_basico_1500_monthly', 'price_PLACEHOLDER_basico_1500_yearly', true,  true),
  ('basico',  3000,214.31, 182.16, 'price_PLACEHOLDER_basico_3000_monthly', 'price_PLACEHOLDER_basico_3000_yearly', true,  true),
  ('basico',  5000, NULL,    NULL, NULL, NULL, false, false),
  ('basico',  7500, NULL,    NULL, NULL, NULL, false, false),
  ('basico', 10000, NULL,    NULL, NULL, NULL, false, false),
  ('pro',      100, 18.82,  16.00, 'price_PLACEHOLDER_pro_100_monthly',  'price_PLACEHOLDER_pro_100_yearly',  true,  true),
  ('pro',      200, 34.12,  29.00, 'price_PLACEHOLDER_pro_200_monthly',  'price_PLACEHOLDER_pro_200_yearly',  true,  true),
  ('pro',      400, 62.25,  53.00, 'price_PLACEHOLDER_pro_400_monthly',  'price_PLACEHOLDER_pro_400_yearly',  true,  true),
  ('pro',      800,107.06,  91.00, 'price_PLACEHOLDER_pro_800_monthly',  'price_PLACEHOLDER_pro_800_yearly',  true,  true),
  ('pro',     1500,180.53, 153.45, 'price_PLACEHOLDER_pro_1500_monthly', 'price_PLACEHOLDER_pro_1500_yearly', true,  true),
  ('pro',     3000,315.93, 268.54, 'price_PLACEHOLDER_pro_3000_monthly', 'price_PLACEHOLDER_pro_3000_yearly', true,  true),
  ('pro',     5000,482.67, 410.27, 'price_PLACEHOLDER_pro_5000_monthly', 'price_PLACEHOLDER_pro_5000_yearly', true,  true),
  ('pro',     7500,678.75, 576.94, 'price_PLACEHOLDER_pro_7500_monthly', 'price_PLACEHOLDER_pro_7500_yearly', true,  true),
  ('pro',    10000,880.86, 748.73, 'price_PLACEHOLDER_pro_10000_monthly','price_PLACEHOLDER_pro_10000_yearly',true,  true)
ON CONFLICT (plan, documents) DO NOTHING;

INSERT INTO extra_pack_config (plan, price_per_10_eur, stripe_price_id) VALUES
  ('basico', 1.09, 'price_PLACEHOLDER_extra_basico'),
  ('pro',    1.79, 'price_PLACEHOLDER_extra_pro')
ON CONFLICT (plan) DO NOTHING;

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
    'trial_ends_at', v_trial_ends_at,
    'is_trial_active', v_is_trial,
    'is_subscription_expired', false,
    'free_doc_limit', v_free_doc_limit,
    'free_docs_used', v_free_docs_used,
    'free_window_start', v_free_window_start,
    'free_window_end', v_free_window_end,
    'trial_docs_used', v_free_docs_used,
    'trial_doc_limit', v_free_doc_limit,
    'cancel_at_period_end', false,
    'pending_plan', NULL,
    'pending_plan_effective_date', NULL,
    'extra_unit_price', v_extra_unit_price
  );
END;
$$;
