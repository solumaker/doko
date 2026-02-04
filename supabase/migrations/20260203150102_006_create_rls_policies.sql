/*
  # Create RLS Policies for Multi-tenant Security
  
  1. Helper Function
    - `get_user_company_id()` - Returns the company_id for the current authenticated user
  
  2. Policies
    - All tables: Users can only access rows where company_id matches their profile's company_id
    - profiles: Users can read their own profile and other profiles in their company
    - companies: Users can read/update their own company
  
  3. Security Notes
    - All policies require authentication
    - All policies check company_id through the profiles table
    - INSERT policies ensure new rows are created with the user's company_id
*/

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$;

-- Companies Policies
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (id = get_user_company_id());

CREATE POLICY "Admins can update own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (id = get_user_company_id())
  WITH CHECK (id = get_user_company_id());

-- Profiles Policies
CREATE POLICY "Users can view profiles in own company"
  ON profiles FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can insert profiles in own company"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles in own company"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Locations Policies
CREATE POLICY "Users can view locations in own company"
  ON locations FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert locations in own company"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update locations in own company"
  ON locations FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete locations in own company"
  ON locations FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id());

-- Vehicles Policies
CREATE POLICY "Users can view vehicles in own company"
  ON vehicles FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert vehicles in own company"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update vehicles in own company"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete vehicles in own company"
  ON vehicles FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id());

-- Documents Policies
CREATE POLICY "Users can view documents in own company"
  ON documents FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert documents in own company"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND creator_id = auth.uid()
  );

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND creator_id = auth.uid()
  )
  WITH CHECK (
    company_id = get_user_company_id()
    AND creator_id = auth.uid()
  );

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND creator_id = auth.uid()
  );