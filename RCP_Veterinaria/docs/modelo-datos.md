# Modelo de datos — LankaPets v2.0

## Convenciones

- IDs `uuid` (`gen_random_uuid`), salvo kardex y auditoria (`bigint identity`).
- Fechas `timestamptz` en UTC; zona `America/Santiago` al mostrar y agrupar.
- Dinero `integer` en CLP, sin decimales. Sufijos `_neto`, `_iva`, `_total`.
- IVA persistido por trigger `BEFORE INSERT/UPDATE` usando `configuracion.iva_porcentaje`.
- RUT normalizado `12345678-K`; telefono `+569XXXXXXXX`.
- Extensiones: `pgcrypto`, `citext`, `btree_gist`.

## Tablas

### Seguridad y configuracion

| Tabla | Descripcion |
|---|---|
| `perfiles` | Un perfil por usuario de Auth; rol y estado |
| `configuracion` | Una sola fila: IVA, zona horaria, limites de reserva |
| `auditoria` | Bitacora de cambios sensibles (antes/despues en jsonb) |

### Inventario

| Tabla | Descripcion |
|---|---|
| `productos` | Datos comerciales; `stock` solo cambia por RPC |
| `productos_costos` | Costos; solo Maestro |
| `proveedores` | Proveedores |
| `ingresos_inventario` / `ingreso_items` | Recepcion de mercaderia |
| `movimientos_inventario` | Kardex inmutable |

### Ventas

| Tabla | Descripcion |
|---|---|
| `ventas` | Una fila por venta o devolucion; `numero` correlativo |
| `venta_items` | Copia historica de nombre, codigo, precio e IVA |
| `venta_items_costos` | Costo vigente al vender; solo Maestro |

### Clientes

| Tabla | Descripcion |
|---|---|
| `clientes` | RUT validado (modulo 11), consentimiento |
| `mascotas` | Especie obligatoria, peso positivo |

### Agenda

| Tabla | Descripcion |
|---|---|
| `profesionales` | Cada veterinario y peluquero |
| `horarios_semanales` | Plantilla semanal; sin solape por profesional y dia |
| `excepciones_agenda` | Feriados, vacaciones, medios dias y horas |
| `reservas` | Restriccion `EXCLUDE` anti doble reserva |

### Soporte

| Tabla | Descripcion |
|---|---|
| `intentos_reserva_publica` | Rate limit; sin acceso para anon/authenticated |

## Vista

`v_inventario` (`security_invoker = true`): productos con `LEFT JOIN` a costos,
mas `stock_bajo` y `margen_neto`. Para el Vendedor las columnas de costo llegan
nulas porque RLS le oculta esas filas.

## Indices clave

- `productos(codigo_barras)` unico parcial
- `ventas(created_at)`, `ventas(vendedor_id, created_at)`
- `venta_items(producto_id)`, `venta_items(venta_id)`
- `movimientos_inventario(producto_id, created_at)`
- `reservas(profesional_id, inicio)`
- `clientes(lower(email))`, `clientes(telefono)`, `mascotas(cliente_id)`
