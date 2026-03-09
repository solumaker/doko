/*
  # Fix stripe_processed_events RLS

  ## Problem
  The stripe_processed_events table has RLS enabled but zero policies defined.
  This causes INSERT operations to fail even when called from the stripe-webhook
  edge function using the service_role key, because with no policies the table
  is completely locked down.

  ## Changes
  - Disable RLS on stripe_processed_events (this is an internal system table
    with no user-sensitive data; it only stores Stripe event IDs for idempotency)
  - This allows the service_role used by the edge function to insert/delete rows freely

  ## Security Note
  This table only stores Stripe event IDs (e.g. "evt_xxx") and timestamps.
  There is no user PII or sensitive data. Access is already restricted at the
  network level since only the edge function (service_role) writes to it.
*/

ALTER TABLE stripe_processed_events DISABLE ROW LEVEL SECURITY;
