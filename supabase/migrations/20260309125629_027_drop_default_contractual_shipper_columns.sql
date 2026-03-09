/*
  # Drop default_contractual_shipper columns from companies

  ## Summary
  Removes the four redundant columns that duplicated company identity data.
  The "Transportista Efectivo" section in Configuracion now reads/writes
  directly to the existing core fields: name, cif, address, city.

  ## Changes
  - Drops: default_contractual_shipper_nombre
  - Drops: default_contractual_shipper_nif
  - Drops: default_contractual_shipper_domicilio
  - Drops: default_contractual_shipper_poblacion
*/

ALTER TABLE companies
  DROP COLUMN IF EXISTS default_contractual_shipper_nombre,
  DROP COLUMN IF EXISTS default_contractual_shipper_nif,
  DROP COLUMN IF EXISTS default_contractual_shipper_domicilio,
  DROP COLUMN IF EXISTS default_contractual_shipper_poblacion;
