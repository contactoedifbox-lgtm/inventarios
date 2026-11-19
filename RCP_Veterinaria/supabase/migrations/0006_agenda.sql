-- ============================================================================
-- 0006_agenda.sql
-- LankaPets v2.0
-- Agenda por profesional: horarios semanales, excepciones, reservas con
-- restriccion EXCLUDE anti doble reserva y RPC de disponibilidad.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profesionales: cada veterinario y peluquero tiene su propia agenda
-- ---------------------------------------------------------------------------
create table public.profesionales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  area public.area_agenda not null,
  perfil_id uuid references public.perfiles (id) on delete set null,
  duracion_slot_min int not null default 30 check (duracion_slot_min between 5 and 240),
  color text,
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ---------------------------------------------------------------------------
-- horarios_semanales: plantilla semanal (varias filas por dia = medios dias)
-- ---------------------------------------------------------------------------
create table public.horarios_semanales (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references public.profesionales (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 1 and 7),
  hora_inicio time not null,
  hora_fin time not null,
  inicio_min int generated always as
    (extract(hour from hora_inicio)::int * 60 + extract(minute from hora_inicio)::int) stored,
  fin_min int generated always as
    (extract(hour from hora_fin)::int * 60 + extract(minute from hora_fin)::int) stored,
  constraint horarios_fin_mayor check (hora_fin > hora_inicio),
  constraint horarios_no_solape exclude using gist (
    profesional_id with =,
    dia_semana with =,
    int4range(inicio_min, fin_min) with &&
  )
);

-- ---------------------------------------------------------------------------
-- excepciones_agenda: feriados, vacaciones, medios dias y horas puntuales
-- ---------------------------------------------------------------------------
create table public.excepciones_agenda (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid references public.profesionales (id) on delete cascade,
  area public.area_agenda,
  fecha_desde date not null,
  fecha_hasta date not null,
  hora_inicio time,
  hora_fin time,
  modo public.modo_excepcion not null default 'cerrar',
  motivo text,
  created_at timestamptz not null default now(),
  constraint excepciones_rango check (fecha_hasta >= fecha_desde),
  constraint excepciones_uno check ((profesional_id is not null) <> (area is not null)),
  constraint excepciones_horas check (
    (hora_inicio is null and hora_fin is null)
    or (hora_inicio is not null and hora_fin is not null and hora_fin > hora_inicio)
  )
);

-- ---------------------------------------------------------------------------
-- reservas
-- ---------------------------------------------------------------------------
create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references public.profesionales (id) on delete restrict,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  mascota_id uuid references public.mascotas (id) on delete set null,
  inicio timestamptz not null,
  fin timestamptz not null,
  estado public.estado_reserva not null default 'confirmada',
  motivo text check (char_length(motivo) <= 500),
  origen public.origen_reserva not null default 'interno',
  fuera_de_horario boolean not null default false,
  creada_por uuid references public.perfiles (id),
  token_gestion_hash text,
  notas_internas text,
  cancelada_at timestamptz,
  cancelada_motivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservas_fin_mayor check (fin > inicio),
  constraint reservas_no_solape exclude using gist (
    profesional_id with =,
    tstzrange(inicio, fin) with &&
  ) where (estado <> 'cancelada')
);

