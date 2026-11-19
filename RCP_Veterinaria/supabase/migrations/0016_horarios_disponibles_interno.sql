-- ============================================================================
-- 0016_horarios_disponibles_interno.sql
-- LankaPets v2.0
-- Variante de horarios_disponibles que permite ignorar la anticipacion minima,
-- para que la agenda interna muestre los horarios libres del dia actual
-- (incluidos los que aun no pasan). La version publica de 3 argumentos se
-- mantiene intacta.
-- ============================================================================

create or replace function public.horarios_disponibles(
  p_profesional_id uuid,
  p_desde date,
  p_hasta date,
  p_ignorar_anticipacion boolean default false
)
returns table (inicio timestamptz, fin timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_duracion int;
  v_tz text;
  v_anticipacion int;
  v_max_dias int;
  v_hoy date;
  v_area public.area_agenda;
begin
  select duracion_slot_min, area into v_duracion, v_area
  from public.profesionales
  where id = p_profesional_id and activo;

  if not found then
    return;
  end if;

  select zona_horaria, reserva_anticipacion_min_horas, reserva_max_dias
    into v_tz, v_anticipacion, v_max_dias
    from public.configuracion
    where id = true;

  v_hoy := (now() at time zone v_tz)::date;

  return query
  with dias as (
    select generate_series(
      greatest(p_desde, v_hoy),
      least(p_hasta, v_hoy + v_max_dias),
      interval '1 day'
    )::date as fecha
  ),
  ventanas as (
    select d.fecha,
           (d.fecha + h.hora_inicio) at time zone v_tz as inicio,
           (d.fecha + h.hora_fin) at time zone v_tz as fin_horario
    from dias d
    join public.horarios_semanales h
      on h.profesional_id = p_profesional_id
     and h.dia_semana = extract(isodow from d.fecha)::smallint
    union all
    select e.fecha_desde,
           (e.fecha_desde + e.hora_inicio) at time zone v_tz,
           (e.fecha_desde + e.hora_fin) at time zone v_tz
    from public.excepciones_agenda e
    where e.modo = 'abrir'
      and e.hora_inicio is not null
      and (e.profesional_id = p_profesional_id
           or (e.profesional_id is null and e.area = v_area))
      and e.fecha_desde between greatest(p_desde, v_hoy) and least(p_hasta, v_hoy + v_max_dias)
  ),
  generados as (
    select v.fecha,
           gs as inicio,
           gs + make_interval(mins => v_duracion) as fin
    from ventanas v
    cross join lateral generate_series(
      v.inicio,
      v.fin_horario - make_interval(mins => v_duracion),
      make_interval(mins => v_duracion)
    ) as gs
  )
  select g.inicio, g.fin
  from generados g
  where g.inicio >= now()
    + case
        when p_ignorar_anticipacion then interval '0'
        else make_interval(hours => v_anticipacion)
      end
    and not exists (
      select 1 from public.reservas r
      where r.profesional_id = p_profesional_id
        and r.estado <> 'cancelada'
        and tstzrange(r.inicio, r.fin) && tstzrange(g.inicio, g.fin)
    )
    and not exists (
      select 1 from public.excepciones_agenda e
      where (e.profesional_id = p_profesional_id
             or (e.profesional_id is null and e.area = v_area))
        and g.fecha between e.fecha_desde and e.fecha_hasta
        and e.modo = 'cerrar'
        and (e.hora_inicio is null
             or tstzrange(
                  (g.fecha + e.hora_inicio) at time zone v_tz,
                  (g.fecha + e.hora_fin) at time zone v_tz
                ) && tstzrange(g.inicio, g.fin))
    )
  order by g.inicio;
end;
$$;

revoke all on function public.horarios_disponibles(uuid, date, date, boolean) from public;
revoke execute on function public.horarios_disponibles(uuid, date, date, boolean) from anon;
grant execute on function public.horarios_disponibles(uuid, date, date, boolean) to authenticated;