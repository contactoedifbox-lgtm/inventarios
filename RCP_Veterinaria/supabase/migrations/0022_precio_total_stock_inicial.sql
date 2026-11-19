-- ============================================================================
-- 0022_precio_total_stock_inicial.sql
-- LankaPets v2.0
-- El precio de venta se ingresa como TOTAL (bruto) y el sistema calcula el
-- neto y el IVA. El stock inicial se carga con la RPC registrar_ingreso.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. El neto pasa a tener default (lo calcula el trigger desde el total)
-- ---------------------------------------------------------------------------
alter table public.productos alter column precio_venta_neto set default 0;

-- ---------------------------------------------------------------------------
-- 2. El trigger ahora parte del precio TOTAL y calcula neto + IVA
-- ---------------------------------------------------------------------------
create or replace function private.calcular_iva_producto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_iva numeric;
begin
  select iva_porcentaje into v_iva from public.configuracion where id = true;

  -- El total es el dato de entrada; el neto y el IVA se derivan de el.
  new.precio_venta_neto := round(new.precio_venta_total / (1 + v_iva / 100));
  new.iva_precio_venta := new.precio_venta_total - new.precio_venta_neto;
  return new;
end;
$$;

drop trigger if exists trg_productos_iva on public.productos;
create trigger trg_productos_iva
  before insert or update of precio_venta_total on public.productos
  for each row execute function private.calcular_iva_producto();

-- ---------------------------------------------------------------------------
-- 3. El cliente envia el precio TOTAL (ya no el neto)
-- ---------------------------------------------------------------------------
revoke insert (precio_venta_neto) on public.productos from authenticated;
revoke update (precio_venta_neto) on public.productos from authenticated;
grant insert (precio_venta_total) on public.productos to authenticated;
grant update (precio_venta_total) on public.productos to authenticated;