create index reservas_profesional_inicio_idx on public.reservas (profesional_id, inicio);
create index reservas_cliente_idx on public.reservas (cliente_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger trg_profesionales_updated_at
  before update on public.profesionales
  for each row execute function private.set_updated_at();

create trigger trg_profesionales_audit
  after insert or update or delete on public.profesionales
  for each row execute function private.auditar();

create trigger trg_horarios_audit
  after insert or update or delete on public.horarios_semanales
  for each row execute function private.auditar();

create trigger trg_reservas_updated_at
  before update on public.reservas
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profesionales enable row level security;
alter table public.horarios_semanales enable row level security;
alter table public.excepciones_agenda enable row level security;
alter table public.reservas enable row level security;

-- ---------------------------------------------------------------------------
-- GRANTs explicitos
-- ---------------------------------------------------------------------------
grant select, insert, update on public.profesionales to authenticated;
grant select, insert, update, delete on public.horarios_semanales to authenticated;
grant select, insert, update, delete on public.excepciones_agenda to authenticated;
grant select on public.reservas to authenticated;

-- ---------------------------------------------------------------------------
-- Politicas
-- ---------------------------------------------------------------------------
create policy profesionales_personal on public.profesionales
  for all to authenticated
  using (private.es_personal())
  with check (private.es_personal());

create policy horarios_personal on public.horarios_semanales
  for all to authenticated
  using (private.es_personal())
  with check (private.es_personal());

create policy excepciones_personal on public.excepciones_agenda
  for all to authenticated
  using (private.es_personal())
  with check (private.es_personal());

create policy reservas_select on public.reservas
  for select to authenticated using (private.es_personal());

-- ---------------------------------------------------------------------------
-- Helper: indica si un rango cae dentro del horario configurado
-- ---------------------------------------------------------------------------
create or replace function private.esta_en_horario(
  p_profesional_id uuid,
  p_inicio timestamptz,
  p_fin timestamptz
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_fecha date;
  v_dow smallint;
  v_inicio_local timestamp;
  v_fin_local timestamp;
  v_dentro boolean;
  v_cerrado boolean;
begin
  select zona_horaria into v_tz from public.configuracion where id = true;

  v_inicio_local := p_inicio at time zone v_tz;
  v_fin_local := p_fin at time zone v_tz;
  v_fecha := v_inicio_local::date;
  v_dow := extract(isodow from v_fecha)::smallint;

  select exists (
    select 1 from public.horarios_semanales h
    where h.profesional_id = p_profesional_id
      and h.dia_semana = v_dow
      and v_inicio_local::time >= h.hora_inicio
      and v_fin_local::time <= h.hora_fin
  ) into v_dentro;

  select exists (
    select 1 from public.excepciones_agenda e
    where (e.profesional_id = p_profesional_id
           or (e.profesional_id is null
               and e.area = (select area from public.profesionales where id = p_profesional_id)))
      and v_fecha between e.fecha_desde and e.fecha_hasta
      and e.modo = 'cerrar'
      and (e.hora_inicio is null
           or (v_inicio_local::time < e.hora_fin and v_fin_local::time > e.hora_inicio))
  ) into v_cerrado;

  return v_dentro and not v_cerrado;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC crear_reserva_interna
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

  v_fin := coalesce(p_fin, p_inicio + make_interval(mins => v_duracion));

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

-- ---------------------------------------------------------------------------
-- RPC cambiar_estado_reserva
-- ---------------------------------------------------------------------------
create or replace function public.cambiar_estado_reserva(
  p_reserva_id uuid,
  p_estado public.estado_reserva,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.es_personal() then
    raise exception 'No autorizado';
  end if;

  update public.reservas
    set estado = p_estado,
        cancelada_at = case when p_estado = 'cancelada' then now() else cancelada_at end,
        cancelada_motivo = case when p_estado = 'cancelada' then p_motivo else cancelada_motivo end
    where id = p_reserva_id;

  if not found then
    raise exception 'Reserva no encontrada';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC horarios_disponibles (anon y authenticated): solo horas libres
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

-- ---------------------------------------------------------------------------
-- RPC publicas de lectura (sin datos personales)
-- ---------------------------------------------------------------------------
create or replace function public.profesionales_publicos()
returns table (id uuid, nombre text, area public.area_agenda)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nombre, p.area
  from public.profesionales p
  where p.activo
  order by p.orden, p.nombre;
$$;

create or replace function public.config_publica()
returns table (
  nombre_negocio text,
  reserva_anticipacion_min_horas int,
  reserva_max_dias int,
  reserva_max_activas_por_contacto int
)
language sql
stable
security definer
set search_path = ''
as $$
  select nombre_negocio, reserva_anticipacion_min_horas, reserva_max_dias,
         reserva_max_activas_por_contacto
  from public.configuracion
  where id = true;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecucion
-- ---------------------------------------------------------------------------
revoke all on function public.crear_reserva_interna(uuid, uuid, uuid, timestamptz, timestamptz, text, boolean) from public;
revoke all on function public.cambiar_estado_reserva(uuid, public.estado_reserva, text) from public;
revoke all on function public.horarios_disponibles(uuid, date, date) from public;
revoke all on function public.profesionales_publicos() from public;
revoke all on function public.config_publica() from public;

grant execute on function public.crear_reserva_interna(uuid, uuid, uuid, timestamptz, timestamptz, text, boolean) to authenticated;
grant execute on function public.cambiar_estado_reserva(uuid, public.estado_reserva, text) to authenticated;
grant execute on function public.horarios_disponibles(uuid, date, date) to anon, authenticated;
grant execute on function public.profesionales_publicos() to anon, authenticated;
grant execute on function public.config_publica() to anon, authenticated;
