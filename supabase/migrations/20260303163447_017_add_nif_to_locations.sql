/*
  # Add nif column to locations table

  ## Changes
  - `locations` table: new column `nif` (text, default empty string)
    - Stores the tax ID (NIF/CIF) of the company at the location
    - Used for predictive autocomplete when creating documents

  ## Notes
  - Non-destructive migration, existing rows get empty string default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'nif'
  ) THEN
    ALTER TABLE locations ADD COLUMN nif text NOT NULL DEFAULT '';
  END IF;
END $$;
