/*
  # Allow admins to update profiles in their own company

  1. Security Changes
    - Add UPDATE policy on `profiles` so that admin users can update
      driver profiles (e.g. DNI, PIN) belonging to the same company.
    - The existing "Users can update own profile" policy remains untouched.

  2. Important Notes
    - Uses the existing `get_user_company_id()` helper function.
    - Only authenticated users whose profile has `role = 'admin'` can
      use this policy, and only for rows sharing the same `company_id`.
*/

CREATE POLICY "Admins can update profiles in own company"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
