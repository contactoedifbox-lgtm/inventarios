# Operacion — LankaPets v2.0

## Roles

| Rol | Puede |
|---|---|
| Maestro | Todo: costos, anulaciones, ajustes de stock, anonimizacion, usuarios |
| Vendedor | Inventario (sin costos), ventas, devoluciones, clientes, agenda, reportes |

Todos los Vendedores ven todas las ventas. Los costos solo los ve el Maestro.

## Flujos diarios

### Vender

1. Ir a **Ventas**.
2. Escanear con la pistola o buscar por nombre.
3. Ajustar cantidades y elegir medio de pago.
4. **Confirmar venta**: el servidor valida stock, calcula IVA y total, descuenta
   stock y escribe el kardex en una sola transaccion.

El stock nunca queda negativo: si no alcanza, la venta se rechaza.

### Devolver

1. Registrar la devolucion indicando el motivo.
2. Marcar si el producto reingresa al stock (si vuelve danado, no reingresa).

### Anular (solo Maestro)

Las ventas no se borran: se anulan. La anulacion revierte el stock y deja
auditoria con usuario, fecha y motivo.

### Ingresar mercaderia

Usar la RPC `registrar_ingreso` con proveedor, documento y items. Suma stock y
registra kardex.

### Ajustar stock (solo Maestro)

Usar `ajustar_stock` tras un conteo fisico. Queda registrado el delta y el motivo.

### Agendar

- **Interno**: crear reserva desde **Agenda**. Se puede forzar fuera de horario
  para emergencias, pero nunca solapar dos reservas del mismo profesional.
- **Publico**: el cliente reserva en `#/reservar` con RUT validado, consentimiento
  y verificacion anti-bot.

## Privacidad (Ley 21.719)

- El formulario publico registra `consentimiento_datos_at`.
- Se minimizan los datos: solo lo necesario para la reserva.
- `anonimizar_cliente(cliente_id)` (solo Maestro) reemplaza los datos personales
  por placeholders y conserva las ventas asociadas.
- Los intentos de reserva publica se eliminan a los 30 dias.

## Mantenimiento

| Tarea | Frecuencia |
|---|---|
| Revisar `auditoria` de cambios sensibles | Semanal |
| Verificar backups (plan Pro) | Diario |
| Limpiar `intentos_reserva_publica` | Mensual |
| Rotar claves `sb_secret_` y Turnstile | Ante sospecha o cambio de personal |

## Incidentes

1. Si se filtra una clave secret: rotarla en Supabase y actualizar los secretos de
   las Edge Functions.
2. Si hay abuso en la reserva publica: revisar `intentos_reserva_publica` y ajustar
   el limite en la Edge Function.
3. Si el stock no cuadra: revisar `movimientos_inventario` por producto; el kardex
   es la fuente de verdad.
