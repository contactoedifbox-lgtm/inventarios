-- ============================================================================
-- 0025_ajustar_stock_personal.sql
-- LankaPets v2.0
-- Permite que Maestro y Vendedor ajusten el stock desde la edicion de producto.
-- Antes solo el Maestro podia ajustar stock (conteo fisico). El stock sigue
-- cambiando unicamente por RPC y queda registrado en el kardex como 'ajuste'.
-- ============================================================================

create or replace function public.ajustar_stock(
  p_producto_id uuid,
  p_nuevo_stock int,
  p_motivo text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actual int;
  v_delta int;
  v_mov bigint;
begin
  if not private.es_personal() then
    raise exception 'Solo el personal puede ajustar stock';
  end if;

  if p_nuevo_stock < 0 then
    raise exception 'El stock no puede ser negativo';
  end if;

  select stock into v_actual from public.productos where id = p_producto_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  v_delta := p_nuevo_stock - v_actual;
  if v_delta = 0 then
    raise exception 'El stock no cambia';
  end if;

  update public.productos set stock = p_nuevo_stock where id = p_producto_id;

  insert into public.movimientos_inventario
    (producto_id, tipo, cantidad, stock_resultante, motivo, usuario_id)
  values
    (p_producto_id, 'ajuste', v_delta, p_nuevo_stock, p_motivo, auth.uid())
  returning id into v_mov;

  return v_mov;
end;
$$;

revoke all on function public.ajustar_stock(uuid, int, text) from public;
grant execute on function public.ajustar_stock(uuid, int, text) to authenticated;
