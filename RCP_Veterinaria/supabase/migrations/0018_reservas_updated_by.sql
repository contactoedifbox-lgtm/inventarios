-- ============================================================================
-- 0018_reservas_updated_by.sql
-- LankaPets v2.0
-- La tabla reservas usa el trigger private.set_updated_at(), que escribe
-- updated_by, pero la columna no existia. Se agrega para que las
-- actualizaciones (por ejemplo cancelar una reserva) no fallen.
-- ============================================================================

alter table public.reservas add column if not exists updated_by uuid;