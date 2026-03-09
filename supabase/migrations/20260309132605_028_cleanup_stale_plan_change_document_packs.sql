/*
  # Clean up stale plan-change document packs

  ## Summary
  Removes document_packs rows that were automatically created by the downgrade
  carry-over logic for the test company. These packs were inflating the displayed
  document limit (showing 1098 instead of 100 for the Autonomo plan).

  ## Changes
  - Deletes all document_packs with stripe_payment_intent_id starting with
    'plan_change_' for company_id = '334f70de-8c4c-4106-98ab-fbf4931409c8'

  ## Notes
  - Only affects the specific test company identified in the database
  - The downgrade carry-over feature is being removed entirely, so these packs
    should no longer be created going forward
*/

DELETE FROM document_packs
WHERE company_id = '334f70de-8c4c-4106-98ab-fbf4931409c8'
  AND stripe_payment_intent_id LIKE 'plan_change_%';
