/*
  # Add configuration fields to companies table

  1. Changes to `companies` table
    - `driver_doc_visibility_days` (integer, nullable) - Number of days after document creation
      during which drivers can see their documents. NULL means no day limit (always visible
      if not manually hidden). Defaults to NULL.
    - `default_contractual_shipper_nombre` (text) - Default contractual shipper name for new documents
    - `default_contractual_shipper_nif` (text) - Default contractual shipper NIF/CIF
    - `default_contractual_shipper_domicilio` (text) - Default contractual shipper address
    - `default_contractual_shipper_poblacion` (text) - Default contractual shipper city/town

  2. Notes
    - All new columns are nullable so existing companies are unaffected
    - The driver_doc_visibility_days filter is applied at application level when loading
      driver documents: a driver sees a document only if it was created within the last
      N days (where N = driver_doc_visibility_days), AND it is not manually hidden.
    - NULL means "no day restriction", documents are always visible (unless manually hidden).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'driver_doc_visibility_days'
  ) THEN
    ALTER TABLE companies ADD COLUMN driver_doc_visibility_days integer DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'default_contractual_shipper_nombre'
  ) THEN
    ALTER TABLE companies ADD COLUMN default_contractual_shipper_nombre text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'default_contractual_shipper_nif'
  ) THEN
    ALTER TABLE companies ADD COLUMN default_contractual_shipper_nif text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'default_contractual_shipper_domicilio'
  ) THEN
    ALTER TABLE companies ADD COLUMN default_contractual_shipper_domicilio text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'default_contractual_shipper_poblacion'
  ) THEN
    ALTER TABLE companies ADD COLUMN default_contractual_shipper_poblacion text DEFAULT '';
  END IF;
END $$;
