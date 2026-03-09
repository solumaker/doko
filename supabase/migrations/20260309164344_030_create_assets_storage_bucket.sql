/*
  # Create assets storage bucket

  Creates a public storage bucket for static assets like logos used in PDF generation.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'assets');

CREATE POLICY "Authenticated users can upload assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'assets');
