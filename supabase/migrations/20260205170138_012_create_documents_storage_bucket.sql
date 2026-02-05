/*
  # Create Storage bucket for document PDFs

  1. New Buckets
    - `document-pdfs` - Public bucket to store generated PDF documents
    
  2. Security
    - Allow public read access for anyone (needed for QR code scanning)
    - Only authenticated users can upload/update/delete PDFs
*/

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-pdfs', 'document-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for document PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload document PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own company document PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own company document PDFs" ON storage.objects;

-- Policy for public read access (anyone can download PDFs via QR code)
CREATE POLICY "Public read access for document PDFs"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'document-pdfs');

-- Policy for authenticated users to upload PDFs
CREATE POLICY "Authenticated users can upload document PDFs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'document-pdfs');

-- Policy for authenticated users to update PDFs
CREATE POLICY "Users can update own company document PDFs"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'document-pdfs');

-- Policy for authenticated users to delete PDFs
CREATE POLICY "Users can delete own company document PDFs"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'document-pdfs');
