-- ============================================================================
-- 0028_encargos_productos.sql
-- LankaPets v2.0
-- Encargos (pedidos) de productos sin stock: el cliente pide un producto
-- agotado y el personal lo gestiona (pendiente -> entregado/cancelado).
-- ============================================================================

create table public.encargos_productos (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id) on delete restrict,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  cantidad integer not null check (cantidad > 0),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'entregado', 'cancelado')),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index encargos_productos_perfil_idx on public.encargos_productos (perfil_id, created_at desc);
create index encargos_productos_estado_idx on public.encargos_productos (estado, created_at);

create trigger trg_encargos_productos_updated_at
  before update on public.encargos_productos
  for each row execute function private.set_updated_at();

alter table public.encargos_productos enable row level security;

grant select, insert, update on public.encargos_productos to authenticated;

create policy encargos_productos_select on public.encargos_productos
  for select to authenticated
  using (private.es_personal() or perfil_id = auth.uid());

create policy encargos_productos_insert on public.encargos_productos
  for insert to authenticated
  with check (private.es_personal() or perfil_id = auth.uid());

create policy encargos_productos_update on public.encargos_productos
  for update to authenticated
  using (private.es_personal() or perfil_id = auth.uid())
  with check (private.es_personal() or perfil_id = auth.uid());

create or replace view public.v_encargos_producto
with (security_invoker = true)
as
select
  e.id,
  e.producto_id,
  p.nombre as producto_nombre,
  p.codigo_barras,
  e.perfil_id,
  pf.nombre_completo as perfil_nombre,
  e.cantidad,
  e.estado,
  e.notas,
  e.created_at
from public.encargos_productos e
join public.productos p on p.id = e.producto_id
left join public.perfiles pf on pf.id = e.perfil_id;

grant select on public.v_encargos_producto to authenticated;

create or replace function public.crear_encargo_producto(
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
  v_id uuid;
begin
  if not (private.es_personal() or private.es_cliente()) then
    raise exception 'No autorizado';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'Cantidad invalida';
  end if;

  if not exists (select 1 from public.productos where id = p_producto_id and activo) then
    raise exception 'Producto no encontrado';
  end if;

  insert into public.encargos_productos (producto_id, perfil_id, cantidad, notas)
  values (p_producto_id, auth.uid(), p_cantidad, p_notas)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.cambiar_estado_encargo(p_id uuid, p_estado text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.es_personal() then
    raise exception 'No autorizado';
  end if;
  if p_estado not in ('pendiente', 'entregado', 'cancelado') then
    raise exception 'Estado invalido';
  end if;
  update public.encargos_productos
    set estado = p_estado, updated_by = auth.uid()
    where id = p_id;
end;
$$;

revoke all on function public.crear_encargo_producto(uuid, int, text) from public;
revoke execute on function public.crear_encargo_producto(uuid, int, text) from anon;
grant execute on function public.crear_encargo_producto(uuid, int, text) to authenticated;

revoke all on function public.cambiar_estado_encargo(uuid, text) from public;
revoke execute on function public.cambiar_estado_encargo(uuid, text) from anon;
grant execute on function public.cambiar_estado_encargo(uuid, text) to authenticated;
