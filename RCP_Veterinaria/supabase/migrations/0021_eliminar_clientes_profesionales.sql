-- ============================================================================
-- 0021_eliminar_clientes_profesionales.sql
-- LankaPets v2.0
-- Permite eliminar clientes (con sus mascotas y reservas) y profesionales
-- (con sus reservas y su cuenta de acceso), y agrega el email del profesional
-- para crearle una cuenta de ingreso.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. FKs en cascada para poder borrar un cliente
-- ---------------------------------------------------------------------------
alter table public.mascotas drop constraint if exists mascotas_cliente_id_fkey;
alter table public.mascotas
  add constraint mascotas_cliente_id_fkey
  foreign key (cliente_id) references public.clientes (id) on delete cascade;

alter table public.reservas drop constraint if exists reservas_cliente_id_fkey;
alter table public.reservas
  add constraint reservas_cliente_id_fkey
  foreign key (cliente_id) references public.clientes (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 2. Email del profesional (para crearle una cuenta de acceso)
-- ---------------------------------------------------------------------------
alter table public.profesionales
  add column if not exists email extensions.citext;

-- ---------------------------------------------------------------------------
-- 3. RPC eliminar_cliente (solo Maestro)
--    Borra mascotas, reservas, la ficha y la cuenta de usuario asociada.
-- ---------------------------------------------------------------------------
create or replace function public.eliminar_cliente(p_cliente_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_user_id uuid;
begin
  if not private.es_maestro() then
    raise exception 'Solo un Maestro puede eliminar clientes';
  end if;

  select email::text into v_email from public.clientes where id = p_cliente_id;
  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  delete from public.mascotas where cliente_id = p_cliente_id;
  delete from public.reservas where cliente_id = p_cliente_id;
  delete from public.clientes where id = p_cliente_id;

  -- Borra la cuenta de usuario asociada (por email), si existe.
  if v_email is not null then
    select id into v_user_id
    from auth.users
    where lower(email::text) = lower(v_email)
    limit 1;

    if v_user_id is not null then
      delete from auth.users where id = v_user_id;
    end if;
  end if;
end;
$$;

revoke all on function public.eliminar_cliente(uuid) from public;
revoke execute on function public.eliminar_cliente(uuid) from anon;
grant execute on function public.eliminar_cliente(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RPC eliminar_profesional (solo Maestro)
--    Borra reservas, el profesional y su cuenta de acceso vinculada.
-- ---------------------------------------------------------------------------
create or replace function public.eliminar_profesional(p_profesional_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil_id uuid;
  v_email text;
begin
  if not private.es_maestro() then
    raise exception 'Solo un Maestro puede eliminar profesionales';
  end if;

  select perfil_id, email::text into v_perfil_id, v_email
  from public.profesionales
  where id = p_profesional_id;

  if not found then
    raise exception 'Profesional no encontrado';
  end if;

  delete from public.reservas where profesional_id = p_profesional_id;
  delete from public.profesionales where id = p_profesional_id;

  -- Borra la cuenta de usuario vinculada, si existe.
  if v_perfil_id is not null then
    delete from auth.users where id = v_perfil_id;
  elsif v_email is not null then
    delete from auth.users where lower(email::text) = lower(v_email);
  end if;
end;
$$;

revoke all on function public.eliminar_profesional(uuid) from public;
revoke execute on function public.eliminar_profesional(uuid) from anon;
grant execute on function public.eliminar_profesional(uuid) to authenticated;
