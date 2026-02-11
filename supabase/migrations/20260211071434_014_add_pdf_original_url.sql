/*
  # Add pdf_original_url column to documents table

  1. Changes
    - Add `pdf_original_url` column to `documents` table
      - This stores the URL of the original PDF (normal PDF, not PDF/A)
      - The original PDF will be sent to Make.com for conversion to PDF/A-1a
      - The converted PDF/A-1a URL will be stored in the existing `pdf_url` column
  
  2. Notes
    - Using IF NOT EXISTS to prevent errors if column already exists
    - Both pdf_original_url and pdf_url are optional (can be null)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'pdf_original_url'
  ) THEN
    ALTER TABLE documents ADD COLUMN pdf_original_url text;
  END IF;
END $$;