-- ============================================================================
-- 0029_encargos_fecha_entrega.sql
-- LankaPets v2.0
-- Agrega la fecha de entrega a los encargos (la ingresa el personal) y una
-- funcion para programarla. La vista expone fecha_entrega para el cliente.
-- ============================================================================

alter table public.encargos_productos
  add column if not exists fecha_entrega date;

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
  e.created_at,
  e.fecha_entrega
from public.encargos_productos e
join public.productos p on p.id = e.producto_id
left join public.perfiles pf on pf.id = e.perfil_id;

grant select on public.v_encargos_producto to authenticated;

create or replace function public.programar_entrega_encargo(p_id uuid, p_fecha date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.es_personal() then
    raise exception 'No autorizado';
  end if;
  update public.encargos_productos
    set fecha_entrega = p_fecha, updated_by = auth.uid()
    where id = p_id;
end;
$$;

revoke all on function public.programar_entrega_encargo(uuid, date) from public;
revoke execute on function public.programar_entrega_encargo(uuid, date) from anon;
grant execute on function public.programar_entrega_encargo(uuid, date) to authenticated;
