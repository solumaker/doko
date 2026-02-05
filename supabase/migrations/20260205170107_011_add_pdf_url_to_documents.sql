/*
  # Add PDF URL to documents table

  1. Changes
    - Add `pdf_url` column to `documents` table to store the public URL of the generated PDF document
    
  2. Notes
    - This column will be populated after the document is created and PDF is generated
    - The PDF URL will be stored in Supabase Storage and made public for QR code scanning
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE documents ADD COLUMN pdf_url text;
  END IF;
END $$;
