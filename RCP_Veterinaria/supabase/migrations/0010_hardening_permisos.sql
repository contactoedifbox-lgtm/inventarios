-- ============================================================================
-- 0010_hardening_permisos.sql
-- LankaPets v2.0
-- Endurecimiento detectado por los advisors de Supabase:
--   1. search_path fijo en las funciones de validacion de RUT.
--   2. Revocacion explicita de EXECUTE a anon en las RPC internas.
--      (REVOKE ... FROM PUBLIC no quita los grants que Supabase otorga
--       por defecto a los roles anon y authenticated.)
--   3. Las RPC publicas de escritura quedan solo para service_role.
-- ============================================================================

-- 1. search_path fijo -------------------------------------------------------
create or replace function private.validar_rut(p_rut text)
returns boolean
language plpgsql
immutable
set search_path = ''
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
  if length(v_limpio) < 2 then return false; end if;
  v_cuerpo := left(v_limpio, length(v_limpio) - 1);
  v_dv := right(v_limpio, 1);
  if v_cuerpo !~ '^[0-9]+$' then return false; end if;
  for i in reverse length(v_cuerpo)..1 loop
    v_suma := v_suma + (substring(v_cuerpo, i, 1)::int * v_mult);
    v_mult := case when v_mult = 7 then 2 else v_mult + 1 end;
  end loop;
  v_resto := 11 - (v_suma % 11);
  v_calc := case when v_resto = 11 then '0' when v_resto = 10 then 'K' else v_resto::text end;
  return v_calc = v_dv;
end;
$$;

create or replace function private.normalizar_rut(p_rut text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_limpio text;
begin
  v_limpio := upper(regexp_replace(coalesce(p_rut, ''), '[^0-9kK]', '', 'g'));
  if length(v_limpio) < 2 then return v_limpio; end if;
  return left(v_limpio, length(v_limpio) - 1) || '-' || right(v_limpio, 1);
end;
$$;

-- 2. Revocar EXECUTE de anon en las RPC internas ----------------------------
revoke execute on function public.registrar_venta(jsonb, public.medio_pago) from anon;
revoke execute on function public.registrar_devolucion(jsonb, public.medio_pago, text, uuid) from anon;
revoke execute on function public.anular_venta(uuid, text) from anon;
revoke execute on function public.registrar_ingreso(jsonb, uuid, text, text) from anon;
revoke execute on function public.ajustar_stock(uuid, int, text) from anon;
revoke execute on function public.reporte_ventas_productos(timestamptz, timestamptz, text) from anon;
revoke execute on function public.crear_reserva_interna(uuid, uuid, uuid, timestamptz, timestamptz, text, boolean) from anon;
revoke execute on function public.cambiar_estado_reserva(uuid, public.estado_reserva, text) from anon;
revoke execute on function public.anonimizar_cliente(uuid) from anon;

-- 3. RPC publicas de escritura: solo service_role ---------------------------
revoke execute on function public.crear_reserva_publica(uuid, timestamptz, text, jsonb, jsonb) from anon, authenticated;
revoke execute on function public.cancelar_reserva_publica(text) from anon, authenticated;
