-- ============================================================================
-- 0009_fix_auditar.sql
-- LankaPets v2.0
-- Corrige private.auditar(): no todas las tablas auditadas tienen columna id
-- (por ejemplo productos_costos usa producto_id como PK). Se toma el valor
-- desde to_jsonb(...)->>'id', que devuelve NULL si no existe.
-- ============================================================================

create or replace function private.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registro_id text;
begin
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