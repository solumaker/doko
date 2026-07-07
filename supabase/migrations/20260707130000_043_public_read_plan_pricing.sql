/*
  # Allow public read access to plan pricing catalog

  1. Changes
    - plan_tiers and extra_pack_config: allow `anon` SELECT in addition to `authenticated`,
      since this is public pricing catalog data shown on the subscription page.

  2. Why
    - The subscription page fetches this catalog as soon as the app mounts, which can
      happen before the user's session is attached to outgoing requests (e.g. right after
      a fresh login, or on first load before Supabase Auth finishes initializing). With
      SELECT restricted to `authenticated` only, that fetch silently returns zero rows
      (RLS filters them out, no error is raised), leaving prices blank and every paid plan
      marked "unavailable" for the rest of that session. A full page reload happens to
      "fix" it only because by then the persisted session is already valid when the
      one-shot fetch runs again.
*/

DROP POLICY IF EXISTS "Authenticated can read plan_tiers" ON plan_tiers;
CREATE POLICY "Public can read plan_tiers"
  ON plan_tiers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can read extra_pack_config" ON extra_pack_config;
CREATE POLICY "Public can read extra_pack_config"
  ON extra_pack_config FOR SELECT TO anon, authenticated USING (true);
