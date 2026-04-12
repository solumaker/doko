/*
  # Fix: Admin can create documents on behalf of drivers

  ## Problem
  When an admin creates a document for a driver, the document is stored with
  the admin's user ID as creator_id. When the driver later logs in and views
  their dashboard, they filter documents by creator_id = their own user ID,
  so they see nothing.

  ## Changes

  ### Documents INSERT policy
  - Drop the existing INSERT policy that requires creator_id = auth.uid()
  - Add a new INSERT policy that:
    - For regular users (drivers): still requires creator_id = auth.uid()
    - For admins: allows setting creator_id to any profile ID within the same company

  ### Documents UPDATE policy
  - Drop the existing UPDATE policy that requires creator_id = auth.uid()
  - Add a new UPDATE policy that:
    - For regular users (drivers): still requires creator_id = auth.uid()
    - For admins: allows updating any document within their company

  ### Documents DELETE policy
  - Drop the existing DELETE policy that requires creator_id = auth.uid()
  - Add a new DELETE policy that:
    - For regular users (drivers): still requires creator_id = auth.uid()
    - For admins: allows deleting any document within their company

  ## Security
  - Admins can only set creator_id to a profile that belongs to their own company
  - Drivers still can only create/update/delete their own documents
  - The SELECT policy remains unchanged (all company members can read all company docs)
*/

-- Drop old INSERT policy
DROP POLICY IF EXISTS "Users can insert documents in own company" ON documents;

-- New INSERT policy: drivers can only set themselves as creator,
-- admins can set any profile in their company as creator
CREATE POLICY "Users can insert documents in own company"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND (
      -- Regular users must be the creator
      (creator_id = auth.uid())
      OR
      -- Admins can assign any creator from their company
      (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
            AND role = 'admin'
            AND company_id = get_user_company_id()
        )
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE id = creator_id
            AND company_id = get_user_company_id()
        )
      )
    )
  );

-- Drop old UPDATE policy
DROP POLICY IF EXISTS "Users can update own documents" ON documents;

-- New UPDATE policy: drivers can only update their own documents,
-- admins can update any document in their company
CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND (
      creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND company_id = get_user_company_id()
      )
    )
  )
  WITH CHECK (
    company_id = get_user_company_id()
    AND (
      creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND company_id = get_user_company_id()
      )
    )
  );

-- Drop old DELETE policy
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

-- New DELETE policy: drivers can only delete their own documents,
-- admins can delete any document in their company
CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND (
      creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND company_id = get_user_company_id()
      )
    )
  );
