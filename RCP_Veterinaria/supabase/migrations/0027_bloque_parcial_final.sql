-- ============================================================================
-- 0027_bloque_parcial_final.sql
-- LankaPets v2.0
-- El ultimo bloque de una jornada puede quedar mas corto que la duracion del
-- slot (ej: jornada 11:30-17:00 con slots de 120 min -> 11:30-13:30, 13:30-15:30
-- y un ultimo bloque de 15:30-17:00 de 90 min). Antes ese ultimo bloque se
-- descartaba; ahora se ofrece y la reserva se ajusta para terminar al final de
-- la jornada (el ajuste siempre va en el ultimo bloque).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: fin de la ventana de atencion que contiene un instante dado.
-- Devuelve null si el instante no cae dentro de ninguna ventana.
-- ---------------------------------------------------------------------------
create or replace function private.fin_ventana(
  p_profesional_id uuid,
  p_inicio timestamptz
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_fecha date;
  v_dow smallint;
  v_hora time;
  v_area public.area_agenda;
  v_fin timestamptz;
begin
  select zona_horaria into v_tz from public.configuracion where id = true;
  v_fecha := (p_inicio at time zone v_tz)::date;
  v_dow := extract(isodow from v_fecha)::smallint;
  v_hora := (p_inicio at time zone v_tz)::time;

  select area into v_area from public.profesionales where id = p_profesional_id;

  select max(fin_local) into v_fin
  from (
    select (v_fecha + h.hora_fin) at time zone v_tz as fin_local
    from public.horarios_semanales h
    where h.profesional_id = p_profesional_id
      and h.dia_semana = v_dow
      and v_hora >= h.hora_inicio
      and v_hora < h.hora_fin
    union all
    select (e.fecha_desde + e.hora_fin) at time zone v_tz
    from public.excepciones_agenda e
    where e.modo = 'abrir'
      and e.hora_inicio is not null
      and (e.profesional_id = p_profesional_id
           or (e.profesional_id is null and e.area = v_area))
      and e.fecha_desde = v_fecha
      and v_hora >= e.hora_inicio
      and v_hora < e.hora_fin
  ) t;

  return v_fin;
end;
$$;

revoke all on function private.fin_ventana(uuid, timestamptz) from public;
grant execute on function private.fin_ventana(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- horarios_disponibles (4 args): incluye el ultimo bloque aunque quede corto.
-- ---------------------------------------------------------------------------
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
           least(gs + make_interval(mins => v_duracion), v.fin_horario) as fin
    from ventanas v
    cross join lateral generate_series(
      v.inicio,
      v.fin_horario - interval '1 second',
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

-- ---------------------------------------------------------------------------
-- horarios_disponibles (3 args, version publica): mismo ajuste.
-- ---------------------------------------------------------------------------
create or replace function public.horarios_disponibles(
  p_profesional_id uuid,
  p_desde date,
  p_hasta date
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
           least(gs + make_interval(mins => v_duracion), v.fin_horario) as fin
    from ventanas v
    cross join lateral generate_series(
      v.inicio,
      v.fin_horario - interval '1 second',
      make_interval(mins => v_duracion)
    ) as gs
  )
  select g.inicio, g.fin
  from generados g
  where g.inicio >= now() + make_interval(hours => v_anticipacion)
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

revoke all on function public.horarios_disponibles(uuid, date, date) from public;
grant execute on function public.horarios_disponibles(uuid, date, date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- crear_reserva_interna: si no se pasa fin, ajusta al fin de la ventana.
-- ---------------------------------------------------------------------------
create or replace function public.crear_reserva_interna(
  p_profesional_id uuid,
  p_cliente_id uuid,
  p_mascota_id uuid,
  p_inicio timestamptz,
  p_fin timestamptz default null,
  p_motivo text default null,
  p_forzar_fuera_horario boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_duracion int;
  v_fin timestamptz;
  v_fin_ventana timestamptz;
  v_reserva_id uuid;
  v_en_horario boolean;
  v_solape boolean;
begin
  if not private.es_personal() then
    raise exception 'No autorizado';
  end if;

  select duracion_slot_min into v_duracion
  from public.profesionales
  where id = p_profesional_id and activo;

  if not found then
    raise exception 'Profesional no encontrado o inactivo';
  end if;

  v_fin_ventana := private.fin_ventana(p_profesional_id, p_inicio);
  v_fin := coalesce(
    p_fin,
    least(
      p_inicio + make_interval(mins => v_duracion),
      coalesce(v_fin_ventana, p_inicio + make_interval(mins => v_duracion))
    )
  );

  if v_fin <= p_inicio then
    raise exception 'El fin debe ser posterior al inicio';
  end if;

  select exists (
    select 1 from public.reservas r
    where r.profesional_id = p_profesional_id
      and r.estado <> 'cancelada'
      and tstzrange(r.inicio, r.fin) && tstzrange(p_inicio, v_fin)
  ) into v_solape;

  if v_solape then
    raise exception 'El profesional ya tiene una reserva en ese horario';
  end if;

  v_en_horario := private.esta_en_horario(p_profesional_id, p_inicio, v_fin);

  if not v_en_horario and not p_forzar_fuera_horario then
    raise exception 'El horario esta fuera de la agenda configurada; confirma la excepcion';
  end if;

  insert into public.reservas
    (profesional_id, cliente_id, mascota_id, inicio, fin, motivo, origen,
     fuera_de_horario, creada_por)
  values
    (p_profesional_id, p_cliente_id, p_mascota_id, p_inicio, v_fin, p_motivo, 'interno',
     not v_en_horario, auth.uid())
  returning id into v_reserva_id;

  return v_reserva_id;
end;
$$;

revoke all on function public.crear_reserva_interna(uuid, uuid, uuid, timestamptz, timestamptz, text, boolean) from public;
grant execute on function public.crear_reserva_interna(uuid, uuid, uuid, timestamptz, timestamptz, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- crear_reserva_cliente: ajusta el fin al fin de la ventana (ultimo bloque).
-- ---------------------------------------------------------------------------
create or replace function public.crear_reserva_cliente(
  p_profesional_id uuid,
  p_mascota_id uuid,
  p_inicio timestamptz,
  p_motivo text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cliente_id uuid;
  v_duracion int;
  v_fin timestamptz;
  v_solape boolean;
  v_en_horario boolean;
  v_reserva_id uuid;
begin
  if not private.es_cliente() then
    raise exception 'Solo un cliente puede usar esta funcion';
  end if;

  v_cliente_id := private.cliente_id_actual();
  if v_cliente_id is null then
    raise exception 'No tienes una ficha de cliente asociada';
  end if;

  select duracion_slot_min into v_duracion
  from public.profesionales
  where id = p_profesional_id and activo;

  if not found then
    raise exception 'Profesional no encontrado o inactivo';
  end if;

  if p_mascota_id is not null then
    if not exists (
      select 1 from public.mascotas
      where id = p_mascota_id and cliente_id = v_cliente_id
    ) then
      raise exception 'La mascota no pertenece al cliente';
    end if;
  end if;

  v_fin := least(
    p_inicio + make_interval(mins => v_duracion),
    coalesce(private.fin_ventana(p_profesional_id, p_inicio), p_inicio + make_interval(mins => v_duracion))
  );

  select exists (
    select 1 from public.reservas r
    where r.profesional_id = p_profesional_id
      and r.estado <> 'cancelada'
      and tstzrange(r.inicio, r.fin) && tstzrange(p_inicio, v_fin)
  ) into v_solape;

  if v_solape then
    raise exception 'El horario ya no esta disponible';
  end if;

  v_en_horario := private.esta_en_horario(p_profesional_id, p_inicio, v_fin);
  if not v_en_horario then
    raise exception 'El horario esta fuera de la agenda configurada';
  end if;

  insert into public.reservas
    (profesional_id, cliente_id, mascota_id, inicio, fin, motivo, origen,
     fuera_de_horario, creada_por)
  values
    (p_profesional_id, v_cliente_id, p_mascota_id, p_inicio, v_fin, p_motivo,
     'interno', false, auth.uid())
  returning id into v_reserva_id;

  return v_reserva_id;
end;
$$;

revoke all on function public.crear_reserva_cliente(uuid, uuid, timestamptz, text) from public;
revoke execute on function public.crear_reserva_cliente(uuid, uuid, timestamptz, text) from anon;
grant execute on function public.crear_reserva_cliente(uuid, uuid, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------
-- crear_reserva_publica: ajusta el fin al fin de la ventana (ultimo bloque).
-- ---------------------------------------------------------------------------
create or replace function public.crear_reserva_publica(
  p_profesional_id uuid,
  p_inicio timestamptz,
  p_motivo text,
  p_cliente jsonb,
  p_mascota jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_duracion int;
  v_area public.area_agenda;
  v_fin timestamptz;
  v_cliente_id uuid;
  v_mascota_id uuid;
  v_reserva_id uuid;
  v_token text;
  v_token_hash text;
  v_max_activas int;
  v_activas int;
  v_solape boolean;
  v_rut text;
begin
  select duracion_slot_min, area into v_duracion, v_area
  from public.profesionales
  where id = p_profesional_id and activo;

  if not found then
    raise exception 'Profesional no encontrado o inactivo';
  end if;

  v_rut := private.normalizar_rut(p_cliente ->> 'rut');

  if not private.validar_rut(v_rut) then
    raise exception 'RUT invalido';
  end if;

  select id into v_cliente_id from public.clientes where rut = v_rut;

  if v_cliente_id is null then
    insert into public.clientes
      (nombres, apellidos, rut, telefono, email, origen, consentimiento_datos_at)
    values
      (p_cliente ->> 'nombres', p_cliente ->> 'apellidos', v_rut,
       p_cliente ->> 'telefono', nullif(p_cliente ->> 'email', '')::extensions.citext,
       'web', now())
    returning id into v_cliente_id;
  else
    update public.clientes
      set telefono = coalesce(nullif(p_cliente ->> 'telefono', ''), telefono),
          email = coalesce(nullif(p_cliente ->> 'email', '')::extensions.citext, email)
      where id = v_cliente_id;
  end if;

  select id into v_mascota_id
  from public.mascotas
  where cliente_id = v_cliente_id
    and lower(nombre) = lower(p_mascota ->> 'nombre')
  limit 1;

  if v_mascota_id is null then
    insert into public.mascotas (cliente_id, nombre, especie, raza, peso_kg)
    values (
      v_cliente_id,
      p_mascota ->> 'nombre',
      (p_mascota ->> 'especie')::public.especie,
      nullif(p_mascota ->> 'raza', ''),
      nullif(p_mascota ->> 'peso_kg', '')::numeric
    )
    returning id into v_mascota_id;
  end if;

  select reserva_max_activas_por_contacto into v_max_activas
  from public.configuracion where id = true;

  select count(*) into v_activas
  from public.reservas
  where cliente_id = v_cliente_id
    and estado = 'confirmada'
    and inicio > now();

  if v_activas >= v_max_activas then
    raise exception 'Ya tienes demasiadas reservas activas';
  end if;

  v_fin := least(
    p_inicio + make_interval(mins => v_duracion),
    coalesce(private.fin_ventana(p_profesional_id, p_inicio), p_inicio + make_interval(mins => v_duracion))
  );

  select exists (
    select 1 from public.reservas r
    where r.profesional_id = p_profesional_id
      and r.estado <> 'cancelada'
      and tstzrange(r.inicio, r.fin) && tstzrange(p_inicio, v_fin)
  ) into v_solape;

  if v_solape then
    raise exception 'El horario ya no esta disponible';
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.reservas
    (profesional_id, cliente_id, mascota_id, inicio, fin, motivo, origen,
     fuera_de_horario, creada_por, token_gestion_hash)
  values
    (p_profesional_id, v_cliente_id, v_mascota_id, p_inicio, v_fin, p_motivo, 'web',
     not private.esta_en_horario(p_profesional_id, p_inicio, v_fin), null, v_token_hash)
  returning id into v_reserva_id;

  return jsonb_build_object(
    'reserva_id', v_reserva_id,
    'token_gestion', v_token
  );
end;
$$;

revoke all on function public.crear_reserva_publica(uuid, timestamptz, text, jsonb, jsonb) from public;
grant execute on function public.crear_reserva_publica(uuid, timestamptz, text, jsonb, jsonb) to service_role;
