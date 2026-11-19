-- ============================================================================
-- 0001_extensions_tipos_private.sql
-- LankaPets v2.0
-- Extensiones, esquema privado y tipos enumerados.
-- ============================================================================

-- Extensiones requeridas -----------------------------------------------------
-- pgcrypto: gen_random_uuid y hashing
-- citext: emails sin distincion de mayusculas
-- btree_gist: soporte de EXCLUDE con igualdad sobre uuid (anti doble reserva)
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- Esquema privado ------------------------------------------------------------
-- Las funciones auxiliares viven aqui y NO se exponen a la Data API.
create schema if not exists private;

-- Solo el personal autenticado puede invocar los helpers de rol.
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Tipos enumerados -----------------------------------------------------------
create type public.rol_usuario as enum ('maestro', 'vendedor');
create type public.tipo_venta as enum ('venta', 'devolucion');
create type public.estado_venta as enum ('completada', 'anulada');
create type public.medio_pago as enum ('efectivo', 'debito', 'credito', 'transferencia');
create type public.tipo_movimiento as enum ('venta', 'devolucion', 'ingreso', 'ajuste', 'anulacion');
create type public.area_agenda as enum ('veterinaria', 'peluqueria');
create type public.estado_reserva as enum ('confirmada', 'completada', 'cancelada', 'no_asistio');
create type public.origen_reserva as enum ('interno', 'web');
create type public.especie as enum ('perro', 'gato', 'otro');
create type public.modo_excepcion as enum ('cerrar', 'abrir');
