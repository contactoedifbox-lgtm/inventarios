-- ============================================================================
-- Pruebas de RPC: registrar_venta y anti doble reserva
-- Ejecutar con: supabase test db
-- Requiere un perfil de prueba y un producto con stock.
-- ============================================================================

-- 1. registrar_venta rechaza vender mas que el stock disponible
do $$
declare
  v_producto_id uuid;
  v_perfil_id uuid;
begin
  -- Fixture: perfil y producto de prueba.
  insert into public.perfiles (id, nombre_completo, rol, activo)
  values (gen_random_uuid(), 'Tester', 'maestro', true)
  returning id into v_perfil_id;

  insert into public.productos (nombre, precio_venta_neto, stock)
  values ('Producto test', 1000, 1)
  returning id into v_producto_id;

  -- Simula la sesion del perfil.
  perform set_config('request.jwt.claim.sub', v_perfil_id::text, true);

  begin
    perform public.registrar_venta(
      jsonb_build_array(jsonb_build_object('producto_id', v_producto_id, 'cantidad', 5)),
      'efectivo'
    );
    raise exception 'FALLO: se permitio vender mas que el stock';
  exception
    when others then
      if position('Stock insuficiente' in sqlerrm) = 0 then
        raise;
      end if;
      raise notice 'OK: registrar_venta rechaza sobreventa';
  end;

  -- Limpieza.
  delete from public.movimientos_inventario where producto_id = v_producto_id;
  delete from public.productos where id = v_producto_id;
  delete from public.perfiles where id = v_perfil_id;
end $$;

-- 2. La restriccion EXCLUDE impide solapar reservas del mismo profesional
do $$
declare
  v_profesional_id uuid;
  v_cliente_id uuid;
  v_inicio timestamptz := now() + interval '1 day';
begin
  insert into public.profesionales (nombre, area)
  values ('Vet test', 'veterinaria')
  returning id into v_profesional_id;

  insert into public.clientes (nombres, apellidos, rut, telefono)
  values ('Ana', 'Perez', '12345678-5', '+56912345678')
  returning id into v_cliente_id;

  insert into public.reservas (profesional_id, cliente_id, inicio, fin)
  values (v_profesional_id, v_cliente_id, v_inicio, v_inicio + interval '30 minutes');

  begin
    insert into public.reservas (profesional_id, cliente_id, inicio, fin)
    values (v_profesional_id, v_cliente_id, v_inicio + interval '10 minutes', v_inicio + interval '40 minutes');
    raise exception 'FALLO: se permitio solapar reservas';
  exception
    when exclusion_violation then
      raise notice 'OK: la restriccion EXCLUDE impide solapar reservas';
  end;

  -- Limpieza.
  delete from public.reservas where profesional_id = v_profesional_id;
  delete from public.clientes where id = v_cliente_id;
  delete from public.profesionales where id = v_profesional_id;
end $$;
