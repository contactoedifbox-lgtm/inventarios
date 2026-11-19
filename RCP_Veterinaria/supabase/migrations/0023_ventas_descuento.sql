-- ============================================================================
-- 0023_ventas_descuento.sql
-- LankaPets v2.0
-- Agrega descuento y descripcion del descuento a las ventas. El descuento se
-- resta del total final. El servidor sigue calculando neto, IVA y stock.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Columnas nuevas en ventas
-- ---------------------------------------------------------------------------
alter table public.ventas
  add column if not exists descuento integer not null default 0 check (descuento >= 0);

alter table public.ventas
  add column if not exists descripcion_descuento text;

-- ---------------------------------------------------------------------------
-- 2. RPC registrar_venta con descuento
-- ---------------------------------------------------------------------------
drop function if exists public.registrar_venta(jsonb, public.medio_pago);

create or replace function public.registrar_venta(
  p_items jsonb,
  p_medio_pago public.medio_pago,
  p_descuento integer default 0,
  p_descripcion_descuento text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venta_id uuid;
  v_numero bigint;
  v_item jsonb;
  v_producto record;
  v_cantidad int;
  v_total_neto int := 0;
  v_total_iva int := 0;
  v_total int;
  v_descuento int;
  v_stock_restante int;
  v_item_id uuid;
  v_costo int;
begin
  if not private.es_personal() then
    raise exception 'No autorizado';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Debes incluir al menos un producto';
  end if;

  v_descuento := coalesce(p_descuento, 0);
  if v_descuento < 0 then
    raise exception 'El descuento no puede ser negativo';
  end if;

  insert into public.ventas (tipo, vendedor_id, medio_pago)
  values ('venta', auth.uid(), p_medio_pago)
  returning id, numero into v_venta_id, v_numero;

  -- Orden por producto para tomar locks en un orden estable y evitar deadlocks.
  for v_item in
    select value
    from jsonb_array_elements(p_items)
    order by (value ->> 'producto_id')
  loop
    v_cantidad := coalesce((v_item ->> 'cantidad')::int, 0);
    if v_cantidad <= 0 then
      raise exception 'Cantidad invalida';
    end if;

    select p.id, p.nombre, p.codigo_barras, p.precio_venta_neto, p.iva_precio_venta, p.stock, p.activo
      into v_producto
      from public.productos p
      where p.id = (v_item ->> 'producto_id')::uuid
      for update;

    if not found then
      raise exception 'Producto no encontrado';
    end if;

    if not v_producto.activo then
      raise exception 'Producto inactivo: %', v_producto.nombre;
    end if;

    if v_producto.stock < v_cantidad then
      raise exception 'Stock insuficiente para % (disponible %)', v_producto.nombre, v_producto.stock;
    end if;

    insert into public.venta_items
      (venta_id, producto_id, nombre_producto, codigo_barras, precio_unitario_neto,
       iva_unitario, cantidad, total_linea, reingresa_stock)
    values
      (v_venta_id, v_producto.id, v_producto.nombre, v_producto.codigo_barras,
       v_producto.precio_venta_neto, v_producto.iva_precio_venta, v_cantidad,
       (v_producto.precio_venta_neto + v_producto.iva_precio_venta) * v_cantidad, true)
    returning id into v_item_id;

    update public.productos
      set stock = stock - v_cantidad
      where id = v_producto.id
      returning stock into v_stock_restante;

    insert into public.movimientos_inventario
      (producto_id, tipo, cantidad, stock_resultante, referencia_id, motivo, usuario_id)
    values
      (v_producto.id, 'venta', -v_cantidad, v_stock_restante, v_venta_id, 'Venta', auth.uid());

    -- Copia del costo vigente solo para el Maestro.
    if private.es_maestro() then
      select costo_neto into v_costo
      from public.productos_costos
      where producto_id = v_producto.id;

      if v_costo is not null then
        insert into public.venta_items_costos (venta_item_id, costo_unitario_neto)
        values (v_item_id, v_costo);
      end if;
    end if;

    v_total_neto := v_total_neto + v_producto.precio_venta_neto * v_cantidad;
    v_total_iva := v_total_iva + v_producto.iva_precio_venta * v_cantidad;
  end loop;

  v_total := v_total_neto + v_total_iva;

  if v_descuento > v_total then
    raise exception 'El descuento no puede superar el total de la venta';
  end if;

  update public.ventas
    set total_neto = v_total_neto,
        total_iva = v_total_iva,
        descuento = v_descuento,
        descripcion_descuento = nullif(btrim(coalesce(p_descripcion_descuento, '')), ''),
        total = v_total - v_descuento
    where id = v_venta_id;

  return jsonb_build_object(
    'venta_id', v_venta_id,
    'numero', v_numero,
    'total_neto', v_total_neto,
    'total_iva', v_total_iva,
    'descuento', v_descuento,
    'total', v_total - v_descuento
  );
end;
$$;

revoke all on function public.registrar_venta(jsonb, public.medio_pago, integer, text) from public;
grant execute on function public.registrar_venta(jsonb, public.medio_pago, integer, text) to authenticated;
