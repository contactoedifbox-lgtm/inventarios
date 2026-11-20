-- ============================================================================
-- 0026_mascotas_cliente_insert.sql
-- LankaPets v2.0
-- Permite que un cliente registre sus propias mascotas desde "Mis datos".
-- El cliente solo puede insertar mascotas asociadas a su propia ficha
-- (cliente_id = private.cliente_id_actual()). El personal sigue pudiendo
-- insertar para cualquier cliente.
-- ============================================================================

create policy mascotas_insert_cliente on public.mascotas
  for insert to authenticated
  with check (cliente_id = private.cliente_id_actual());
