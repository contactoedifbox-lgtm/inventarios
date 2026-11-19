-- ============================================================================
-- 0013_rol_cliente_especialidad.sql
-- LankaPets v2.0
-- Agrega el rol 'cliente' y la especialidad libre de los profesionales.
-- Se separa de 0014 porque ALTER TYPE ... ADD VALUE no puede usarse en la
-- misma transaccion en que se referencia el valor nuevo.
-- ============================================================================

alter type public.rol_usuario add value if not exists 'cliente';

alter table public.profesionales add column if not exists especialidad text;