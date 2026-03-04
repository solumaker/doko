/*
  # Add Subscription & Billing Tables

  1. Modified Tables
    - `companies`
      - `stripe_customer_id` (text, nullable) - Stripe customer ID
      - `trial_ends_at` (timestamptz) - When the 7-day trial expires

  2. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `company_id` (uuid, FK to companies, unique)
      - `stripe_subscription_id` (text, unique)
      - `plan` (text) - 'autonomo' | 'pyme' | 'flotas'
      - `status` (text) - 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete'
      - `document_limit` (integer) - Monthly document cap per plan
      - `user_limit` (integer) - Max users per plan
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `created_at` / `updated_at`
    - `document_packs`
      - `id` (uuid, primary key)
      - `company_id` (uuid, FK to companies)
      - `stripe_payment_intent_id` (text)
      - `documents_purchased` (integer, default 10)
      - `documents_remaining` (integer, default 10)
      - `purchased_at` (timestamptz)

  3. New Functions
    - `get_subscription_usage(p_company_id uuid)` - Returns document/user usage stats

  4. Modified Functions
    - `register_company_and_user` - Now sets trial_ends_at on company creation

  5. Security
    - RLS enabled on both new tables
    - Admins can only view their own company subscription and packs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE companies ADD COLUMN stripe_customer_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE companies ADD COLUMN trial_ends_at timestamptz DEFAULT (now() + interval '7 days');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  plan text NOT NULL CHECK (plan IN ('autonomo', 'pyme', 'flotas')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  document_limit integer NOT NULL DEFAULT 100,
  user_limit integer NOT NULL DEFAULT 1,
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT subscriptions_company_id_unique UNIQUE (company_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS document_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stripe_payment_intent_id text,
  documents_purchased integer NOT NULL DEFAULT 10,
  documents_remaining integer NOT NULL DEFAULT 10,
  purchased_at timestamptz DEFAULT now()
);

ALTER TABLE document_packs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS subscriptions_company_id_idx ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS document_packs_company_id_idx ON document_packs(company_id);
CREATE INDEX IF NOT EXISTS document_packs_remaining_idx ON document_packs(company_id, documents_remaining) WHERE documents_remaining > 0;

CREATE POLICY "Admins can view own company subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view own company document packs"
  ON document_packs FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

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
    'is_trial_active', v_is_trial
  );
END;
$$;

CREATE OR REPLACE FUNCTION register_company_and_user(
  p_full_name text,
  p_email text,
  p_company_name text,
  p_company_cif text,
  p_company_address text DEFAULT '',
  p_company_city text DEFAULT '',
  p_company_province text DEFAULT '',
  p_company_postal_code text DEFAULT '',
  p_company_phone text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_profile profiles;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
    RETURN jsonb_build_object('error', 'User already has a profile');
  END IF;

  INSERT INTO companies (name, cif, address, city, province, postal_code, phone, trial_ends_at)
  VALUES (p_company_name, p_company_cif, p_company_address, p_company_city,
          p_company_province, p_company_postal_code, p_company_phone, now() + interval '7 days')
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
$$;
