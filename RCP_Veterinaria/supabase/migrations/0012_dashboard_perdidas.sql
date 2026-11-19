-- ============================================================================
-- 0012_dashboard_perdidas.sql
-- LankaPets v2.0
-- Agregados para el dashboard y vista de perdidas por devoluciones que no
-- reingresan stock (producto caducado, roto u otro).
-- ============================================================================

-- Resumen del rango: ventas, documentos, reservas e inventario.
create or replace function public.dashboard_resumen(
  p_desde timestamptz,
  p_hasta timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with ventas as (
    select
      coalesce(sum(case when ven.tipo = 'venta' then vi.total_linea else -vi.total_linea end), 0)::bigint as total,
      coalesce(sum(case when ven.tipo = 'venta' then vi.precio_unitario_neto * vi.cantidad else -vi.precio_unitario_neto * vi.cantidad end), 0)::bigint as neto,
      coalesce(sum(case when ven.tipo = 'venta' then vi.iva_unitario * vi.cantidad else -vi.iva_unitario * vi.cantidad end), 0)::bigint as iva,
      coalesce(sum(case when ven.tipo = 'venta' then vi.cantidad else -vi.cantidad end), 0)::bigint as unidades
    from public.venta_items vi
    join public.ventas ven on ven.id = vi.venta_id
    where ven.estado = 'completada'
      and ven.created_at >= p_desde
      and ven.created_at < p_hasta
  ),
  documentos as (
    select
      count(*) filter (where tipo = 'venta')::bigint as ventas,
      count(*) filter (where tipo = 'devolucion')::bigint as devoluciones
    from public.ventas
    where estado = 'completada'
      and created_at >= p_desde
      and created_at < p_hasta
  ),
  reservas as (
    select
      count(*)::bigint as total,
      count(*) filter (where estado = 'confirmada')::bigint as confirmadas,
      count(*) filter (where estado = 'completada')::bigint as completadas
    from public.reservas
    where inicio >= p_desde
      and inicio < p_hasta
  ),
  inventario as (
    select
      count(*)::bigint as productos,
      coalesce(sum(stock), 0)::bigint as stock_total,
      count(*) filter (where stock <= 3)::bigint as stock_bajo,
      count(*) filter (where stock = 0)::bigint as agotados
    from public.productos
    where activo
  )
  select jsonb_build_object(
    'ventas', (select to_jsonb(ventas) from ventas),
    'documentos', (select to_jsonb(documentos) from documentos),
    'reservas', (select to_jsonb(reservas) from reservas),
    'inventario', (select to_jsonb(inventario) from inventario)
  );
$$;

-- Conteo de reservas del dia, semana y mes en curso (America/Santiago).
create or replace function public.reservas_resumen()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with limites as (
    select
      (date_trunc('day', now() at time zone 'America/Santiago')) at time zone 'America/Santiago' as dia_ini,
      (date_trunc('week', now() at time zone 'America/Santiago')) at time zone 'America/Santiago' as semana_ini,
      (date_trunc('month', now() at time zone 'America/Santiago')) at time zone 'America/Santiago' as mes_ini
  )
  select jsonb_build_object(
    'dia', (select count(*) from public.reservas, limites l
            where inicio >= l.dia_ini and inicio < l.dia_ini + interval '1 day'),
    'semana', (select count(*) from public.reservas, limites l
               where inicio >= l.semana_ini and inicio < l.semana_ini + interval '7 days'),
    'mes', (select count(*) from public.reservas, limites l
            where inicio >= l.mes_ini and inicio < l.mes_ini + interval '1 month')
  );
$$;

-- Perdidas: devoluciones completadas cuyos items NO reingresan al stock.
create or replace view public.v_perdidas
with (security_invoker = true)
as
select
  v.id as venta_id,
  v.numero,
  v.created_at,
  v.motivo,
  v.vendedor_id,
  vi.id as venta_item_id,
  vi.producto_id,
  vi.nombre_producto,
  vi.codigo_barras,
  vi.cantidad,
  vi.precio_unitario_neto,
  vi.iva_unitario,
  vi.total_linea
from public.ventas v
join public.venta_items vi on vi.venta_id = v.id
where v.tipo = 'devolucion'
  and v.estado = 'completada'
  and vi.reingresa_stock = false;

revoke all on function public.dashboard_resumen(timestamptz, timestamptz) from public;
revoke all on function public.reservas_resumen() from public;
revoke execute on function public.dashboard_resumen(timestamptz, timestamptz) from anon;
revoke execute on function public.reservas_resumen() from anon;
grant execute on function public.dashboard_resumen(timestamptz, timestamptz) to authenticated;
grant execute on function public.reservas_resumen() to authenticated;
grant select on public.v_perdidas to authenticated;