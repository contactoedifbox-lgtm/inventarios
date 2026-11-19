-- ============================================================================
-- 0019_reservas_cliente_crear.sql
-- LankaPets v2.0
-- El cliente puede leer su propia ficha y sus mascotas, y crear su propia
-- reserva de hora (sin poder elegir a otro cliente ni forzar fuera de horario).
-- ============================================================================

-- clientes: el personal ve todo; el cliente solo su ficha.
drop policy if exists clientes_personal on public.clientes;
drop policy if exists clientes_select on public.clientes;
drop policy if exists clientes_insert_personal on public.clientes;
drop policy if exists clientes_update_personal on public.clientes;

create policy clientes_select on public.clientes
  for select to authenticated
  using (private.es_personal() or id = private.cliente_id_actual());

create policy clientes_insert_personal on public.clientes
  for insert to authenticated with check (private.es_personal());

create policy clientes_update_personal on public.clientes
  for update to authenticated
  using (private.es_personal()) with check (private.es_personal());

-- mascotas: el personal ve todo; el cliente solo las suyas.
drop policy if exists mascotas_personal on public.mascotas;
drop policy if exists mascotas_select on public.mascotas;
drop policy if exists mascotas_insert_personal on public.mascotas;
drop policy if exists mascotas_update_personal on public.mascotas;

create policy mascotas_select on public.mascotas
  for select to authenticated
  using (private.es_personal() or cliente_id = private.cliente_id_actual());

create policy mascotas_insert_personal on public.mascotas
  for insert to authenticated with check (private.es_personal());

create policy mascotas_update_personal on public.mascotas
  for update to authenticated
  using (private.es_personal()) with check (private.es_personal());

-- El cliente crea su propia reserva de hora.
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