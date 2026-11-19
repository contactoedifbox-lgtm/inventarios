-- ============================================================================
-- 0020_registro_clientes.sql
-- LankaPets v2.0
-- Autoregistro de clientes (correo+contraseña y Google) y edicion de sus datos.
--
-- Al crear un usuario en Auth (signUp por correo o inicio con Google) se crea
-- automaticamente:
--   * una fila en public.perfiles con rol 'cliente' (nunca maestro/vendedor)
--   * una ficha en public.clientes vinculada por email
--
-- Seguridad del rol:
--   * El rol SOLO se toma de raw_app_meta_data (que el usuario NO puede
--     modificar; solo lo escribe el service_role / la Edge Function admin).
--   * En autoregistro (raw_app_meta_data sin 'rol') siempre es 'cliente'.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trigger en auth.users: crea perfil y ficha de cliente
-- ---------------------------------------------------------------------------
create or replace function private.crear_perfil_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario;
  v_es_admin boolean;
  v_nombres text;
  v_apellidos text;
  v_nombre_completo text;
  v_telefono text;
  v_rut text;
begin
  -- Si ya existe un perfil (p.ej. creado explicitamente), no hacer nada.
  if exists (select 1 from public.perfiles where id = new.id) then
    return new;
  end if;

  -- El rol solo es confiable si viene en app_metadata (solo lo escribe el
  -- service_role). En autoregistro siempre se fuerza 'cliente'.
  v_es_admin := (new.raw_app_meta_data ? 'rol');

  begin
    v_rol := coalesce((new.raw_app_meta_data ->> 'rol')::public.rol_usuario, 'cliente');
  exception when others then
    v_rol := 'cliente';
  end;

  if not v_es_admin or v_rol is null then
    v_rol := 'cliente';
  end if;

  v_nombres := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'nombres', '')), '');
  v_apellidos := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'apellidos', '')), '');
  v_telefono := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'telefono', '')), '');
  v_rut := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'rut', '')), '');

  v_nombre_completo := nullif(btrim(coalesce(
    new.raw_app_meta_data ->> 'nombre_completo',
    new.raw_user_meta_data ->> 'nombre_completo',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  )), '');

  if v_nombre_completo is null then
    v_nombre_completo := coalesce(
      nullif(btrim(coalesce(v_nombres, '') || ' ' || coalesce(v_apellidos, '')), ''),
      new.email::text,
      'Usuario'
    );
  end if;

  insert into public.perfiles (id, nombre_completo, rol, activo)
  values (new.id, v_nombre_completo, v_rol, true)
  on conflict (id) do nothing;

  -- Ficha de cliente: autoregistro y clientes creados por el administrador.
  if v_rol = 'cliente'
     and new.email is not null
     and not exists (
       select 1 from public.clientes c
       where lower(c.email::text) = lower(new.email::text)
     )
  then
    if v_rut is not null and private.validar_rut(v_rut) then
      v_rut := private.normalizar_rut(v_rut);
    else
      v_rut := 'ANONIMO';
    end if;

    begin
      insert into public.clientes
        (nombres, apellidos, rut, telefono, email, origen, consentimiento_datos_at)
      values (
        coalesce(v_nombres, v_nombre_completo),
        coalesce(v_apellidos, ''),
        v_rut,
        coalesce(v_telefono, ''),
        new.email,
        'web',
        now()
      );
    exception when unique_violation then
      -- RUT duplicado: se reintenta con RUT anonimo.
      insert into public.clientes
        (nombres, apellidos, rut, telefono, email, origen, consentimiento_datos_at)
      values (
        coalesce(v_nombres, v_nombre_completo),
        coalesce(v_apellidos, ''),
        'ANONIMO',
        coalesce(v_telefono, ''),
        new.email,
        'web',
        now()
      );
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auth_users_perfil on auth.users;
create trigger trg_auth_users_perfil
  after insert on auth.users
  for each row execute function private.crear_perfil_cliente();

-- ---------------------------------------------------------------------------
-- RPC: el cliente actualiza sus propios datos (sin tocar email ni id)
-- ---------------------------------------------------------------------------
create or replace function public.actualizar_mis_datos(
  p_nombres text,
  p_apellidos text,
  p_rut text,
  p_telefono text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cliente_id uuid;
  v_rut text;
begin
  if not private.es_cliente() then
    raise exception 'Solo un cliente puede actualizar sus datos';
  end if;

  v_cliente_id := private.cliente_id_actual();
  if v_cliente_id is null then
    raise exception 'No tienes una ficha de cliente asociada';
  end if;

  if p_nombres is null or btrim(p_nombres) = '' then
    raise exception 'El nombre es obligatorio';
  end if;

  if p_apellidos is null or btrim(p_apellidos) = '' then
    raise exception 'El apellido es obligatorio';
  end if;

  v_rut := btrim(coalesce(p_rut, ''));
  if v_rut <> '' and upper(v_rut) <> 'ANONIMO' then
    if not private.validar_rut(v_rut) then
      raise exception 'RUT invalido (revisa el digito verificador)';
    end if;
    v_rut := private.normalizar_rut(v_rut);
  else
    v_rut := 'ANONIMO';
  end if;

  update public.clientes
    set nombres = btrim(p_nombres),
        apellidos = btrim(p_apellidos),
        rut = v_rut,
        telefono = btrim(coalesce(p_telefono, ''))
    where id = v_cliente_id;

  if not found then
    raise exception 'No se pudieron actualizar tus datos';
  end if;
end;
$$;

revoke all on function public.actualizar_mis_datos(text, text, text, text) from public;
revoke execute on function public.actualizar_mis_datos(text, text, text, text) from anon;
grant execute on function public.actualizar_mis_datos(text, text, text, text) to authenticated;
