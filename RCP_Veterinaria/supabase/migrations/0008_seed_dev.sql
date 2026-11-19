-- ============================================================================
-- 0008_seed_dev.sql
-- LankaPets v2.0
-- Datos de demostracion para el proyecto de desarrollo.
-- Es idempotente: solo inserta si las tablas estan vacias.
-- NO aplicar en produccion con datos reales.
-- ============================================================================

-- Productos de ejemplo
insert into public.productos (codigo_barras, nombre, descripcion, stock, stock_minimo, precio_venta_neto)
select * from (values
  ('7801234567890', 'Alimento premium perro 15 kg', 'Saco de alimento balanceado', 12, 3, 29990),
  ('7801234567891', 'Antiparasitario gato', 'Pipeta mensual', 30, 5, 7990),
  ('7801234567892', 'Shampoo hipoalergenico', 'Frasco 500 ml', 20, 4, 5990)
) as datos(codigo_barras, nombre, descripcion, stock, stock_minimo, precio_venta_neto)
where not exists (select 1 from public.productos);

-- Costos de ejemplo (solo visibles para el Maestro)
insert into public.productos_costos (producto_id, costo_neto)
select p.id, round(p.precio_venta_neto * 0.6)
from public.productos p
where not exists (select 1 from public.productos_costos);

-- Proveedor de ejemplo
insert into public.proveedores (nombre, rut, telefono, email)
select 'Distribuidora Vet Ltda', '76543210-K', '+56911112222', 'ventas@vet.cl'
where not exists (select 1 from public.proveedores);

-- Profesionales de ejemplo
insert into public.profesionales (nombre, area, duracion_slot_min, orden)
select * from (values
  ('Dra. Carla Soto', 'veterinaria'::public.area_agenda, 30, 1),
  ('Dr. Luis Mena', 'veterinaria'::public.area_agenda, 30, 2),
  ('Peluqueria Lanka', 'peluqueria'::public.area_agenda, 45, 3)
) as datos(nombre, area, duracion_slot_min, orden)
where not exists (select 1 from public.profesionales);

-- Horario semanal de ejemplo: lunes a viernes 09:00-13:00 y 15:00-18:00
insert into public.horarios_semanales (profesional_id, dia_semana, hora_inicio, hora_fin)
select p.id, d.dia, t.inicio, t.fin
from public.profesionales p
cross join generate_series(1, 5) as d(dia)
cross join (values ('09:00'::time, '13:00'::time), ('15:00'::time, '18:00'::time)) as t(inicio, fin)
where not exists (select 1 from public.horarios_semanales);
