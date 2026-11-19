# Contratos RPC — LankaPets v2.0

Todas las RPC usan parametros tipados (jsonb o tipos nativos), `SECURITY DEFINER`
con `search_path = ''` y `REVOKE EXECUTE FROM PUBLIC` con `GRANT` explicito.

| Funcion | Entrada | Salida | Roles |
|---|---|---|---|
| `registrar_venta` | `p_items jsonb`, `p_medio_pago medio_pago` | `jsonb` (venta_id, numero, totales) | authenticated |
| `registrar_devolucion` | `p_items jsonb`, `p_medio_pago`, `p_motivo`, `p_venta_origen_id` | `jsonb` | authenticated |
| `anular_venta` | `p_venta_id uuid`, `p_motivo text` | `void` | authenticated (solo Maestro) |
| `registrar_ingreso` | `p_items jsonb`, `p_proveedor_id`, `p_documento`, `p_notas` | `uuid` | authenticated |
| `ajustar_stock` | `p_producto_id uuid`, `p_nuevo_stock int`, `p_motivo text` | `bigint` | authenticated (solo Maestro) |
| `reporte_ventas_productos` | `p_desde`, `p_hasta`, `p_agrupar` | tabla agregada | authenticated |
| `crear_reserva_interna` | profesional, cliente, mascota, inicio, fin, motivo, forzar | `uuid` | authenticated |
| `cambiar_estado_reserva` | `p_reserva_id`, `p_estado`, `p_motivo` | `void` | authenticated |
| `horarios_disponibles` | `p_profesional_id`, `p_desde`, `p_hasta` | tabla (inicio, fin) | anon, authenticated |
| `profesionales_publicos` | - | tabla (id, nombre, area) | anon, authenticated |
| `config_publica` | - | tabla (limites de reserva) | anon, authenticated |
| `crear_reserva_publica` | profesional, inicio, motivo, cliente jsonb, mascota jsonb | `jsonb` (reserva_id, token) | service_role |
| `cancelar_reserva_publica` | `p_token text` | `void` | service_role |
| `anonimizar_cliente` | `p_cliente_id uuid` | `void` | authenticated (solo Maestro) |

## Formato de `p_items` en ventas

```json
[
  { "producto_id": "uuid", "cantidad": 2 },
  { "producto_id": "uuid", "cantidad": 1 }
]
```

En devoluciones se agrega `reingresa_stock`:

```json
[
  { "producto_id": "uuid", "cantidad": 1, "reingresa_stock": false }
]
```

## Reglas

- El servidor calcula precios, IVA, totales y stock; el cliente nunca los envia.
- `registrar_venta` bloquea filas con `FOR UPDATE` y rechaza sobreventa.
- `anular_venta` revierte el stock una sola vez y deja auditoria.
- `reporte_ventas_productos` es `SECURITY INVOKER`: RLS limita lo visible.
- Las RPC publicas de escritura solo las ejecuta `service_role` (Edge Function).
