-- ============================================================================
-- 0002_config_perfiles_auditoria.sql
-- LankaPets v2.0
-- Configuracion, perfiles, auditoria, helpers de rol y triggers.
-- Cada tabla incluye RLS, GRANT explicito y politicas en el mismo archivo.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- configuracion: una sola fila (PK booleana con CHECK)
-- ---------------------------------------------------------------------------
create table public.configuracion (
  id boolean primary key default true check (id),
  iva_porcentaje numeric(4, 2) not null default 19.00
    check (iva_porcentaje >= 0 and iva_porcentaje <= 100),
  zona_horaria text not null default 'America/Santiago',
  corte_medio_dia time not null default '13:00',
  reserva_anticipacion_min_horas int not null default 2
    check (reserva_anticipacion_min_horas >= 0),
  reserva_max_dias int not null default 60 check (reserva_max_dias > 0),
  reserva_max_activas_por_contacto int not null default 3
    check (reserva_max_activas_por_contacto > 0),
  nombre_negocio text not null default 'LankaPets',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.configuracion (id) values (true) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- perfiles: un perfil por usuario de Auth
-- ---------------------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_completo text not null,
  rol public.rol_usuario not null default 'vendedor',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ---------------------------------------------------------------------------
-- auditoria: bitacora de cambios sensibles
-- ---------------------------------------------------------------------------
create table public.auditoria (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id text,
  accion text not null,
  usuario_id uuid,
  antes jsonb,
  despues jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers de rol (leen perfiles con el uid del JWT)
-- ---------------------------------------------------------------------------
create or replace function private.es_personal()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.activo
  );
$$;

create or replace function private.es_maestro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.activo
      and p.rol = 'maestro'
  );
$$;

revoke all on function private.es_personal() from public;
revoke all on function private.es_maestro() from public;
grant execute on function private.es_personal() to authenticated;
grant execute on function private.es_maestro() to authenticated;

-- ---------------------------------------------------------------------------
-- Funciones de trigger
-- ---------------------------------------------------------------------------

-- Actualiza updated_at y updated_by en tablas editables.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

-- Registra antes/despues en auditoria.
create or replace function private.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registro_id text;
begin
  -- Se usa to_jsonb(...)->>'id' porque no todas las tablas auditadas tienen
  -- una columna llamada id (por ejemplo productos_costos usa producto_id).
  if tg_op = 'DELETE' then
    v_registro_id := coalesce(to_jsonb(old) ->> 'id', '');
    insert into public.auditoria (tabla, registro_id, accion, usuario_id, antes, despues)
    values (tg_table_name, v_registro_id, tg_op, auth.uid(), to_jsonb(old), null);
    return old;
  elsif tg_op = 'UPDATE' then
    v_registro_id := coalesce(to_jsonb(new) ->> 'id', '');
    insert into public.auditoria (tabla, registro_id, accion, usuario_id, antes, despues)
    values (tg_table_name, v_registro_id, tg_op, auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  else
    v_registro_id := coalesce(to_jsonb(new) ->> 'id', '');
    insert into public.auditoria (tabla, registro_id, accion, usuario_id, antes, despues)
    values (tg_table_name, v_registro_id, tg_op, auth.uid(), null, to_jsonb(new));
    return new;
  end if;
end;
$$;

-- Impide que un no-Maestro cambie rol o estado de un perfil.
create or replace function private.proteger_campos_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.es_maestro() and (new.rol <> old.rol or new.activo <> old.activo) then
    raise exception 'Solo un Maestro puede cambiar el rol o el estado de un perfil';
  end if;
  return new;
end;
$$;

-- Impide desactivar, degradar o eliminar al ultimo Maestro activo.
create or replace function private.proteger_ultimo_maestro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_otros_maestros int;
begin
  if tg_op = 'DELETE' then
    if old.rol = 'maestro' and old.activo then
      select count(*) into v_otros_maestros
      from public.perfiles
      where rol = 'maestro' and activo and id <> old.id;

      if v_otros_maestros = 0 then
        raise exception 'No se puede eliminar al ultimo Maestro activo';
      end if;
    end if;
    return old;
  end if;

  if old.rol = 'maestro' and old.activo and (new.rol <> 'maestro' or new.activo = false) then
    select count(*) into v_otros_maestros
    from public.perfiles
    where rol = 'maestro' and activo and id <> old.id;

    if v_otros_maestros = 0 then
      raise exception 'No se puede degradar o desactivar al ultimo Maestro activo';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.configuracion enable row level security;
alter table public.perfiles enable row level security;
alter table public.auditoria enable row level security;

-- ---------------------------------------------------------------------------
-- GRANTs explicitos (obligatorios desde el 30 de octubre de 2026)
-- ---------------------------------------------------------------------------
grant select, insert, update on public.perfiles to authenticated;
grant select, update on public.configuracion to authenticated;
grant select on public.auditoria to authenticated;

-- ---------------------------------------------------------------------------
-- Politicas
-- ---------------------------------------------------------------------------
create policy perfiles_select on public.perfiles
  for select to authenticated
  using (true);

create policy perfiles_insert_maestro on public.perfiles
  for insert to authenticated
  with check (private.es_maestro());

create policy perfiles_update on public.perfiles
  for update to authenticated
  using (id = auth.uid() or private.es_maestro())
  with check (id = auth.uid() or private.es_maestro());

create policy configuracion_select on public.configuracion
  for select to authenticated
  using (true);

create policy configuracion_update_maestro on public.configuracion
  for update to authenticated
  using (private.es_maestro())
  with check (private.es_maestro());

create policy auditoria_select_maestro on public.auditoria
  for select to authenticated
  using (private.es_maestro());

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger trg_perfiles_updated_at
  before update on public.perfiles
  for each row execute function private.set_updated_at();

create trigger trg_perfiles_campos
  before update on public.perfiles
  for each row execute function private.proteger_campos_perfil();

create trigger trg_perfiles_ultimo_maestro
  before update or delete on public.perfiles
  for each row execute function private.proteger_ultimo_maestro();

create trigger trg_perfiles_audit
  after insert or update or delete on public.perfiles
  for each row execute function private.auditar();

create trigger trg_configuracion_updated_at
  before update on public.configuracion
  for each row execute function private.set_updated_at();

create trigger trg_configuracion_audit
  after update on public.configuracion
  for each row execute function private.auditar();
