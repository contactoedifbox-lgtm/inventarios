-- ============================================================================
-- 0003_inventario.sql
-- LankaPets v2.0
-- Productos, costos (solo Maestro), proveedores, ingresos, kardex, vista y RPC.
-- El stock NO se puede escribir con INSERT/UPDATE directo: solo cambia por RPC.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- productos: datos comerciales, sin costos
-- ---------------------------------------------------------------------------
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  codigo_barras text,
  nombre text not null,
  descripcion text,
  stock integer not null default 0 check (stock >= 0),
  stock_minimo integer not null default 0 check (stock_minimo >= 0),
  precio_venta_neto integer not null check (precio_venta_neto >= 0),
  iva_precio_venta integer not null default 0,
  precio_venta_total integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create unique index productos_codigo_barras_key
  on public.productos (codigo_barras)
  where codigo_barras is not null;

create index productos_nombre_idx on public.productos (lower(nombre));

-- ---------------------------------------------------------------------------
-- productos_costos: solo Maestro
-- ---------------------------------------------------------------------------
create table public.productos_costos (
  producto_id uuid primary key references public.productos (id) on delete cascade,
  costo_neto integer not null default 0 check (costo_neto >= 0),
  iva_costo integer not null default 0,
  costo_total integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ---------------------------------------------------------------------------
-- proveedores
-- ---------------------------------------------------------------------------
create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rut text,
  telefono text,
  email text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ---------------------------------------------------------------------------
-- ingresos_inventario: cabecera de una recepcion de mercaderia
-- ---------------------------------------------------------------------------
create table public.ingresos_inventario (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid references public.proveedores (id) on delete set null,
  documento_referencia text,
  notas text,
  usuario_id uuid references public.perfiles (id),
  created_at timestamptz not null default now()
);

create table public.ingreso_items (
  id uuid primary key default gen_random_uuid(),
  ingreso_id uuid not null references public.ingresos_inventario (id) on delete restrict,
  producto_id uuid not null references public.productos (id) on delete restrict,
  cantidad integer not null check (cantidad > 0)
);

-- ---------------------------------------------------------------------------
-- movimientos_inventario: kardex, solo se agrega
-- ---------------------------------------------------------------------------
create table public.movimientos_inventario (
  id bigint generated always as identity primary key,
  producto_id uuid not null references public.productos (id) on delete restrict,
  tipo public.tipo_movimiento not null,
  cantidad integer not null check (cantidad <> 0),
  stock_resultante integer not null check (stock_resultante >= 0),
  referencia_id uuid,
  motivo text,
  usuario_id uuid references public.perfiles (id),
  created_at timestamptz not null default now()
);

create index movimientos_producto_fecha_idx
  on public.movimientos_inventario (producto_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers de IVA (el cliente nunca envia estos valores)
-- ---------------------------------------------------------------------------
create or replace function private.calcular_iva_producto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_iva numeric;
begin
  select iva_porcentaje into v_iva from public.configuracion where id = true;
  new.iva_precio_venta := round(new.precio_venta_neto * v_iva / 100);
  new.precio_venta_total := new.precio_venta_neto + new.iva_precio_venta;
  return new;
end;
$$;

create or replace function private.calcular_iva_costo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_iva numeric;
begin
  select iva_porcentaje into v_iva from public.configuracion where id = true;
  new.iva_costo := round(new.costo_neto * v_iva / 100);
  new.costo_total := new.costo_neto + new.iva_costo;
  return new;
end;
$$;

create trigger trg_productos_iva
  before insert or update of precio_venta_neto on public.productos
  for each row execute function private.calcular_iva_producto();

create trigger trg_productos_updated_at
  before update on public.productos
  for each row execute function private.set_updated_at();

create trigger trg_productos_audit
  after insert or update or delete on public.productos
  for each row execute function private.auditar();

create trigger trg_costos_iva
  before insert or update of costo_neto on public.productos_costos
  for each row execute function private.calcular_iva_costo();

create trigger trg_costos_updated_at
  before update on public.productos_costos
  for each row execute function private.set_updated_at();

create trigger trg_costos_audit
  after insert or update or delete on public.productos_costos
  for each row execute function private.auditar();

create trigger trg_proveedores_updated_at
  before update on public.proveedores
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.productos enable row level security;
alter table public.productos_costos enable row level security;
alter table public.proveedores enable row level security;
alter table public.ingresos_inventario enable row level security;
alter table public.ingreso_items enable row level security;
alter table public.movimientos_inventario enable row level security;

-- ---------------------------------------------------------------------------
-- GRANTs explicitos
-- ---------------------------------------------------------------------------
-- productos: el Vendedor puede crear y editar, pero NO la columna stock.
revoke all on public.productos from anon, authenticated;
grant select on public.productos to authenticated;
grant insert (codigo_barras, nombre, descripcion, stock_minimo, precio_venta_neto, activo)
  on public.productos to authenticated;
grant update (codigo_barras, nombre, descripcion, stock_minimo, precio_venta_neto, activo)
  on public.productos to authenticated;

-- costos: solo Maestro (RLS filtra filas; el GRANT habilita la tabla)
grant select, insert, update on public.productos_costos to authenticated;

grant select, insert, update on public.proveedores to authenticated;
grant select on public.ingresos_inventario to authenticated;
grant select on public.ingreso_items to authenticated;
grant select on public.movimientos_inventario to authenticated;

-- ---------------------------------------------------------------------------
-- Politicas
-- ---------------------------------------------------------------------------
create policy productos_select on public.productos
  for select to authenticated using (true);

create policy productos_insert on public.productos
  for insert to authenticated with check (private.es_personal());

create policy productos_update on public.productos
  for update to authenticated
  using (private.es_personal())
  with check (private.es_personal());

create policy costos_maestro on public.productos_costos
  for all to authenticated
  using (private.es_maestro())
  with check (private.es_maestro());

create policy proveedores_personal on public.proveedores
  for all to authenticated
  using (private.es_personal())
  with check (private.es_personal());

create policy ingresos_select on public.ingresos_inventario
  for select to authenticated using (private.es_personal());

create policy ingreso_items_select on public.ingreso_items
  for select to authenticated using (private.es_personal());

create policy movimientos_select on public.movimientos_inventario
  for select to authenticated using (private.es_personal());

-- ---------------------------------------------------------------------------
-- Vista de inventario (security_invoker: RLS de las tablas base aplica)
-- Para el Vendedor las columnas de costo llegan nulas.
-- ---------------------------------------------------------------------------
create view public.v_inventario
with (security_invoker = true)
as
select
  p.id,
  p.codigo_barras,
  p.nombre,
  p.descripcion,
  p.stock,
  p.stock_minimo,
  p.precio_venta_neto,
  p.iva_precio_venta,
  p.precio_venta_total,
  p.activo,
  (p.stock <= p.stock_minimo) as stock_bajo,
  c.costo_neto,
  c.iva_costo,
  c.costo_total,
  case
    when c.costo_neto is not null and c.costo_neto > 0
      then p.precio_venta_neto - c.costo_neto
    else null
  end as margen_neto
from public.productos p
left join public.productos_costos c on c.producto_id = p.id;

grant select on public.v_inventario to authenticated;

-- ---------------------------------------------------------------------------
-- RPC registrar_ingreso: suma stock por recepcion y registra kardex
-- ---------------------------------------------------------------------------
create or replace function public.registrar_ingreso(
  p_items jsonb,
  p_proveedor_id uuid default null,
  p_documento text default null,
  p_notas text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingreso_id uuid;
  v_item jsonb;
  v_producto_id uuid;
  v_cantidad int;
  v_stock int;
begin
  if not private.es_personal() then
    raise exception 'No autorizado';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Debes incluir al menos un item';
  end if;

  insert into public.ingresos_inventario (proveedor_id, documento_referencia, notas, usuario_id)
  values (p_proveedor_id, p_documento, p_notas, auth.uid())
  returning id into v_ingreso_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_producto_id := (v_item ->> 'producto_id')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::int;

    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Cantidad invalida para el producto %', v_producto_id;
    end if;

    insert into public.ingreso_items (ingreso_id, producto_id, cantidad)
    values (v_ingreso_id, v_producto_id, v_cantidad);

    update public.productos
      set stock = stock + v_cantidad
      where id = v_producto_id
      returning stock into v_stock;

    if not found then
      raise exception 'Producto no encontrado: %', v_producto_id;
    end if;

    insert into public.movimientos_inventario
      (producto_id, tipo, cantidad, stock_resultante, referencia_id, motivo, usuario_id)
    values
      (v_producto_id, 'ingreso', v_cantidad, v_stock, v_ingreso_id, 'Ingreso de proveedor', auth.uid());
  end loop;

  return v_ingreso_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC ajustar_stock: correccion por conteo fisico (solo Maestro)
-- ---------------------------------------------------------------------------
create or replace function public.ajustar_stock(
  p_producto_id uuid,
  p_nuevo_stock int,
  p_motivo text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actual int;
  v_delta int;
  v_mov bigint;
begin
  if not private.es_maestro() then
    raise exception 'Solo un Maestro puede ajustar stock';
  end if;

  if p_nuevo_stock < 0 then
    raise exception 'El stock no puede ser negativo';
  end if;

  select stock into v_actual from public.productos where id = p_producto_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  v_delta := p_nuevo_stock - v_actual;
  if v_delta = 0 then
    raise exception 'El stock no cambia';
  end if;

  update public.productos set stock = p_nuevo_stock where id = p_producto_id;

  insert into public.movimientos_inventario
    (producto_id, tipo, cantidad, stock_resultante, motivo, usuario_id)
  values
    (p_producto_id, 'ajuste', v_delta, p_nuevo_stock, p_motivo, auth.uid())
  returning id into v_mov;

  return v_mov;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecucion de las RPC
-- ---------------------------------------------------------------------------
revoke all on function public.registrar_ingreso(jsonb, uuid, text, text) from public;
revoke all on function public.ajustar_stock(uuid, int, text) from public;
grant execute on function public.registrar_ingreso(jsonb, uuid, text, text) to authenticated;
grant execute on function public.ajustar_stock(uuid, int, text) to authenticated;
