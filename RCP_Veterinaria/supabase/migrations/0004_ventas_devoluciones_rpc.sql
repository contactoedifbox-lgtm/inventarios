-- ============================================================================
-- 0004_ventas_devoluciones_rpc.sql
-- LankaPets v2.0
-- Ventas, devoluciones, anulacion, costos historicos y reporte agregado.
-- El servidor calcula precios, IVA, totales y stock. El cliente nunca los envia.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ventas: una fila por venta o devolucion
-- ---------------------------------------------------------------------------
create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  tipo public.tipo_venta not null default 'venta',
  venta_origen_id uuid references public.ventas (id) on delete restrict,
  vendedor_id uuid not null references public.perfiles (id),
  medio_pago public.medio_pago not null,
  total_neto integer not null default 0 check (total_neto >= 0),
  total_iva integer not null default 0 check (total_iva >= 0),
  total integer not null default 0 check (total >= 0),
  estado public.estado_venta not null default 'completada',
  motivo text,
  anulada_por uuid references public.perfiles (id),
  anulada_at timestamptz,
  created_at timestamptz not null default now()
);

create index ventas_created_at_idx on public.ventas (created_at desc);
create index ventas_vendedor_fecha_idx on public.ventas (vendedor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- venta_items: copia historica al momento de la venta
-- ---------------------------------------------------------------------------
create table public.venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete restrict,
  producto_id uuid not null references public.productos (id) on delete restrict,
  nombre_producto text not null,
  codigo_barras text,
  precio_unitario_neto integer not null check (precio_unitario_neto >= 0),
  iva_unitario integer not null check (iva_unitario >= 0),
  cantidad integer not null check (cantidad > 0),
  total_linea integer not null check (total_linea >= 0),
  reingresa_stock boolean not null default true
);

create index venta_items_venta_idx on public.venta_items (venta_id);
create index venta_items_producto_idx on public.venta_items (producto_id);

-- ---------------------------------------------------------------------------
-- venta_items_costos: solo Maestro
-- ---------------------------------------------------------------------------
create table public.venta_items_costos (
  venta_item_id uuid primary key references public.venta_items (id) on delete cascade,
  costo_unitario_neto integer not null check (costo_unitario_neto >= 0)
);

-- ---------------------------------------------------------------------------
-- Auditoria de anulaciones
-- ---------------------------------------------------------------------------
create trigger trg_ventas_audit
  after update on public.ventas
  for each row execute function private.auditar();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.ventas enable row level security;
alter table public.venta_items enable row level security;
alter table public.venta_items_costos enable row level security;

-- ---------------------------------------------------------------------------
-- GRANTs explicitos: solo lectura; las escrituras van por RPC
-- ---------------------------------------------------------------------------
grant select on public.ventas to authenticated;
grant select on public.venta_items to authenticated;
grant select on public.venta_items_costos to authenticated;

-- ---------------------------------------------------------------------------
-- Politicas
-- ---------------------------------------------------------------------------
create policy ventas_select on public.ventas
  for select to authenticated using (private.es_personal());

create policy venta_items_select on public.venta_items
  for select to authenticated using (private.es_personal());

create policy venta_items_costos_maestro on public.venta_items_costos
  for select to authenticated using (private.es_maestro());

