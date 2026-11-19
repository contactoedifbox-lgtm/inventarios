-- ============================================================================
-- 0011_permite_borrar_usuario_auth.sql
-- LankaPets v2.0
-- Permite eliminar un usuario de Auth (accion administrativa) sin que el
-- trigger de proteccion del ultimo Maestro bloquee el DELETE en cascada sobre
-- public.perfiles. La proteccion se mantiene para degradar o desactivar al
-- ultimo Maestro activo desde la aplicacion.
-- ============================================================================

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
    -- El borrado del usuario de Auth es una accion administrativa.
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