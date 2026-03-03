/*
  # Add driver DNI and document visibility controls

  1. Changes to `profiles` table
    - Add `dni` column (text, optional) to store driver's national ID

  2. New table `document_visibility`
    - Allows admins to hide documents from specific employees in Historial view
    - Columns: id, document_id (FK), profile_id (FK), hidden_at
    - UNIQUE on (document_id, profile_id)

  3. Security
    - RLS enabled on document_visibility
    - Admins (role='admin') can insert/update/delete visibility records for their company
    - Authenticated users can read their own visibility records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'dni'
  ) THEN
    ALTER TABLE profiles ADD COLUMN dni text DEFAULT '';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS document_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hidden_at timestamptz DEFAULT now(),
  UNIQUE(document_id, profile_id)
);

ALTER TABLE document_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage document visibility for their company"
  ON document_visibility
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND EXISTS (
          SELECT 1 FROM documents
          JOIN profiles creator ON documents.creator_id = creator.id
          WHERE documents.id = document_id
            AND creator.company_id = profiles.company_id
        )
    )
  );

CREATE POLICY "Admins can delete document visibility for their company"
  ON document_visibility
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND EXISTS (
          SELECT 1 FROM documents
          JOIN profiles creator ON documents.creator_id = creator.id
          WHERE documents.id = document_id
            AND creator.company_id = profiles.company_id
        )
    )
  );

CREATE POLICY "Users can read their own visibility records"
  ON document_visibility
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_document_visibility_profile ON document_visibility(profile_id);
CREATE INDEX IF NOT EXISTS idx_document_visibility_document ON document_visibility(document_id);
