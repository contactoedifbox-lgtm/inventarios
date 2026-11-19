-- ============================================================================
-- 0015_reservas_productos.sql
-- LankaPets v2.0
-- Reserva (apartado) de productos por parte de los clientes: tienen 1 dia para
-- retirar; si no, la reserva se cancela/expira.
-- ============================================================================

create table public.reservas_productos (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id) on delete restrict,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  cantidad integer not null check (cantidad > 0),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'retirada', 'cancelada', 'vencida')),
  expira_at timestamptz not null default (now() + interval '1 day'),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index reservas_productos_perfil_idx
  on public.reservas_productos (perfil_id, created_at desc);
create index reservas_productos_estado_idx
  on public.reservas_productos (estado, expira_at);

create trigger trg_reservas_productos_updated_at
  before update on public.reservas_productos
  for each row execute function private.set_updated_at();

alter table public.reservas_productos enable row level security;

grant select, insert, update on public.reservas_productos to authenticated;

create policy reservas_productos_select on public.reservas_productos
  for select to authenticated
  using (private.es_personal() or perfil_id = auth.uid());

create policy reservas_productos_insert on public.reservas_productos
  for insert to authenticated
  with check (private.es_personal() or perfil_id = auth.uid());

create policy reservas_productos_update on public.reservas_productos
  for update to authenticated
  using (private.es_personal() or perfil_id = auth.uid())
  with check (private.es_personal() or perfil_id = auth.uid());

-- Vista con el nombre del producto y del solicitante.
create or replace view public.v_reservas_producto
with (security_invoker = true)
as
select
  r.id,
  r.producto_id,
  p.nombre as producto_nombre,
  p.codigo_barras,
  r.perfil_id,
  pf.nombre_completo as perfil_nombre,
  r.cantidad,
  r.estado,
  r.expira_at,
  r.notas,
  r.created_at
from public.reservas_productos r
join public.productos p on p.id = r.producto_id
left join public.perfiles pf on pf.id = r.perfil_id;

grant select on public.v_reservas_producto to authenticated;

-- Crear reserva (cliente o personal). Valida stock disponible.
create or replace function public.crear_reserva_producto(
  p_producto_id uuid,
  p_cantidad int,
  p_notas text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock int;
  v_id uuid;
begin
  if not (private.es_personal() or private.es_cliente()) then
    raise exception 'No autorizado';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'Cantidad invalida';
  end if;

  select stock into v_stock from public.productos where id = p_producto_id and activo;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  if v_stock < p_cantidad then
    raise exception 'Stock insuficiente (disponible %)', v_stock;
  end if;

  insert into public.reservas_productos (producto_id, perfil_id, cantidad, notas)
  values (p_producto_id, auth.uid(), p_cantidad, p_notas)
  returning id into v_id;

  return v_id;
end;
$$;

-- Cancelar reserva (dueno o personal).
create or replace function public.cancelar_reserva_producto(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reservas_productos
    set estado = 'cancelada'
    where id = p_id
      and estado = 'pendiente'
      and (private.es_personal() or perfil_id = auth.uid());

  if not found then
    raise exception 'Reserva no encontrada o no cancelable';
  end if;
end;
$$;

-- Marcar retirada (solo personal).
create or replace function public.marcar_reserva_retirada(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.es_personal() then
    raise exception 'Solo el personal puede marcar una reserva como retirada';
  end if;

  update public.reservas_productos
    set estado = 'retirada'
    where id = p_id and estado = 'pendiente';

  if not found then
    raise exception 'Reserva no encontrada o no pendiente';
  end if;
end;
$$;

-- Expira las reservas pendientes cuyo plazo vencio (para cron o llamada manual).
create or replace function public.expirar_reservas_producto()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  update public.reservas_productos
    set estado = 'vencida'
    where estado = 'pendiente' and expira_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.crear_reserva_producto(uuid, int, text) from public;
revoke all on function public.cancelar_reserva_producto(uuid) from public;
revoke all on function public.marcar_reserva_retirada(uuid) from public;
revoke all on function public.expirar_reservas_producto() from public;
revoke execute on function public.crear_reserva_producto(uuid, int, text) from anon;
revoke execute on function public.cancelar_reserva_producto(uuid) from anon;
revoke execute on function public.marcar_reserva_retirada(uuid) from anon;
revoke execute on function public.expirar_reservas_producto() from anon;
grant execute on function public.crear_reserva_producto(uuid, int, text) to authenticated;
grant execute on function public.cancelar_reserva_producto(uuid) to authenticated;
grant execute on function public.marcar_reserva_retirada(uuid) to authenticated;
grant execute on function public.expirar_reservas_producto() to authenticated;