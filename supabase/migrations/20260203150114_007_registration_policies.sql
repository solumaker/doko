/*
  # Registration Policies
  
  1. New Policies
    - Allow authenticated users to create their own initial company
    - Allow authenticated users to create their own initial profile (during registration)
  
  2. Notes
    - These policies enable the public registration flow
    - A user without a profile can create a company and link themselves to it
*/

CREATE POLICY "Users can create own company during registration"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can insert profiles in own company" ON profiles;

CREATE POLICY "Users can create profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR (
      company_id = get_user_company_id()
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );