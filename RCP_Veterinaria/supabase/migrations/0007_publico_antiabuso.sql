-- ============================================================================
-- 0007_publico_antiabuso.sql
-- LankaPets v2.0
-- Soporte antiabuso de la reserva publica y RPC exclusivas de service_role.
-- La Edge Function reserva-publica usa la clave secret para invocarlas.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- intentos_reserva_publica: sin politicas ni GRANT para anon/authenticated
-- ---------------------------------------------------------------------------
create table public.intentos_reserva_publica (
  id bigint generated always as identity primary key,
  ip_hash text,
  email_norm text,
  telefono_norm text,
  resultado text not null,
  created_at timestamptz not null default now()
);

create index intentos_ip_fecha_idx
  on public.intentos_reserva_publica (ip_hash, created_at desc);
create index intentos_email_fecha_idx
  on public.intentos_reserva_publica (email_norm, created_at desc);

alter table public.intentos_reserva_publica enable row level security;

-- Sin politicas y sin GRANT: solo service_role (que ignora RLS) la usa.
revoke all on public.intentos_reserva_publica from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Limpieza de intentos con mas de 30 dias
-- ---------------------------------------------------------------------------
create or replace function private.limpiar_intentos_reserva()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.intentos_reserva_publica
  where created_at < now() - interval '30 days';
$$;

-- ---------------------------------------------------------------------------
-- RPC crear_reserva_publica (solo service_role)
-- Crea cliente, mascota y reserva en una transaccion y devuelve el token.
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

  -- Cliente: reutiliza por RUT o crea con consentimiento explicito.
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

  -- Mascota: reutiliza por nombre dentro del cliente o crea.
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

  -- Limite de reservas activas por contacto.
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

  v_fin := p_inicio + make_interval(mins => v_duracion);

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

-- ---------------------------------------------------------------------------
-- RPC cancelar_reserva_publica (solo service_role)
-- ---------------------------------------------------------------------------
create or replace function public.cancelar_reserva_publica(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  update public.reservas
    set estado = 'cancelada',
        cancelada_at = now(),
        cancelada_motivo = 'Cancelada por el cliente'
    where token_gestion_hash = v_hash
      and estado = 'confirmada';

  if not found then
    raise exception 'Reserva no encontrada o ya cancelada';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: solo service_role puede ejecutar las RPC publicas de escritura
-- ---------------------------------------------------------------------------
revoke all on function public.crear_reserva_publica(uuid, timestamptz, text, jsonb, jsonb) from public;
revoke all on function public.cancelar_reserva_publica(text) from public;
revoke all on function private.limpiar_intentos_reserva() from public;

grant execute on function public.crear_reserva_publica(uuid, timestamptz, text, jsonb, jsonb) to service_role;
grant execute on function public.cancelar_reserva_publica(text) to service_role;
