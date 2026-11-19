-- ============================================================================
-- reset_public.sql
-- LankaPets v2.0
--
-- ADVERTENCIA: SCRIPT DESTRUCTIVO.
-- Elimina por completo los esquemas public y private del proyecto Supabase
-- (tablas, vistas, funciones, tipos, triggers y datos) y los recrea vacios.
-- Usar SOLO en el proyecto antiguo que se reutilizara para LankaPets,
-- nunca en un proyecto con datos que se quieran conservar.
--
-- Uso recomendado: ejecutar por MCP (execute_sql o apply_migration) o con
-- psql contra el proyecto, y despues aplicar supabase/migrations/0001..0008.
-- No toca los esquemas auth, storage ni extensions.
-- ============================================================================

begin;

-- Elimina todo lo existente en public y private.
drop schema if exists public cascade;
drop schema if exists private cascade;

-- Recrea los esquemas con los privilegios base de Supabase.
create schema public;
create schema private;

grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

-- El esquema private no se expone a la Data API.
revoke all on schema private from public;
grant usage on schema private to authenticated;

commit;

-- Despues de este script, aplicar en orden:
--   0001_extensions_tipos_private.sql
--   0002_config_perfiles_auditoria.sql
--   0003_inventario.sql
--   0004_ventas_devoluciones_rpc.sql
--   0005_clientes_mascotas.sql
--   0006_agenda.sql
--   0007_publico_antiabuso.sql
--   0008_seed_dev.sql   (solo desarrollo)