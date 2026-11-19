-- ============================================================================
-- Pruebas de RLS: clientes y mascotas
-- Ejecutar con: supabase test db  (o psql contra la base de desarrollo)
-- Cada bloque falla con excepcion si la politica no se cumple.
-- ============================================================================

-- 1. anon NO puede leer clientes
begin;
set local role anon;
do $$
begin
  begin
    perform count(*) from public.clientes;
    raise exception 'FALLO: anon pudo leer clientes';
  exception
    when insufficient_privilege then
      raise notice 'OK: anon no puede leer clientes';
  end;
end $$;
rollback;

-- 2. anon NO puede leer mascotas
begin;
set local role anon;
do $$
begin
  begin
    perform count(*) from public.mascotas;
    raise exception 'FALLO: anon pudo leer mascotas';
  exception
    when insufficient_privilege then
      raise notice 'OK: anon no puede leer mascotas';
  end;
end $$;
rollback;

-- 3. anon NO puede leer productos_costos
begin;
set local role anon;
do $$
begin
  begin
    perform count(*) from public.productos_costos;
    raise exception 'FALLO: anon pudo leer productos_costos';
  exception
    when insufficient_privilege then
      raise notice 'OK: anon no puede leer productos_costos';
  end;
end $$;
rollback;

-- 4. anon NO puede leer intentos_reserva_publica
begin;
set local role anon;
do $$
begin
  begin
    perform count(*) from public.intentos_reserva_publica;
    raise exception 'FALLO: anon pudo leer intentos_reserva_publica';
  exception
    when insufficient_privilege then
      raise notice 'OK: anon no puede leer intentos_reserva_publica';
  end;
end $$;
rollback;
