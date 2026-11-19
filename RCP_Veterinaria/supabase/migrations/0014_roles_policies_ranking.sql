-- ============================================================================
-- 0014_roles_policies_ranking.sql
-- LankaPets v2.0
-- Ajusta los helpers de rol, las politicas por rol, la ocupacion publica de la
-- agenda y el ranking de productos mas y menos vendidos.
-- ============================================================================

-- es_personal: solo Maestro y Vendedor (el Cliente ya no cuenta como personal).
create or replace function private.es_personal()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = auth.uid()
      and p.activo
      and p.rol in ('maestro', 'vendedor')
  );
$$;

create or replace function private.es_cliente()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = auth.uid()
      and p.activo
      and p.rol = 'cliente'
  );
$$;

revoke all on function private.es_cliente() from public;
grant execute on function private.es_cliente() to authenticated;

-- profesionales: lectura para personal y clientes; escritura solo Maestro.
drop policy if exists profesionales_personal on public.profesionales;
drop policy if exists profesionales_select on public.profesionales;
drop policy if exists profesionales_insert_maestro on public.profesionales;
drop policy if exists profesionales_update_maestro on public.profesionales;
drop policy if exists profesionales_delete_maestro on public.profesionales;

create policy profesionales_select on public.profesionales
  for select to authenticated
  using (private.es_personal() or private.es_cliente());

create policy profesionales_insert_maestro on public.profesionales
  for insert to authenticated with check (private.es_maestro());

create policy profesionales_update_maestro on public.profesionales
  for update to authenticated
  using (private.es_maestro()) with check (private.es_maestro());

create policy profesionales_delete_maestro on public.profesionales
  for delete to authenticated using (private.es_maestro());

-- horarios_semanales: lectura para personal y clientes; escritura solo Maestro.
drop policy if exists horarios_personal on public.horarios_semanales;
drop policy if exists horarios_select on public.horarios_semanales;
drop policy if exists horarios_write_maestro on public.horarios_semanales;

create policy horarios_select on public.horarios_semanales
  for select to authenticated
  using (private.es_personal() or private.es_cliente());

create policy horarios_write_maestro on public.horarios_semanales
  for all to authenticated
  using (private.es_maestro()) with check (private.es_maestro());

-- excepciones_agenda: lectura para personal y clientes; escritura solo Maestro.
drop policy if exists excepciones_personal on public.excepciones_agenda;
drop policy if exists excepciones_select on public.excepciones_agenda;
drop policy if exists excepciones_write_maestro on public.excepciones_agenda;

create policy excepciones_select on public.excepciones_agenda
  for select to authenticated
  using (private.es_personal() or private.es_cliente());

create policy excepciones_write_maestro on public.excepciones_agenda
  for all to authenticated
  using (private.es_maestro()) with check (private.es_maestro());

-- Ocupacion de la agenda sin datos personales (para el rol cliente).
create or replace function public.agenda_ocupacion(p_desde timestamptz, p_hasta timestamptz)
returns table (profesional_id uuid, inicio timestamptz, fin timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.profesional_id, r.inicio, r.fin
  from public.reservas r
  where r.estado <> 'cancelada'
    and r.inicio >= p_desde
    and r.inicio < p_hasta;
$$;

-- Ranking de productos: unidades y monto en el rango, ultima venta y dias detenido.
create or replace function public.ranking_productos(p_desde timestamptz, p_hasta timestamptz)
returns table (
  producto_id uuid,
  nombre text,
  unidades bigint,
  total bigint,
  ultima_venta timestamptz,
  dias_detenido int
)
language sql
stable
security invoker
set search_path = ''
as $$
  with ventas_rango as (
    select vi.producto_id,
           sum(vi.cantidad)::bigint as unidades,
           sum(vi.total_linea)::bigint as total
    from public.venta_items vi
    join public.ventas v on v.id = vi.venta_id
    where v.estado = 'completada'
      and v.tipo = 'venta'
      and v.created_at >= p_desde
      and v.created_at < p_hasta
    group by vi.producto_id
  ),
  ultima as (
    select vi.producto_id, max(v.created_at) as ultima_venta
    from public.venta_items vi
    join public.ventas v on v.id = vi.venta_id
    where v.estado = 'completada' and v.tipo = 'venta'
    group by vi.producto_id
  )
  select
    p.id,
    p.nombre,
    coalesce(vr.unidades, 0)::bigint,
    coalesce(vr.total, 0)::bigint,
    u.ultima_venta,
    floor(extract(epoch from (now() - coalesce(u.ultima_venta, p.created_at))) / 86400)::int
  from public.productos p
  left join ventas_rango vr on vr.producto_id = p.id
  left join ultima u on u.producto_id = p.id
  where p.activo;
$$;

revoke all on function public.agenda_ocupacion(timestamptz, timestamptz) from public;
revoke all on function public.ranking_productos(timestamptz, timestamptz) from public;
revoke execute on function public.agenda_ocupacion(timestamptz, timestamptz) from anon;
revoke execute on function public.ranking_productos(timestamptz, timestamptz) from anon;
grant execute on function public.agenda_ocupacion(timestamptz, timestamptz) to authenticated;
grant execute on function public.ranking_productos(timestamptz, timestamptz) to authenticated;