-- ============================================================
-- 005_seed.sql
-- Caporales San Gabriel — Datos iniciales
-- ============================================================
-- NOTA: Reemplaza 'SUPER_ADMIN_UUID' con el UUID real del usuario
-- creado en Supabase Auth (Dashboard → Authentication → Users).
-- Ejecutar DESPUÉS de crear el usuario en Supabase Auth Dashboard.

INSERT INTO profiles (id, full_name, rut, phone, address, city, role)
VALUES (
  'SUPER_ADMIN_UUID',
  'Administrador San Gabriel',
  '12.345.678-9',
  '+56912345678',
  'Dirección Principal 123',
  'Santiago',
  'super_admin'
);

-- Eventos de ejemplo
INSERT INTO events (name, event_date, max_global_rentals, max_user_rentals, created_by) VALUES
  ('Festival Caporales 2026', '2026-10-15', 60, 1, 'SUPER_ADMIN_UUID'),
  ('Encuentro Regional Norte',  '2026-11-20', 40, 1, 'SUPER_ADMIN_UUID');