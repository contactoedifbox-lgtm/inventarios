-- ============================================================================
-- 0005_clientes_mascotas.sql
-- LankaPets v2.0
-- Clientes y mascotas con RLS estricto (solo personal autenticado),
-- validacion de RUT (modulo 11) y anonimizacion conforme a Ley 21.719.
-- La pagina publica NO lee ni escribe directamente estas tablas.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Validacion y normalizacion de RUT (modulo 11)
-- ---------------------------------------------------------------------------
create or replace function private.validar_rut(p_rut text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_limpio text;
  v_cuerpo text;
  v_dv text;
  v_suma int := 0;
  v_mult int := 2;
  v_resto int;
  v_calc text;
  i int;
begin
  v_limpio := upper(regexp_replace(coalesce(p_rut, ''), '[^0-9kK]', '', 'g'));

  if length(v_limpio) < 2 then
    return false;
  end if;

  v_cuerpo := left(v_limpio, length(v_limpio) - 1);
  v_dv := right(v_limpio, 1);

  if v_cuerpo !~ '^[0-9]+$' then
    return false;
  end if;

  for i in reverse length(v_cuerpo)..1 loop
    v_suma := v_suma + (substring(v_cuerpo, i, 1)::int * v_mult);
    v_mult := case when v_mult = 7 then 2 else v_mult + 1 end;
  end loop;

  v_resto := 11 - (v_suma % 11);
  v_calc := case
    when v_resto = 11 then '0'
    when v_resto = 10 then 'K'
    else v_resto::text
  end;

  return v_calc = v_dv;
end;
$$;

create or replace function private.normalizar_rut(p_rut text)
returns text
language plpgsql
immutable
as $$
declare
  v_limpio text;
begin
  v_limpio := upper(regexp_replace(coalesce(p_rut, ''), '[^0-9kK]', '', 'g'));

  if length(v_limpio) < 2 then
    return v_limpio;
  end if;

  return left(v_limpio, length(v_limpio) - 1) || '-' || right(v_limpio, 1);
end;
$$;

-- ---------------------------------------------------------------------------
-- clientes
-- ---------------------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombres text not null,
  apellidos text not null,
  rut text not null,
  telefono text not null,
  email extensions.citext,
  direccion text,
  notas text,
  origen public.origen_reserva not null default 'interno',
  consentimiento_datos_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.perfiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint clientes_rut_valido
    check (rut = 'ANONIMO' or private.validar_rut(rut))
);

create unique index clientes_rut_key
  on public.clientes (rut)
  where rut <> 'ANONIMO';

create index clientes_email_idx on public.clientes (lower(email::text));
create index clientes_telefono_idx on public.clientes (telefono);

-- ---------------------------------------------------------------------------
-- mascotas
-- ---------------------------------------------------------------------------
create table public.mascotas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  nombre text not null,
  especie public.especie not null,
  raza text,
  peso_kg numeric(5, 2) check (peso_kg is null or peso_kg > 0),
  sexo text,
  fecha_nacimiento date,
  esterilizado boolean,
  observaciones text,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index mascotas_cliente_idx on public.mascotas (cliente_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row execute function private.set_updated_at();

create trigger trg_clientes_audit
  after insert or update or delete on public.clientes
  for each row execute function private.auditar();

create trigger trg_mascotas_updated_at
  before update on public.mascotas
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.clientes enable row level security;
alter table public.mascotas enable row level security;

-- ---------------------------------------------------------------------------
-- GRANTs explicitos (sin acceso para anon)
-- ---------------------------------------------------------------------------
grant select, insert, update on public.clientes to authenticated;
grant select, insert, update on public.mascotas to authenticated;

-- ---------------------------------------------------------------------------
-- Politicas: solo personal autenticado
-- ---------------------------------------------------------------------------
create policy clientes_personal on public.clientes
  for all to authenticated
  using (private.es_personal())
  with check (private.es_personal());

create policy mascotas_personal on public.mascotas
  for all to authenticated
  using (private.es_personal())
  with check (private.es_personal());

-- ---------------------------------------------------------------------------
-- RPC anonimizar_cliente (solo Maestro): conserva ventas, borra PII
-- ---------------------------------------------------------------------------
create or replace function public.anonimizar_cliente(p_cliente_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.es_maestro() then
    raise exception 'Solo un Maestro puede anonimizar clientes';
  end if;

  update public.clientes
    set nombres = 'ANONIMO',
        apellidos = 'ANONIMO',
        rut = 'ANONIMO',
        telefono = 'ANONIMO',
        email = null,
        direccion = null,
        notas = null
    where id = p_cliente_id;

  if not found then
    raise exception 'Cliente no encontrado';
  end if;
end;
$$;

revoke all on function public.anonimizar_cliente(uuid) from public;
grant execute on function public.anonimizar_cliente(uuid) to authenticated;
