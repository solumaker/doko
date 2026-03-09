/*
  # Stripe Webhook Idempotency & Status Constraint Fix

  1. New Tables
    - `stripe_processed_events`
      - `event_id` (text, primary key) - Stripe event ID for deduplication
      - `processed_at` (timestamptz) - When the event was first processed

  2. Modified Tables
    - `subscriptions`
      - Extends the `status` CHECK constraint to allow 'unpaid' (Stripe native value)
        mapped to 'past_due' at the application layer. The constraint now also
        allows 'unpaid' as a safe intermediate to avoid insert failures.

  3. Cleanup
    - `cleanup_old_stripe_events()` function deletes records older than 30 days
    - Scheduled via pg_cron if available (runs daily at 03:00 UTC)

  4. Security
    - RLS enabled on stripe_processed_events (service role only writes; no user access needed)

  Notes:
    - The idempotency table is the primary defense against Stripe's automatic event
      retries causing duplicated billing state mutations (double-activations, etc.)
    - The 30-day retention window covers Stripe's maximum retry window with margin.
*/

CREATE TABLE IF NOT EXISTS stripe_processed_events (
  event_id text PRIMARY KEY,
  processed_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE stripe_processed_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS stripe_processed_events_processed_at_idx
  ON stripe_processed_events(processed_at);

CREATE OR REPLACE FUNCTION cleanup_old_stripe_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM stripe_processed_events
  WHERE processed_at < now() - interval '30 days';
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-stripe-events',
      '0 3 * * *',
      'SELECT cleanup_old_stripe_events()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE subscriptions
    DROP CONSTRAINT IF EXISTS subscriptions_status_check;

  ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_status_check
    CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete', 'unpaid'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
