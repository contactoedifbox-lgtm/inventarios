-- ============================================================================
-- 0017_reservas_cliente.sql
-- LankaPets v2.0
-- Permite que un usuario con rol cliente vea y cancele SUS reservas de hora.
-- El vinculo se hace por email entre auth.users y clientes.
-- El personal (Maestro/Vendedor) sigue viendo y cancelando todas.
-- ============================================================================

-- Cliente asociado al usuario autenticado (por email).
create or replace function private.cliente_id_actual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.clientes c
  join auth.users u on lower(u.email::text) = lower(c.email::text)
  where u.id = auth.uid()
  limit 1;
$$;

revoke all on function private.cliente_id_actual() from public;
grant execute on function private.cliente_id_actual() to authenticated;

-- El cliente puede leer sus propias reservas; el personal, todas.
drop policy if exists reservas_select on public.reservas;

create policy reservas_select on public.reservas
  for select to authenticated
  using (private.es_personal() or cliente_id = private.cliente_id_actual());

-- Cancelar una reserva propia (cliente) o cualquiera (personal).
create or replace function public.cancelar_mi_reserva(
  p_reserva_id uuid,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reservas
    set estado = 'cancelada',
        cancelada_at = now(),
        cancelada_motivo = coalesce(p_motivo, 'Cancelada por el cliente')
    where id = p_reserva_id
      and estado = 'confirmada'
      and (private.es_personal() or cliente_id = private.cliente_id_actual());

  if not found then
    raise exception 'Reserva no encontrada o no cancelable';
  end if;
end;
$$;

revoke all on function public.cancelar_mi_reserva(uuid, text) from public;
revoke execute on function public.cancelar_mi_reserva(uuid, text) from anon;
grant execute on function public.cancelar_mi_reserva(uuid, text) to authenticated;