-- ============================================================================
-- Pruebas de RLS: ventas y costos
-- Ejecutar con: supabase test db
-- ============================================================================

-- 1. anon NO puede leer ventas
begin;
set local role anon;
do $$
begin
  begin
    perform count(*) from public.ventas;
    raise exception 'FALLO: anon pudo leer ventas';
  exception
    when insufficient_privilege then
      raise notice 'OK: anon no puede leer ventas';
  end;
end $$;
rollback;

-- 2. anon NO puede leer venta_items_costos
begin;
set local role anon;
do $$
begin
  begin
    perform count(*) from public.venta_items_costos;
    raise exception 'FALLO: anon pudo leer venta_items_costos';
  exception
    when insufficient_privilege then
      raise notice 'OK: anon no puede leer venta_items_costos';
  end;
end $$;
rollback;

-- 3. authenticated NO puede insertar ventas directamente (solo por RPC)
begin;
set local role authenticated;
do $$
begin
  begin
    insert into public.ventas (vendedor_id, medio_pago)
    values (gen_random_uuid(), 'efectivo');
    raise exception 'FALLO: authenticated pudo insertar en ventas';
  exception
    when insufficient_privilege then
      raise notice 'OK: authenticated no puede insertar ventas directamente';
  end;
end $$;
rollback;

-- 4. authenticated NO puede actualizar la columna stock de productos
begin;
set local role authenticated;
do $$
begin
  begin
    update public.productos set stock = 999 where true;
    raise exception 'FALLO: authenticated pudo escribir stock directamente';
  exception
    when insufficient_privilege then
      raise notice 'OK: authenticated no puede escribir stock directamente';
  end;
end $$;
rollback;
