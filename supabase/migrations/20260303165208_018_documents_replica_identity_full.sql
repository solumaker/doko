/*
  # Enable REPLICA IDENTITY FULL on documents table

  ## Problem
  Supabase Realtime postgres_changes for UPDATE events requires REPLICA IDENTITY FULL
  to include updated column values in the payload. With the default REPLICA IDENTITY
  (primary key only), UPDATE payloads do NOT include changed column values like
  pdf_url and pdf_original_url, so Realtime listeners never receive the data needed
  to update the UI.

  ## Change
  - Set REPLICA IDENTITY FULL on the documents table so that all column values
    are included in UPDATE event payloads sent via Supabase Realtime.
*/

ALTER TABLE documents REPLICA IDENTITY FULL;