-- ---------------------------------------------------------------------------
-- RPC registrar_venta
-- ---------------------------------------------------------------------------
create or replace function public.registrar_venta(
  p_items jsonb,
  p_medio_pago public.medio_pago
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

  update public.ventas
    set total_neto = v_total_neto,
        total_iva = v_total_iva,
        total = v_total_neto + v_total_iva
    where id = v_venta_id;

  return jsonb_build_object(
    'venta_id', v_venta_id,
    'numero', v_numero,
    'total_neto', v_total_neto,
    'total_iva', v_total_iva,
    'total', v_total_neto + v_total_iva
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC registrar_devolucion
-- ---------------------------------------------------------------------------
create or replace function public.registrar_devolucion(
  p_items jsonb,
  p_medio_pago public.medio_pago,
  p_motivo text,
  p_venta_origen_id uuid default null
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
  v_reingresa boolean;
  v_precio_neto int;
  v_iva int;
  v_total_neto int := 0;
  v_total_iva int := 0;
  v_stock_restante int;
  v_item_id uuid;
begin
  if not private.es_personal() then
    raise exception 'No autorizado';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Debes incluir al menos un producto';
  end if;

  insert into public.ventas (tipo, venta_origen_id, vendedor_id, medio_pago, motivo)
  values ('devolucion', p_venta_origen_id, auth.uid(), p_medio_pago, p_motivo)
  returning id, numero into v_venta_id, v_numero;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
    order by (value ->> 'producto_id')
  loop
    v_cantidad := coalesce((v_item ->> 'cantidad')::int, 0);
    v_reingresa := coalesce((v_item ->> 'reingresa_stock')::boolean, true);

    if v_cantidad <= 0 then
      raise exception 'Cantidad invalida';
    end if;

    select p.id, p.nombre, p.codigo_barras, p.precio_venta_neto, p.iva_precio_venta, p.stock
      into v_producto
      from public.productos p
      where p.id = (v_item ->> 'producto_id')::uuid
      for update;

    if not found then
      raise exception 'Producto no encontrado';
    end if;

    v_precio_neto := v_producto.precio_venta_neto;
    v_iva := v_producto.iva_precio_venta;

    -- Si la devolucion apunta a una venta, usa el precio historico de esa venta.
    if p_venta_origen_id is not null then
      select vi.precio_unitario_neto, vi.iva_unitario
        into v_precio_neto, v_iva
        from public.venta_items vi
        where vi.venta_id = p_venta_origen_id
          and vi.producto_id = v_producto.id
        order by vi.id
        limit 1;

      if not found then
        v_precio_neto := v_producto.precio_venta_neto;
        v_iva := v_producto.iva_precio_venta;
      end if;
    end if;

    insert into public.venta_items
      (venta_id, producto_id, nombre_producto, codigo_barras, precio_unitario_neto,
       iva_unitario, cantidad, total_linea, reingresa_stock)
    values
      (v_venta_id, v_producto.id, v_producto.nombre, v_producto.codigo_barras,
       v_precio_neto, v_iva, v_cantidad, (v_precio_neto + v_iva) * v_cantidad, v_reingresa)
    returning id into v_item_id;

    if v_reingresa then
      update public.productos
        set stock = stock + v_cantidad
        where id = v_producto.id
        returning stock into v_stock_restante;

      insert into public.movimientos_inventario
        (producto_id, tipo, cantidad, stock_resultante, referencia_id, motivo, usuario_id)
      values
        (v_producto.id, 'devolucion', v_cantidad, v_stock_restante, v_venta_id,
         coalesce(p_motivo, 'Devolucion'), auth.uid());
    end if;

    v_total_neto := v_total_neto + v_precio_neto * v_cantidad;
    v_total_iva := v_total_iva + v_iva * v_cantidad;
  end loop;

  update public.ventas
    set total_neto = v_total_neto,
        total_iva = v_total_iva,
        total = v_total_neto + v_total_iva
    where id = v_venta_id;

  return jsonb_build_object(
    'venta_id', v_venta_id,
    'numero', v_numero,
    'total_neto', v_total_neto,
    'total_iva', v_total_iva,
    'total', v_total_neto + v_total_iva
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC anular_venta (solo Maestro): revierte stock y deja auditoria
-- ---------------------------------------------------------------------------
create or replace function public.anular_venta(
  p_venta_id uuid,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venta public.ventas;
  v_item record;
  v_delta int;
  v_stock_restante int;
begin
  if not private.es_maestro() then
    raise exception 'Solo un Maestro puede anular ventas';
  end if;

  select * into v_venta from public.ventas where id = p_venta_id for update;

  if not found then
    raise exception 'Venta no encontrada';
  end if;

  if v_venta.estado = 'anulada' then
    raise exception 'La venta ya esta anulada';
  end if;

  for v_item in
    select * from public.venta_items where venta_id = p_venta_id order by producto_id
  loop
    v_delta := 0;

    if v_venta.tipo = 'venta' then
      v_delta := v_item.cantidad;
    elsif v_item.reingresa_stock then
      v_delta := -v_item.cantidad;
    end if;

    if v_delta <> 0 then
      update public.productos
        set stock = stock + v_delta
        where id = v_item.producto_id
        returning stock into v_stock_restante;

      insert into public.movimientos_inventario
        (producto_id, tipo, cantidad, stock_resultante, referencia_id, motivo, usuario_id)
      values
        (v_item.producto_id, 'anulacion', v_delta, v_stock_restante, p_venta_id,
         coalesce(p_motivo, 'Anulacion'), auth.uid());
    end if;
  end loop;

  update public.ventas
    set estado = 'anulada',
        anulada_por = auth.uid(),
        anulada_at = now(),
        motivo = p_motivo
    where id = p_venta_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC reporte_ventas_productos (SECURITY INVOKER: RLS limita lo visible)
-- ---------------------------------------------------------------------------
create or replace function public.reporte_ventas_productos(
  p_desde timestamptz,
  p_hasta timestamptz,
  p_agrupar text default 'dia'
)
returns table (
  producto_id uuid,
  nombre_producto text,
  periodo date,
  unidades bigint,
  total_neto bigint,
  total_iva bigint,
  total bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    t.producto_id,
    t.nombre_producto,
    t.periodo,
    sum(t.unidades)::bigint,
    sum(t.neto)::bigint,
    sum(t.iva)::bigint,
    sum(t.total)::bigint
  from (
    select
      vi.producto_id,
      vi.nombre_producto,
      date_trunc(
        case p_agrupar
          when 'semana' then 'week'
          when 'mes' then 'month'
          else 'day'
        end,
        v.created_at at time zone 'America/Santiago'
      )::date as periodo,
      case when v.tipo = 'venta' then vi.cantidad else -vi.cantidad end as unidades,
      case when v.tipo = 'venta' then vi.precio_unitario_neto * vi.cantidad
           else -vi.precio_unitario_neto * vi.cantidad end as neto,
      case when v.tipo = 'venta' then vi.iva_unitario * vi.cantidad
           else -vi.iva_unitario * vi.cantidad end as iva,
      case when v.tipo = 'venta' then vi.total_linea else -vi.total_linea end as total
    from public.venta_items vi
    join public.ventas v on v.id = vi.venta_id
    where v.estado = 'completada'
      and v.created_at >= p_desde
      and v.created_at < p_hasta
  ) t
  group by t.producto_id, t.nombre_producto, t.periodo
  order by t.periodo desc, t.nombre_producto;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecucion
-- ---------------------------------------------------------------------------
revoke all on function public.registrar_venta(jsonb, public.medio_pago) from public;
revoke all on function public.registrar_devolucion(jsonb, public.medio_pago, text, uuid) from public;
revoke all on function public.anular_venta(uuid, text) from public;
revoke all on function public.reporte_ventas_productos(timestamptz, timestamptz, text) from public;

grant execute on function public.registrar_venta(jsonb, public.medio_pago) to authenticated;
grant execute on function public.registrar_devolucion(jsonb, public.medio_pago, text, uuid) to authenticated;
grant execute on function public.anular_venta(uuid, text) to authenticated;
grant execute on function public.reporte_ventas_productos(timestamptz, timestamptz, text) to authenticated;