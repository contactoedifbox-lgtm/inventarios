-- ============================================================
-- 007_profile_fks.sql
-- FKs complementarias hacia profiles(id) para permitir embeds
-- directos de PostgREST (ej: costumes → owner:profiles).
-- Los FKs originales a auth.users(id) se mantienen intactos.
-- profiles.id referencia auth.users.id, por lo que el dominio
-- de valores es idéntico y ambas restricciones son compatibles.
-- ============================================================

ALTER TABLE costumes
  ADD CONSTRAINT costumes_owner_profiles_fkey
  FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE rentals
  ADD CONSTRAINT rentals_renter_profiles_fkey
  FOREIGN KEY (renter_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE sales
  ADD CONSTRAINT sales_buyer_profiles_fkey
  FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_admin_profiles_fkey
  FOREIGN KEY (admin_id) REFERENCES profiles(id);

ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_target_profiles_fkey
  FOREIGN KEY (target_user_id) REFERENCES profiles(id);