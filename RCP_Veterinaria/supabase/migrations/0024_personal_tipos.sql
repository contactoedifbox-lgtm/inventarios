-- ============================================================================
-- 0024_personal_tipos.sql
-- LankaPets v2.0
-- "Profesionales" pasa a ser "Personal" con un tipo (Vendedor, Veterinario,
-- Peluquero) y un genero (para la etiqueta). El area de agenda se deriva del
-- tipo. Los vendedores no aparecen en la agenda ni en la reserva publica.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tipos enumerados
-- ---------------------------------------------------------------------------
create type public.tipo_personal as enum ('vendedor', 'veterinario', 'peluquero');
create type public.genero_personal as enum ('masculino', 'femenino');

-- ---------------------------------------------------------------------------
-- 2. Columnas nuevas en profesionales
-- ---------------------------------------------------------------------------
alter table public.profesionales
  add column if not exists tipo public.tipo_personal not null default 'veterinario';

alter table public.profesionales
  add column if not exists genero public.genero_personal not null default 'masculino';

-- ---------------------------------------------------------------------------
-- 3. Reclasificacion de los registros existentes
-- ---------------------------------------------------------------------------
update public.profesionales set tipo = 'peluquero' where area = 'peluqueria';
update public.profesionales set tipo = 'vendedor' where lower(nombre) like '%escaneadro%';

-- ---------------------------------------------------------------------------
-- 4. El area de agenda se deriva del tipo
-- ---------------------------------------------------------------------------
create or replace function private.derivar_area_profesional()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.area := case new.tipo
    when 'peluquero' then 'peluqueria'::public.area_agenda
    else 'veterinaria'::public.area_agenda
  end;
  return new;
end;
$$;

drop trigger if exists trg_profesionales_area on public.profesionales;
create trigger trg_profesionales_area
  before insert or update of tipo on public.profesionales
  for each row execute function private.derivar_area_profesional();

-- ---------------------------------------------------------------------------
-- 5. La reserva publica solo muestra veterinarios y peluqueros
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
    and p.tipo <> 'vendedor'
  order by p.orden, p.nombre;
$$;

revoke all on function public.profesionales_publicos() from public;
grant execute on function public.profesionales_publicos() to anon, authenticated;
