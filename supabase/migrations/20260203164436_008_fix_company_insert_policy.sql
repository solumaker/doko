/*
  # Fix Company Registration Policy
  
  1. Changes
    - Drop existing INSERT policy for companies
    - Create new unrestricted INSERT policy for authenticated users
    - This allows users to create a company during registration before they have a profile
  
  2. Security Notes
    - Users can only create companies, not read/update others' companies
    - Once a profile is created, all other policies work normally
*/

DROP POLICY IF EXISTS "Users can create own company during registration" ON companies;

CREATE POLICY "Allow authenticated users to create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);