# LankaPets v2.0 — Especificación Técnica Completa

> **Propósito de este documento**
> Servir como **especificación funcional y técnica única y completa** de la aplicación
> web LankaPets v2.0, de modo que **otro agente de IA pueda construir una aplicación
> Android nativa** que se conecte al **mismo backend Supabase** y opere **exactamente
> igual** que la web (mismos datos, mismas reglas de negocio, mismos permisos).
>
> Todo lo aquí descrito está extraído del código real (migraciones SQL, Edge Functions,
> capa de datos TypeScript y pantallas React). No hay supuestos: si algo no está en el
> código, no está en este documento.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Tecnologías y arquitectura](#2-tecnologías-y-arquitectura)
3. [Backend Supabase: conexión](#3-backend-supabase-conexión)
4. [Modelo de datos completo](#4-modelo-de-datos-completo)
5. [Seguridad: roles, RLS y permisos](#5-seguridad-roles-rls-y-permisos)
6. [Contratos RPC (funciones de base de datos)](#6-contratos-rpc-funciones-de-base-de-datos)
7. [Edge Functions](#7-edge-functions)
8. [Autenticación y sesión](#8-autenticación-y-sesión)
9. [Reglas de negocio clave](#9-reglas-de-negocio-clave)
10. [Pantallas y funcionalidad por rol](#10-pantallas-y-funcionalidad-por-rol)
11. [Flujos principales (diagramas de secuencia)](#11-flujos-principales-diagramas-de-secuencia)
12. [Guía de implementación para la app Android](#12-guía-de-implementación-para-la-app-android)
13. [Anexos](#13-anexos)

---

## 1. Resumen ejecutivo

**LankaPets v2.0** es un ERP de gestión veterinaria ("Lanka Pet Care") compuesto por:

- **App web interna** (React + Vite + TypeScript) con login, dashboard, inventario,
  ventas, clientes/mascotas, agenda, reportes y gestión de personal.
- **Página pública de reserva** (`#/reservar`) para que cualquier persona agende una hora
  sin cuenta, protegida con Cloudflare Turnstile y rate limiting.
- **Backend Supabase** (PostgreSQL + Auth + Edge Functions) con **RLS estricto** y
  **GRANT explícito** por columna. Toda la lógica sensible (precios, IVA, stock, totales,
  validaciones) vive en **funciones RPC `SECURITY DEFINER`** en la base de datos. El
  cliente **nunca** calcula ni envía precios, IVA, totales ni stock.

**Roles del sistema:** `maestro` (dueño, acceso total), `vendedor` (personal operativo:
vendedores, veterinarios, peluqueros) y `cliente` (dueño de mascota, autoregistrado).

**Principio rector para la app Android:** la app Android debe ser un **cliente delgado**
del mismo backend. Debe:
1. Autenticarse con Supabase Auth (email/contraseña y Google).
2. Leer/escribir mediante las **mismas tablas, vistas y RPC** que usa la web.
3. Respetar los **mismos roles y RLS** (el backend ya impone las reglas; la app solo
   oculta/muestra UI según el rol).
4. **Nunca** calcular precios, IVA, totales ni stock: siempre delegar en las RPC.

---

## 2. Tecnologías y arquitectura

### 2.1 Stack de la aplicación web (referencia)

| Capa | Tecnología |
|------|-----------|
| UI | React 18 + TypeScript |
| Build | Vite 5 |
| Ruteo | React Router 6 (`createHashRouter`) |
| Estado servidor | TanStack Query v5 |
| Validación | Zod |
| Estilos | Tailwind CSS 3 |
| Exportación Excel | ExcelJS |
| Cliente backend | `@supabase/supabase-js` v2 |
| Fechas | `date-fns` + `Intl` (zona `America/Santiago`) |
| Tests | Vitest + Testing Library + Playwright |

### 2.2 Backend

| Componente | Detalle |
|-----------|---------|
| Base de datos | PostgreSQL (Supabase) |
| Auth | Supabase Auth (email/password + Google OAuth, PKCE) |
| API | PostgREST (auto-generada) + RPC |
| Lógica de negocio | Funciones PL/pgSQL `SECURITY DEFINER` |
| Serverless | Edge Functions (Deno) |
| Seguridad | RLS + GRANT por columna + helpers `private.*` |

### 2.3 Diagrama de arquitectura

```
┌──────────────────────────┐        ┌──────────────────────────┐
│   App Web (React SPA)    │        │   App Android (a crear)  │
│   GitHub Pages           │        │   Kotlin / supabase-kt   │
└────────────┬─────────────┘        └────────────┬─────────────┘
             │  HTTPS (PostgREST + Auth + RPC)   │
             └───────────────┬───────────────────┘
                             ▼
             ┌───────────────────────────────────┐
             │        SUPABASE (proyecto)         │
             │  ┌─────────────────────────────┐   │
             │  │ Auth (GoTrue)               │   │
             │  │ PostgREST  → tablas/vistas  │   │
             │  │ RPC        → funciones SQL  │   │
             │  │ RLS + GRANT por columna     │   │
             │  └─────────────────────────────┘   │
             │  ┌─────────────────────────────┐   │
             │  │ Edge Functions (Deno)       │   │
             │  │  · reserva-publica          │   │
             │  │  · admin-usuarios           │   │
             │  └─────────────────────────────┘   │
             └───────────────────────────────────┘
                             ▲
                             │ (solo service_role)
                    Cloudflare Turnstile
```

### 2.4 Estructura de carpetas de la web (referencia)

```
src/
  lib/            api.ts, hooks.ts, types.ts, supabase.ts, dateRanges.ts,
                  format.ts, rut.ts, schemas.ts, queryClient.ts
  features/
    auth/         AuthProvider, LoginPage, RegistroPage, EstablecerClavePage
    dashboard/    DashboardPage
    inventario/   InventarioPage
    ventas/       VentasPage
    clientes/     ClientesPage, MisDatosPage
    agenda/       AgendaPage
    personal/     PersonalPage
    reservas/     ReservasPage
    reportes/     ReportesPage
    publico/      ReservaPublicaPage
  components/
    layout/       AppShell, RequireAuth
    ui/           Modal, RangoFiltro, CampoRut, CampoTelefono
    scanner/      BarcodeScanner
supabase/
  migrations/     0001..0029 (esquema, RLS, RPC)
  functions/      reserva-publica, admin-usuarios
```

---

## 3. Backend Supabase: conexión

### 3.1 Datos de conexión

| Parámetro | Valor |
|-----------|-------|
| Project ref | `vparxfmoqfaahsdqmjcf` |
| URL | `https://vparxfmoqfaahsdqmjcf.supabase.co` |
| Clave pública (publishable / anon) | `sb_publishable_kD6bulbCcinXkZZ9_4kM2Q_6OhBGMd7` |
| Zona horaria de negocio | `America/Santiago` |

> La **clave publishable/anon** es pública y puede ir embebida en la app Android.
> La **service_role key** NUNCA debe incluirse en la app: solo la usan las Edge Functions.

### 3.2 Cómo consume la web el backend

La web usa `@supabase/supabase-js` con:
- `persistSession: true`, `autoRefreshToken: true`
- `detectSessionInUrl: false`, `flowType: 'pkce'` (el retorno de OAuth y los enlaces de
  recuperación/invitación se procesan manualmente).

La app Android debe replicar este comportamiento con **supabase-kt** (recomendado) o
llamadas REST directas. Ver [sección 12](#12-guía-de-implementación-para-la-app-android).

### 3.3 Endpoints REST equivalentes (PostgREST)

| Operación | Método y ruta |
|-----------|---------------|
| Listar/leer tabla | `GET /rest/v1/{tabla}?select=...&filtros` |
| Insertar | `POST /rest/v1/{tabla}` |
| Actualizar | `PATCH /rest/v1/{tabla}?id=eq.{id}` |
| Eliminar | `DELETE /rest/v1/{tabla}?id=eq.{id}` |
| Llamar RPC | `POST /rest/v1/rpc/{nombre_funcion}` |
| Invocar Edge Function | `POST /functions/v1/{nombre}` |

Cabeceras obligatorias: `apikey: <publishable>`, `Authorization: Bearer <access_token>`,
`Content-Type: application/json`.

---

## 4. Modelo de datos completo

### 4.1 Tipos enumerados (ENUM)

```sql
rol_usuario        = ('maestro', 'vendedor', 'cliente')
tipo_venta         = ('venta', 'devolucion')
estado_venta       = ('completada', 'anulada')
medio_pago         = ('efectivo', 'debito', 'credito', 'transferencia')
tipo_movimiento    = ('venta', 'devolucion', 'ingreso', 'ajuste', 'anulacion')
area_agenda        = ('veterinaria', 'peluqueria')
estado_reserva     = ('confirmada', 'completada', 'cancelada', 'no_asistio')
origen_reserva     = ('interno', 'web')
especie            = ('perro', 'gato', 'otro')
modo_excepcion     = ('cerrar', 'abrir')
tipo_personal      = ('vendedor', 'veterinario', 'peluquero')
genero_personal    = ('masculino', 'femenino')
```

### 4.2 Tablas

#### `configuracion` (una sola fila)
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | boolean PK | `default true check (id)` |
| `iva_porcentaje` | numeric(4,2) | default `19.00` |
| `zona_horaria` | text | default `'America/Santiago'` |
| `corte_medio_dia` | time | default `'13:00'` — **no usado** por la app ni por las RPC (legacy) |
| `reserva_anticipacion_min_horas` | int | default `2` |
| `reserva_max_dias` | int | default `60` |
| `reserva_max_activas_por_contacto` | int | default `3` |
| `nombre_negocio` | text | default `'LankaPets'` |
| `updated_at`, `updated_by` | timestamptz, uuid | |

#### `perfiles` (1 por usuario de Auth)
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | FK → `auth.users(id)` on delete cascade |
| `nombre_completo` | text | |
| `rol` | `rol_usuario` | default `'vendedor'` |
| `activo` | boolean | default `true` |
| `created_at`, `updated_at`, `updated_by` | | |

#### `auditoria` (bitácora)
`id` bigint identity PK, `tabla` text, `registro_id` text, `accion` text, `usuario_id` uuid,
`antes` jsonb, `despues` jsonb, `created_at` timestamptz.

#### `productos`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `codigo_barras` | text | único (parcial, si no es null) |
| `nombre` | text | |
| `descripcion` | text | |
| `stock` | int | `>= 0`, **solo cambia por RPC** |
| `stock_minimo` | int | `>= 0` |
| `precio_venta_neto` | int | **calculado por trigger** desde el total |
| `iva_precio_venta` | int | **calculado por trigger** |
| `precio_venta_total` | int | **dato de entrada** (bruto) |
| `activo` | boolean | default `true` |
| `created_at`, `updated_at`, `updated_by` | | |

> **Importante:** el cliente envía `precio_venta_total` (con IVA). El trigger
> `private.calcular_iva_producto()` calcula `precio_venta_neto = round(total / (1 + iva/100))`
> e `iva_precio_venta = total - neto`. El GRANT **no permite** escribir `precio_venta_neto`.

#### `productos_costos` (solo Maestro)
`producto_id` uuid PK FK → productos, `costo_neto` int, `iva_costo` int (trigger),
`costo_total` int (trigger), `updated_at`, `updated_by`.

#### `proveedores`
`id` uuid PK, `nombre`, `rut`, `telefono`, `email`, `activo`, timestamps.

#### `ingresos_inventario` / `ingreso_items`
Cabecera y detalle de una recepción de mercadería. `ingreso_items(ingreso_id, producto_id, cantidad)`.

#### `movimientos_inventario` (kardex, solo inserción)
`id` bigint identity PK, `producto_id`, `tipo tipo_movimiento`, `cantidad` int (≠0),
`stock_resultante` int, `referencia_id` uuid, `motivo` text, `usuario_id`, `created_at`.

#### `ventas`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `numero` | bigint identity unique | folio |
| `tipo` | `tipo_venta` | default `'venta'` |
| `venta_origen_id` | uuid | FK a ventas (para devoluciones) |
| `vendedor_id` | uuid | FK → perfiles |
| `medio_pago` | `medio_pago` | |
| `total_neto`, `total_iva`, `total` | int | calculados por RPC |
| `descuento` | int | default `0` |
| `descripcion_descuento` | text | |
| `estado` | `estado_venta` | default `'completada'` |
| `motivo` | text | |
| `anulada_por`, `anulada_at` | uuid, timestamptz | |
| `created_at` | timestamptz | |

#### `venta_items` (copia histórica)
`id` uuid PK, `venta_id`, `producto_id`, `nombre_producto`, `codigo_barras`,
`precio_unitario_neto` int, `iva_unitario` int, `cantidad` int, `total_linea` int,
`reingresa_stock` boolean default `true`.

#### `venta_items_costos` (solo Maestro)
`venta_item_id` uuid PK FK → venta_items, `costo_unitario_neto` int.

#### `clientes`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `nombres`, `apellidos` | text | |
| `rut` | text | único (salvo `'ANONIMO'`), validado módulo 11 |
| `telefono` | text | |
| `email` | citext | |
| `direccion`, `notas` | text | |
| `origen` | `origen_reserva` | default `'interno'` |
| `consentimiento_datos_at` | timestamptz | Ley 21.719 |
| `created_at`, `created_by`, `updated_at`, `updated_by` | | |

#### `mascotas`
`id` uuid PK, `cliente_id` FK (cascade), `nombre`, `especie especie`, `raza`, `peso_kg`
numeric(5,2), `sexo`, `fecha_nacimiento` date, `esterilizado` boolean, `observaciones`,
`activa` boolean default `true`, timestamps.

#### `profesionales` (personal)
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `nombre` | text | |
| `area` | `area_agenda` | **derivada del tipo** por trigger |
| `tipo` | `tipo_personal` | default `'veterinario'` |
| `genero` | `genero_personal` | default `'masculino'` |
| `especialidad` | text | texto libre |
| `perfil_id` | uuid | FK → perfiles (cuenta de acceso) |
| `duracion_slot_min` | int | 5–240, default `30` |
| `color` | text | |
| `orden` | int | default `0` |
| `activo` | boolean | default `true` |
| `email` | citext | |
| timestamps | | |

> **Regla:** `area` se deriva del `tipo`: `peluquero → peluqueria`, el resto → `veterinaria`.
> Los **vendedores NO aparecen** en la agenda ni en la reserva pública.

#### `horarios_semanales` (plantilla semanal)
`id` uuid PK, `profesional_id` FK (cascade), `dia_semana` smallint 1–7 (ISO: 1=lunes),
`hora_inicio` time, `hora_fin` time, `inicio_min`/`fin_min` int generados.
Restricción `EXCLUDE` anti-solape por profesional/día.

#### `excepciones_agenda`
`id` uuid PK, `profesional_id` (o `area`), `fecha_desde`, `fecha_hasta`, `hora_inicio`,
`hora_fin`, `modo modo_excepcion` (`cerrar`/`abrir`), `motivo`, `created_at`.
Sirve para feriados, vacaciones, medios días y aperturas puntuales.

#### `reservas`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `profesional_id` | uuid | FK |
| `cliente_id` | uuid | FK (cascade) |
| `mascota_id` | uuid | FK (set null) |
| `inicio`, `fin` | timestamptz | `fin > inicio` |
| `estado` | `estado_reserva` | default `'confirmada'` |
| `motivo` | text | ≤ 500 |
| `origen` | `origen_reserva` | default `'interno'` |
| `fuera_de_horario` | boolean | default `false` |
| `creada_por` | uuid | FK perfiles |
| `token_gestion_hash` | text | reserva pública |
| `notas_internas` | text | |
| `cancelada_at`, `cancelada_motivo` | | |
| `created_at`, `updated_at`, `updated_by` | | |

Restricción `EXCLUDE` anti doble-reserva por profesional (excepto canceladas).

#### `intentos_reserva_publica` (anti-abuso, solo service_role)
`id` bigint identity PK, `ip_hash`, `email_norm`, `telefono_norm`, `resultado`, `created_at`.

#### `reservas_productos` (apartado de producto, 1 día)
`id` uuid PK, `producto_id`, `perfil_id` FK (cascade), `cantidad` int > 0,
`estado` text (`pendiente`/`retirada`/`cancelada`/`vencida`), `expira_at` timestamptz
(default `now() + 1 day`), `notas`, timestamps.

#### `encargos_productos` (pedido de producto sin stock)
`id` uuid PK, `producto_id`, `perfil_id` FK (cascade), `cantidad` int > 0,
`estado` text (`pendiente`/`entregado`/`cancelado`), `notas`, `fecha_entrega` date, timestamps.

### 4.3 Vistas

| Vista | Contenido | Notas |
|-------|-----------|-------|
| `v_inventario` | productos + costos + `stock_bajo` + `margen_neto` | `security_invoker`; para vendedor las columnas de costo llegan **null** |
| `v_perdidas` | devoluciones completadas con `reingresa_stock = false` | pérdidas; **no consumida por la app** (solo web/consulta manual) |
| `v_reservas_producto` | reservas de productos + nombre producto/perfil | |
| `v_encargos_producto` | encargos + nombre producto/perfil + `fecha_entrega` | |

### 4.4 Diagrama entidad-relación (simplificado)

```
auth.users 1──1 perfiles
perfiles   1──* profesionales (perfil_id)
perfiles   1──* reservas_productos / encargos_productos (perfil_id)
perfiles   1──* ventas (vendedor_id)

clientes   1──* mascotas
clientes   1──* reservas
mascotas   1──* reservas

profesionales 1──* horarios_semanales
profesionales 1──* excepciones_agenda
profesionales 1──* reservas

productos  1──1 productos_costos
productos  1──* movimientos_inventario
productos  1──* venta_items
productos  1──* reservas_productos / encargos_productos

ventas     1──* venta_items
venta_items 1──1 venta_items_costos
ventas     1──* ventas (venta_origen_id, devoluciones)
```

---

## 5. Seguridad: roles, RLS y permisos

### 5.1 Roles

| Rol | Descripción | Alcance |
|-----|-------------|---------|
| `maestro` | Dueño / administrador | Todo el sistema |
| `vendedor` | Personal operativo (vendedor, veterinario, peluquero) | Operación diaria, sin costos ni gestión de personal |
| `cliente` | Dueño de mascota autoregistrado | Solo sus datos, sus reservas y reservar productos |

### 5.2 Funciones helper (esquema `private`, no expuesto a la API)

| Función | Devuelve | Uso |
|---------|----------|-----|
| `private.es_personal()` | boolean | `true` si el usuario es maestro o vendedor activo |
| `private.es_maestro()` | boolean | `true` si es maestro activo |
| `private.es_cliente()` | boolean | `true` si es cliente activo |
| `private.cliente_id_actual()` | uuid | id de `clientes` vinculado por email al usuario |
| `private.validar_rut(text)` | boolean | valida RUT (módulo 11) |
| `private.normalizar_rut(text)` | text | deja `12345678-K` |
| `private.esta_en_horario(prof, inicio, fin)` | boolean | si el rango cae en horario configurado |
| `private.fin_ventana(prof, inicio)` | timestamptz | fin de la ventana de atención |

### 5.3 Matriz de permisos por tabla (RLS)

| Tabla | maestro | vendedor | cliente | anon |
|-------|:-------:|:--------:|:-------:|:----:|
| `configuracion` | SELECT/UPDATE | SELECT | SELECT | — |
| `perfiles` | SELECT/INSERT/UPDATE | SELECT | SELECT (propio) | — |
| `auditoria` | SELECT | — | — | — |
| `productos` | SELECT/INSERT/UPDATE | SELECT/INSERT/UPDATE (sin `stock`) | SELECT | — |
| `productos_costos` | ALL | — | — | — |
| `proveedores` | ALL | ALL | — | — |
| `movimientos_inventario` | SELECT | SELECT | — | — |
| `ventas` / `venta_items` | SELECT | SELECT | — | — |
| `venta_items_costos` | SELECT | — | — | — |
| `clientes` | ALL | ALL | SELECT (propio) | — |
| `mascotas` | ALL | ALL | SELECT/INSERT (propias) | — |
| `profesionales` | ALL | SELECT | SELECT | — |
| `horarios_semanales` | ALL | SELECT | SELECT | — |
| `excepciones_agenda` | ALL | SELECT | SELECT | — |
| `reservas` | SELECT | SELECT | SELECT (propias) | — |
| `reservas_productos` | SELECT/INSERT/UPDATE | SELECT/INSERT/UPDATE | SELECT/INSERT/UPDATE (propias) | — |
| `encargos_productos` | SELECT/INSERT/UPDATE | SELECT/INSERT/UPDATE | SELECT/INSERT/UPDATE (propios) | — |
| `intentos_reserva_publica` | — | — | — | — (solo service_role) |

> **Nota clave:** el **stock** de `productos` NO es escribible directamente por ningún rol
> (el GRANT excluye la columna `stock`). Solo cambia por RPC (`registrar_ingreso`,
> `ajustar_stock`, `registrar_venta`, `registrar_devolucion`, `anular_venta`).

### 5.4 GRANT por columna (crítico)

```sql
-- productos: el cliente autenticado puede insertar/actualizar SOLO estas columnas
grant insert (codigo_barras, nombre, descripcion, stock_minimo, precio_venta_total, activo) on productos to authenticated;
grant update (codigo_barras, nombre, descripcion, stock_minimo, precio_venta_total, activo) on productos to authenticated;
-- NO se otorga insert/update sobre stock, precio_venta_neto ni iva_precio_venta
```

### 5.5 Triggers de protección

| Trigger | Efecto |
|---------|--------|
| `private.set_updated_at()` | escribe `updated_at` y `updated_by` |
| `private.auditar()` | registra en `auditoria` (usa `to_jsonb(...)->>'id'`) |
| `private.proteger_campos_perfil()` | solo maestro cambia `rol`/`activo` |
| `private.proteger_ultimo_maestro()` | impide degradar/desactivar al último maestro (permite DELETE administrativo) |
| `private.calcular_iva_producto()` | deriva neto e IVA desde `precio_venta_total` |
| `private.calcular_iva_costo()` | deriva IVA y total de costo desde `costo_neto` |
| `private.derivar_area_profesional()` | `area` se deriva de `tipo` |
| `private.crear_perfil_cliente()` | al crear usuario en `auth.users` crea `perfiles` (rol cliente) y ficha en `clientes` |

---

## 6. Contratos RPC (funciones de base de datos)

Todas las RPC de escritura son `SECURITY DEFINER` con `set search_path = ''` y validan el
rol internamente. La app Android debe llamarlas vía `POST /rest/v1/rpc/{nombre}`.

### 6.1 Inventario

| RPC | Parámetros | Devuelve | Rol | Descripción |
|-----|-----------|----------|-----|-------------|
| `registrar_ingreso` | `p_items jsonb`, `p_proveedor_id uuid`, `p_documento text`, `p_notas text` | uuid | personal | Suma stock y registra kardex `ingreso` |
| `ajustar_stock` | `p_producto_id uuid`, `p_nuevo_stock int`, `p_motivo text` | bigint | personal | Fija stock exacto, kardex `ajuste` |

`p_items` = `[{ "producto_id": "<uuid>", "cantidad": 5 }, ...]`

### 6.2 Ventas

| RPC | Parámetros | Devuelve | Rol |
|-----|-----------|----------|-----|
| `registrar_venta` | `p_items jsonb`, `p_medio_pago medio_pago`, `p_descuento int`, `p_descripcion_descuento text` | jsonb | personal |
| `registrar_devolucion` | `p_items jsonb`, `p_medio_pago medio_pago`, `p_motivo text`, `p_venta_origen_id uuid` | jsonb | personal |
| `anular_venta` | `p_venta_id uuid`, `p_motivo text` | void | maestro |
| `reporte_ventas_productos` | `p_desde timestamptz`, `p_hasta timestamptz`, `p_agrupar text` | table | personal |

`p_items` (venta) = `[{ "producto_id": "<uuid>", "cantidad": 2 }, ...]`
`p_items` (devolución) = `[{ "producto_id": "<uuid>", "cantidad": 1, "reingresa_stock": true }, ...]`

**Retorno de `registrar_venta` / `registrar_devolucion`:**
```json
{ "venta_id": "uuid", "numero": 123, "total_neto": 10000, "total_iva": 1900, "descuento": 0, "total": 11900 }
```

**Reglas internas de `registrar_venta`:**
- Valida `es_personal()`.
- Bloquea productos en orden estable (`order by producto_id`) para evitar deadlocks.
- Verifica producto activo y stock suficiente.
- Copia precio/IVA vigentes a `venta_items` (histórico).
- Si es maestro, copia el costo vigente a `venta_items_costos`.
- Descuenta stock y registra kardex `venta`.
- `descuento` no puede superar el total.

**Reglas de `registrar_devolucion`:**
- Si apunta a una venta (`p_venta_origen_id`), usa el **precio histórico** de esa venta.
- Si `reingresa_stock = true`, devuelve stock y registra kardex `devolucion`.
- Si `reingresa_stock = false`, no toca stock (queda como pérdida en `v_perdidas`).

**Reglas de `anular_venta` (maestro):**
- Revierte stock: si era venta, suma; si era devolución con reingreso, resta.
- Marca `estado = 'anulada'`, `anulada_por`, `anulada_at`, `motivo`.

### 6.3 Clientes

| RPC | Parámetros | Devuelve | Rol |
|-----|-----------|----------|-----|
| `anonimizar_cliente` | `p_cliente_id uuid` | void | maestro |
| `eliminar_cliente` | `p_cliente_id uuid` | void | maestro |
| `actualizar_mis_datos` | `p_nombres text`, `p_apellidos text`, `p_rut text`, `p_telefono text` | void | cliente |

`eliminar_cliente` borra mascotas, reservas, la ficha y la cuenta de Auth asociada (por email).

### 6.4 Agenda

| RPC | Parámetros | Devuelve | Rol |
|-----|-----------|----------|-----|
| `crear_reserva_interna` | `p_profesional_id uuid`, `p_cliente_id uuid`, `p_mascota_id uuid`, `p_inicio timestamptz`, `p_fin timestamptz`, `p_motivo text`, `p_forzar_fuera_horario boolean` | uuid | personal |
| `cambiar_estado_reserva` | `p_reserva_id uuid`, `p_estado estado_reserva`, `p_motivo text` | void | personal |
| `crear_reserva_cliente` | `p_profesional_id uuid`, `p_mascota_id uuid`, `p_inicio timestamptz`, `p_motivo text` | uuid | cliente |
| `cancelar_mi_reserva` | `p_reserva_id uuid`, `p_motivo text` | void | cliente/personal |
| `horarios_disponibles` | `p_profesional_id uuid`, `p_desde date`, `p_hasta date` | table(inicio, fin) | anon+auth |
| `horarios_disponibles` (4 args) | `+ p_ignorar_anticipacion boolean` | table(inicio, fin) | auth |
| `agenda_ocupacion` | `p_desde timestamptz`, `p_hasta timestamptz` | table(profesional_id, inicio, fin) | auth |
| `profesionales_publicos` | — | table(id, nombre, area) | anon+auth |
| `config_publica` | — | table(nombre_negocio, reserva_anticipacion_min_horas, reserva_max_dias, reserva_max_activas_por_contacto) | anon+auth |

**Reglas de disponibilidad (`horarios_disponibles`):**
- Genera bloques según `duracion_slot_min` dentro de las ventanas de `horarios_semanales`
  (por día ISO) más las excepciones `abrir`.
- Excluye bloques ocupados por reservas no canceladas y bloques cerrados por excepciones `cerrar`.
- Respeta `reserva_anticipacion_min_horas` (salvo `p_ignorar_anticipacion = true`).
- **Bloque parcial final:** el último bloque puede ser más corto que el slot; se ofrece y la
  reserva se ajusta para terminar al final de la jornada (`private.fin_ventana`).

### 6.5 Reservas de productos y encargos

| RPC | Parámetros | Devuelve | Rol |
|-----|-----------|----------|-----|
| `crear_reserva_producto` | `p_producto_id uuid`, `p_cantidad int`, `p_notas text` | uuid | personal/cliente |
| `cancelar_reserva_producto` | `p_id uuid` | void | dueño/personal |
| `marcar_reserva_retirada` | `p_id uuid` | void | personal |
| `expirar_reservas_producto` | — | int | (manual; **sin cron configurado**) |
| `crear_encargo_producto` | `p_producto_id uuid`, `p_cantidad int`, `p_notas text` | uuid | personal/cliente |
| `cambiar_estado_encargo` | `p_id uuid`, `p_estado text` | void | personal |
| `programar_entrega_encargo` | `p_id uuid`, `p_fecha date` | void | personal |

### 6.6 Dashboard y reportes

| RPC | Parámetros | Devuelve | Rol |
|-----|-----------|----------|-----|
| `dashboard_resumen` | `p_desde timestamptz`, `p_hasta timestamptz` | jsonb | personal |
| `reservas_resumen` | — | jsonb | personal |
| `ranking_productos` | `p_desde timestamptz`, `p_hasta timestamptz` | table | personal |

**Forma de `dashboard_resumen`:**
```json
{
  "ventas":      { "total": 0, "neto": 0, "iva": 0, "unidades": 0 },
  "documentos":  { "ventas": 0, "devoluciones": 0 },
  "reservas":    { "total": 0, "confirmadas": 0, "completadas": 0 },
  "inventario":  { "productos": 0, "stock_total": 0, "stock_bajo": 0, "agotados": 0 }
}
```

**Forma de `reservas_resumen`:** `{ "dia": 0, "semana": 0, "mes": 0 }`

**Forma de `ranking_productos`:** filas con `producto_id, nombre, unidades, total,
ultima_venta, dias_detenido`.

### 6.7 RPC públicas de escritura (solo `service_role`)

| RPC | Parámetros | Devuelve |
|-----|-----------|----------|
| `crear_reserva_publica` | `p_profesional_id uuid`, `p_inicio timestamptz`, `p_motivo text`, `p_cliente jsonb`, `p_mascota jsonb` | jsonb `{reserva_id, token_gestion}` |
| `cancelar_reserva_publica` | `p_token text` | void |

Estas **no** son invocables por `anon` ni `authenticated`: solo la Edge Function
`reserva-publica` (con service_role) las llama.

---

## 7. Edge Functions

### 7.1 `reserva-publica`

- **Ruta:** `POST /functions/v1/reserva-publica`
- **Auth:** ninguna (pública), pero protegida por Turnstile + rate limit.
- **Variables de entorno:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `TURNSTILE_SECRET_KEY`, `IP_SALT`.
- **Flujo:**
  1. Calcula `ip_hash = sha256(ip + IP_SALT)`.
  2. **Rate limit:** máximo **3 intentos por hora** por IP o email (tabla
     `intentos_reserva_publica`). Si excede → `429`.
  3. Verifica el token de **Cloudflare Turnstile** contra
     `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
  4. Valida datos mínimos (`profesional_id`, `inicio`, `cliente`, `mascota`).
  5. Llama a la RPC `crear_reserva_publica` (service_role).
  6. Registra el intento (`ok`, `rate_limited`, `turnstile_fallido`, `datos_incompletos`, `error`).
- **Body:**
```json
{
  "profesional_id": "uuid",
  "inicio": "2026-11-19T12:00:00.000Z",
  "motivo": "Control",
  "turnstile_token": "...",
  "cliente": { "nombres": "", "apellidos": "", "rut": "", "telefono": "", "email": "" },
  "mascota": { "nombre": "", "especie": "perro", "raza": "", "peso_kg": 0 }
}
```
- **Respuesta 201:** `{ "reserva_id": "uuid", "token_gestion": "hex" }`

> ⚠️ **Hueco funcional conocido (cancelación pública):** existe la RPC
> `cancelar_reserva_publica(p_token)` pero es **solo `service_role`** y **no hay Edge Function
> pública** que la exponga. Es decir, hoy el `token_gestion` **solo se muestra** al usuario; la
> cancelación pública por token **no está implementada de punta a punta**. Si la app Android
> necesita cancelar una reserva pública, hay que **crear una Edge Function** (p. ej.
> `cancelar-reserva-publica`) que reciba el token y llame a la RPC con service_role.
>
> **DECISIÓN (app Android v1):** la cancelación pública por token queda **FUERA DE ALCANCE**.
> La app **solo muestra** el `token_gestion` (paridad con la web actual). **No** debe llamar a
> `cancelar_reserva_publica` (fallaría con 401/403 por ser `service_role`). La cancelación
> pública requiere trabajo de backend previo (crear la Edge Function).

### 7.2 `admin-usuarios`

- **Ruta:** `POST /functions/v1/admin-usuarios`
- **Auth:** requiere JWT de un **maestro** activo (se valida contra `perfiles`).
- **Acciones (`accion`):**
  - `crear_usuario` → crea usuario en Auth con `email_confirm: true` y perfil con el rol.
  - `actualizar_rol` → cambia el rol de un perfil.
  - `cambiar_estado` → activa/desactiva un perfil.
  - `invitar_usuario` → crea usuario con contraseña temporal y envía correo para que fije
    su contraseña (`resetPasswordForEmail`). Devuelve `{ id, correo_enviado, error_correo }`.
- **Nota:** el rol solo se toma de `raw_app_meta_data` (que el usuario no puede modificar);
  en autoregistro siempre es `cliente`.

---

## 8. Autenticación y sesión

### 8.1 Métodos soportados

1. **Email + contraseña** (`signInWithPassword`).
2. **Google OAuth** (PKCE, `signInWithOAuth`).
3. **Autoregistro de cliente** (`signUp` con metadata: `nombres`, `apellidos`, `rut`,
   `telefono`, `nombre_completo`).
4. **Recuperación de contraseña** (`resetPasswordForEmail` → enlace a `#/establecer-clave`).
5. **Invitación de personal** (Edge Function `admin-usuarios` → correo para fijar contraseña).

### 8.2 Flujo de sesión (web)

- Al cargar, se leen los enlaces de auth de la URL **antes** de que el router consuma el hash:
  - `#access_token=...&refresh_token=...&type=recovery|invite` → se cierra la sesión actual y
    se hace `setSession` con los tokens del enlace (para que la contraseña se cambie al
    usuario del enlace, no al que ya estaba conectado).
  - `?code=...` → `exchangeCodeForSession` (retorno de OAuth).
- `onAuthStateChange` mantiene la sesión; `PASSWORD_RECOVERY` activa el modo recuperación.
- El perfil se carga desde `perfiles` (y `tipo`/`genero` desde `profesionales` por `perfil_id`).
- **Optimización:** no se desmonta la pantalla en un refresco de token del mismo usuario.

### 8.3 Etiqueta de rol (UI)

- `maestro` → "Maestro"
- `vendedor` → según `tipo`/`genero`: Vendedor/Vendedora, Veterinario/Veterinaria,
  Peluquero/Peluquera canina
- `cliente` → "Cliente"

### 8.4 Para Android

- Usar **supabase-kt** con `Auth` (PKCE) y almacenamiento seguro de sesión
  (EncryptedSharedPreferences / DataStore).
- Deep links para OAuth y recuperación (equivalente a `redirectTo`).
- Tras login, cargar `perfiles` (rol) y `profesionales` (tipo/genero) para decidir la UI.

---

## 9. Reglas de negocio clave

### 9.1 IVA y precios

- El IVA se configura en `configuracion.iva_porcentaje` (default **19%**).
- **Producto:** el usuario ingresa el **precio total (bruto)**. El trigger calcula:
  - `precio_venta_neto = round(total / (1 + iva/100))`
  - `iva_precio_venta = total - neto`
- **Costo (solo maestro):** la UI pide el **costo total (bruto)**; la app calcula
  `costo_neto = round(total / (1 + iva/100))` y **envía `costo_neto`** al upsert de
  `productos_costos`. El trigger `private.calcular_iva_costo()` deriva `iva_costo` y
  `costo_total`. (El input real a la base es `costo_neto`, **no** el total.)
- **Venta:** el servidor recalcula todo desde `productos`; el cliente solo envía
  `producto_id` y `cantidad`.

### 9.2 Stock (kardex)

- El stock **solo** cambia por RPC. Cada cambio deja un registro en
  `movimientos_inventario` con `tipo` (`venta`, `devolucion`, `ingreso`, `ajuste`,
  `anulacion`), `cantidad` (con signo) y `stock_resultante`.
- No se puede vender más que el stock disponible.

### 9.3 Ventas, devoluciones y anulación

- **Venta:** descuenta stock, copia precios históricos, aplica descuento (≤ total).
- **Devolución:** puede reingresar stock o registrarse como pérdida (caducado/roto).
  Si apunta a una venta, usa el precio histórico.
- **Anulación (solo maestro):** revierte stock y marca la venta como anulada.

### 9.4 Agenda y disponibilidad

- Cada profesional tiene `duracion_slot_min` y un horario semanal (varios tramos por día).
- Las excepciones (`cerrar`/`abrir`) ajustan días u horas puntuales.
- Anti doble-reserva por restricción `EXCLUDE` (rango `tstzrange` por profesional).
- **Bloque parcial final:** el último bloque de una jornada puede ser más corto; se ofrece y
  la reserva termina al final de la jornada.
- Los **vendedores no tienen agenda** ni aparecen en la reserva pública.
- **REGLA DE ORO:** la app **NUNCA calcula slots ni totales**. Siempre llama a
  `horarios_disponibles` para obtener los bloques y a las RPC para los montos. El `fin` de
  cada slot lo devuelve la RPC (ya ajustado al fin de ventana); la app **no** debe recalcularlo.

### 9.5 Reservas de productos y encargos

- **Reserva de producto:** el cliente aparta un producto con stock; tiene **1 día** para
  retirarlo (`expira_at = now() + 1 day`). Estados: `pendiente → retirada | cancelada | vencida`.
- **Expiración (importante):** `expirar_reservas_producto` **no tiene cron configurado**, así
  que el estado en BD puede quedar en `pendiente` con `expira_at` ya pasado. La app **debe
  tratar como `vencida`** cualquier reserva `pendiente` con `expira_at < now()` (igual que la
  web, que lo calcula en el cliente).
- **Encargo:** el cliente pide un producto **sin stock**; el personal lo gestiona
  (`pendiente → entregado | cancelado`) y puede programar `fecha_entrega`.

### 9.6 Zona horaria (crítico)

- Toda la lógica de fechas usa **`America/Santiago`**.
- Conversión local→UTC: `chileAUtc(fecha, hora)` (calcula el offset real de la zona).
- Rangos: `rangoDiaLocal`, `rangoDe(tipo, desde, hasta)` con tipos `dia`, `semana`
  (lunes), `mes`, `anio`, `rango`.
- Formato de hora/fecha siempre con `timeZone: 'America/Santiago'`.
- **La app Android debe replicar esto** (usar `java.time` con `ZoneId.of("America/Santiago")`).

### 9.7 RUT y teléfono

- **RUT:** validación módulo 11; se normaliza a `12345678-K` (sin puntos, con guion, K mayúscula).
  Se puede guardar `'ANONIMO'` cuando no se conoce.
- **Teléfono:** se normaliza a `+569XXXXXXXX` (acepta 8 dígitos, 9XXXXXXXX, 56..., +56...).

### 9.8 Privacidad (Ley 21.719)

- `clientes.consentimiento_datos_at` registra el consentimiento.
- `anonimizar_cliente` (maestro) reemplaza PII por `'ANONIMO'` conservando ventas.

---

## 10. Pantallas y funcionalidad por rol

### 10.1 Navegación (AppShell)

| Ruta | Etiqueta | Roles |
|------|----------|-------|
| `/` | Inicio | maestro, vendedor, cliente |
| `/inventario` | Inventario | maestro, vendedor, cliente |
| `/reservas` | Reservas y encargos | maestro, vendedor |
| `/ventas` | Ventas | maestro, vendedor |
| `/clientes` | Clientes | maestro, vendedor |
| `/agenda` | Agenda | maestro, vendedor, cliente |
| `/reportes` | Reportes | maestro, vendedor |
| `/personal` | Personal | maestro |
| `/mis-datos` | Mis datos | cliente |
| `/login`, `/registro`, `/establecer-clave`, `/reservar` | (públicas) | — |

### 10.2 Inicio (Dashboard)

- **Personal:** KPIs de inventario (productos activos, unidades, stock bajo ≤3, agotados),
  ventas del rango (monto, neto, IVA, unidades, nº ventas, devoluciones), reservas
  (hoy/semana/mes) y **rotación de productos** (más vendidos / menos vendidos y detenidos).
- **Cliente:** reservas (hoy/semana/mes), **sus reservas de productos** (producto, cantidad,
  fecha reserva, fecha retiro, estado) y **sus encargos** (producto, cantidad, fecha encargo,
  fecha entrega, estado).

### 10.3 Inventario

- **Maestro:** crear/editar productos, exportar a Excel (incluye costos), ajustar stock,
  guardar costo.
- **Vendedor:** ver inventario (sin costos), sin crear/editar.
- **Cliente:** ver disponibilidad; el umbral es **`stock > 0` → "Disponible"**, **`stock = 0`
  → "Sin stock"** (no usa `stock_minimo`). Con stock → **Reservar**; sin stock → **Encargar**.
  Ve sus reservas y encargos.
- Búsqueda por nombre o código de barras (con lector).

### 10.4 Ventas (maestro/vendedor)

- Carrito con búsqueda/escáner, medio de pago, **descuento** y su descripción.
- Historial con filtro de rango; **Devolver** (con motivo: buen estado/caducado/roto/otro) y
  **Anular** (solo maestro). Exportación a Excel (solo maestro).

### 10.5 Clientes (maestro/vendedor)

- Listado con búsqueda; alta de cliente + mascota; eliminar (solo maestro).

### 10.6 Agenda

- **Personal:** bloques por profesional (libre/reservado/fuera de horario/cerrado), detalle de
  reserva, nueva reserva (cliente existente o nuevo), reservas del día, historial de consultas
  con exportación.
- **Cliente:** ve ocupación (sin datos de terceros), crea su reserva (exige datos completos y
  mascota), ve y cancela sus reservas.

### 10.7 Personal (solo maestro)

- CRUD de personal con `tipo` y `genero`; horario semanal por tramos; crear cuenta de acceso
  (invitación por correo); vincular perfil; activar/desactivar; eliminar.

### 10.8 Reservas y encargos (maestro/vendedor)

- Gestión de reservas de productos (retirada/cancelar) y encargos (entregado/cancelar,
  programar fecha de entrega).

### 10.9 Reportes (maestro/vendedor)

- Reporte de ventas por producto agrupado por día/semana/mes; exportación a Excel.

### 10.10 Mis datos (cliente)

- Editar datos personales; registrar y ver mascotas.

### 10.11 Reserva pública (`#/reservar`)

- Selección de profesional y fecha, horarios disponibles, datos del cliente y mascota,
  consentimiento, Turnstile. Devuelve un **token de gestión** para cancelar.

---

## 11. Flujos principales (diagramas de secuencia)

### 11.1 Inicio de sesión

```
Usuario → App: email + contraseña
App → Supabase Auth: signInWithPassword
Supabase Auth → App: session (access_token, refresh_token)
App → PostgREST: GET /perfiles?id=eq.{uid}
App → PostgREST: GET /profesionales?perfil_id=eq.{uid}
App: determina rol y muestra navegación
```

### 11.2 Registrar una venta

```
Usuario → App: agrega productos al carrito, elige medio de pago y descuento
App → RPC registrar_venta(p_items, p_medio_pago, p_descuento, p_descripcion)
  RPC: valida rol, bloquea productos, verifica stock, copia precios,
       descuenta stock, registra kardex, calcula totales
  RPC → App: { venta_id, numero, total_neto, total_iva, descuento, total }
App: muestra confirmación y refresca inventario/ventas
```

### 11.3 Crear una reserva (cliente)

```
Cliente → App: elige profesional, fecha y horario
App → RPC horarios_disponibles(prof, desde, hasta)
App → RPC crear_reserva_cliente(prof, mascota, inicio, motivo)
  RPC: valida es_cliente, ficha de cliente, mascota propia,
       solape, horario; inserta reserva
App: refresca "Mis reservas"
```

### 11.4 Reserva pública

```
Visitante → Web/App: completa formulario + Turnstile
App → Edge Function reserva-publica: { profesional_id, inicio, cliente, mascota, turnstile_token }
  EF: rate limit (3/h) → verifica Turnstile → RPC crear_reserva_publica
  EF → App: { reserva_id, token_gestion }
App: muestra el token (hoy solo informativo; ver nota de cancelación pública en 7.1)
```

### 11.5 Devolución

```
Usuario → App: selecciona venta, motivo y cantidades
App → RPC registrar_devolucion(items, medio_pago, motivo, venta_origen_id)
  RPC: usa precio histórico; si reingresa, devuelve stock; registra kardex
App: refresca ventas e inventario
```

---

## 12. Guía de implementación para la app Android

### 12.1 Enfoque recomendado

- **Lenguaje:** Kotlin (Jetpack Compose).
- **SDK:** **supabase-kt** (`io.github.jan-tennert.supabase`) con módulos `auth`,
  `postgrest`, `realtime` (opcional) y `functions`.
- **Arquitectura:** MVVM (ViewModel + StateFlow) + Repository.
- **Sesión:** almacenamiento seguro (EncryptedSharedPreferences / DataStore).
- **Fechas:** `java.time` con `ZoneId.of("America/Santiago")`.

### 12.2 Configuración inicial

```kotlin
val supabase = createSupabaseClient(
    supabaseUrl = "https://vparxfmoqfaahsdqmjcf.supabase.co",
    supabaseKey = "sb_publishable_kD6bulbCcinXkZZ9_4kM2Q_6OhBGMd7"
) {
    install(Auth) { /* PKCE, deep links */ }
    install(Postgrest)
    install(Functions)
}
```

### 12.3 Mapeo de operaciones (web → Android)

| Operación web | Equivalente Android |
|---------------|---------------------|
| `supabase.from('v_inventario').select('*')` | `supabase.from("v_inventario").select()` |
| `supabase.rpc('registrar_venta', ...)` | `supabase.postgrest.rpc("registrar_venta", params)` |
| `supabase.functions.invoke('reserva-publica', ...)` | `supabase.functions.invoke("reserva-publica", body)` |
| `supabase.auth.signInWithPassword(...)` | `supabase.auth.signInWith(Email)` |
| `supabase.auth.signInWithOAuth(Google)` | `supabase.auth.signInWith(Google)` + deep link |

### 12.4 Tablas y vistas a consumir (lectura)

- `v_inventario` (inventario)
- `ventas`, `venta_items` (historial)
- `clientes`, `mascotas` (clientes)
- `profesionales`, `horarios_semanales`, `excepciones_agenda` (agenda)
- `reservas` (con joins a `clientes`, `mascotas`)
- `v_reservas_producto`, `v_encargos_producto`
- `perfiles`, `configuracion`

### 12.5 RPC a invocar (escritura)

Ver [sección 6](#6-contratos-rpc-funciones-de-la-base-de-datos). **Nunca** escribir
directamente `stock`, `precio_venta_neto`, `iva_precio_venta`, totales de venta ni estados
de reserva: usar siempre las RPC.

### 12.6 Reglas de UI por rol

- Ocultar acciones según `perfil.rol` (igual que la web), pero **confiar en el RLS** para la
  seguridad real.
- `maestro`: todo. `vendedor`: sin costos, sin gestión de personal, sin anular ventas.
  `cliente`: solo sus datos, sus reservas y reservar/encargar productos.

### 12.7 Consideraciones específicas de Android

- **Escáner de código de barras:** usar CameraX + ML Kit (equivalente a `BarcodeScanner`).
- **Exportación Excel:** replicar con Apache POI o generar CSV (la web usa ExcelJS).
- **Zona horaria:** forzar `America/Santiago` en todas las conversiones.
- **Realtime (opcional):** suscribirse a `reservas` y `reservas_productos` para refrescar la
  agenda en vivo.
- **Deep links:** configurar para OAuth y recuperación de contraseña.
- **Turnstile:** la reserva pública requiere el widget de Cloudflare Turnstile (WebView o
  SDK) para obtener el token.

### 12.8 Checklist de paridad funcional

- [ ] Login email/contraseña + Google + recuperación.
- [ ] Autoregistro de cliente.
- [ ] Dashboard por rol (KPIs, rotación, reservas del cliente).
- [ ] Inventario (ver, crear/editar si maestro, reservar/encargar si cliente).
- [ ] Ventas (carrito, descuento, devolución, anulación si maestro, exportar).
- [ ] Clientes y mascotas (CRUD, eliminar si maestro).
- [ ] Agenda (bloques, nueva reserva, cancelar, historial, exportar).
- [ ] Personal (CRUD, horario semanal, invitar, activar/desactivar, eliminar). **Decisión v1:**
      la gestión de personal queda **solo en la web**; la app Android no incluye esta pantalla.
- [ ] Reservas y encargos (gestionar estados, programar entrega).
- [ ] Reportes (por producto, agrupación, exportar).
- [ ] Mis datos (editar, registrar mascotas).
- [ ] Reserva pública (con Turnstile).
- [ ] Mapear el catálogo de errores (Anexo B) a mensajes de UI en español.

---

## 13. Anexos

### 13.1 Variables de entorno (web)

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx
VITE_TURNSTILE_SITE_KEY=0x00000000000000000000000000000000
VITE_BASE_PATH=/inventarios/RCP_Veterinaria/
```

### 13.2 Secretos de las Edge Functions (Supabase)

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
TURNSTILE_SECRET_KEY
IP_SALT
```

### 13.3 Usuarios de prueba (SOLO DESARROLLO — rotar antes de producción)

> ⚠️ **Riesgo de seguridad:** estas credenciales son de un entorno de desarrollo. Si este
> documento se publica en un repositorio público, **rotar las contraseñas** y no reutilizarlas
> en producción.

| Email | Rol | Contraseña |
|-------|-----|-----------|
| `igneel.2@gmail.com` | maestro | `123456` |
| `contacto.edifbox@gmail.com` | vendedor | `123456` |
| `simon.e.monsalve@gmail.com` | cliente | `123456` |

### 13.4 Glosario

| Término | Significado |
|---------|-------------|
| **Maestro** | Rol administrador total |
| **Personal** | Maestro + Vendedor (operación) |
| **Cliente** | Dueño de mascota autoregistrado |
| **Slot** | Bloque de atención de duración fija (`duracion_slot_min`) |
| **Kardex** | Bitácora de movimientos de inventario |
| **Encargo** | Pedido de un producto sin stock |
| **Reserva de producto** | Apartado de un producto con stock (1 día para retirar) |
| **RPC** | Función de base de datos invocable por la API |
| **RLS** | Row Level Security (seguridad a nivel de fila) |

### 13.5 Orden de migraciones (referencia)

`0001` extensiones/tipos · `0002` config/perfiles/auditoría · `0003` inventario ·
`0004` ventas/devoluciones · `0005` clientes/mascotas · `0006` agenda ·
`0007` público anti-abuso · `0008` seed · `0009` fix auditar · `0010` hardening ·
`0011` borrar usuario auth · `0012` dashboard/pérdidas · `0013` rol cliente/especialidad ·
`0014` roles/policies/ranking · `0015` reservas de productos · `0016` horarios internos ·
`0017` reservas cliente · `0018` reservas updated_by · `0019` reservas cliente crear ·
`0020` registro clientes · `0021` eliminar clientes/profesionales · `0022` precio total/stock inicial ·
`0023` ventas descuento · `0024` personal tipos · `0025` ajustar stock personal ·
`0026` mascotas cliente insert · `0027` bloque parcial final · `0028` encargos ·
`0029` encargos fecha entrega.

---

## Anexo A — DTOs de lectura (formas exactas)

> Todas las lecturas se hacen con PostgREST. Los nombres de columna son **exactamente** los
> que devuelve la API. Los tipos son los de PostgreSQL. `null` indica que el campo puede venir
> nulo. La app debe mapear estos DTOs tal cual (no inventar nombres).
>
> **Zona horaria:** todos los `timestamptz` llegan en **UTC** (ISO 8601 con `Z` o `+00:00`).
> La app debe convertirlos a `America/Santiago` **solo para mostrar**; para enviar/consultar,
> usar UTC.
>
> **Numéricos:** PostgREST devuelve los `numeric`/`decimal` como **string** en JSON (p. ej.
> `"19.00"`, `"12.50"`), no como número. Parsear con `BigDecimal`/`toDouble()`, nunca asumir
> `Double` directo.

### A.1 `v_inventario` (inventario)

| Columna | Tipo | Nulo | Notas |
|---------|------|:----:|-------|
| `id` | uuid | no | |
| `codigo_barras` | text | sí | |
| `nombre` | text | no | |
| `descripcion` | text | sí | |
| `stock` | int | no | |
| `stock_minimo` | int | no | |
| `precio_venta_neto` | int | no | |
| `iva_precio_venta` | int | no | |
| `precio_venta_total` | int | no | |
| `activo` | boolean | no | |
| `stock_bajo` | boolean | no | `stock <= stock_minimo`; **el cliente debe ignorarlo** (usar solo `stock > 0`) |
| `costo_neto` | int | sí | **null para vendedor y cliente** |
| `iva_costo` | int | sí | **null para vendedor y cliente** |
| `costo_total` | int | sí | **null para vendedor y cliente** |
| `margen_neto` | int | sí | **null para vendedor y cliente** o si no hay costo |

Ejemplo (maestro):
```json
{ "id":"...","codigo_barras":"7801234567890","nombre":"Alimento premium perro 15 kg","descripcion":"Saco","stock":12,"stock_minimo":3,"precio_venta_neto":25202,"iva_precio_venta":4788,"precio_venta_total":29990,"activo":true,"stock_bajo":false,"costo_neto":15121,"iva_costo":2873,"costo_total":17994,"margen_neto":10081 }
```
Ejemplo (vendedor y cliente): mismas claves, pero `costo_neto`, `iva_costo`, `costo_total`,
`margen_neto` = `null` (el RLS de `productos_costos` filtra las filas y el `left join` deja
esas columnas en `null`). **El cliente consume `v_inventario`** (no `productos` directamente);
para él solo son relevantes `id, nombre, stock, precio_venta_total` (y `stock > 0` para
"Disponible").

**Orden por defecto:** `nombre.asc`. **Límite:** 2000.
**Búsqueda:** `or=(nombre.ilike.%t%,codigo_barras.eq.t)`.

### A.2 `ventas` (historial)

| Columna | Tipo | Nulo |
|---------|------|:----:|
| `id` | uuid | no |
| `numero` | bigint | no |
| `tipo` | text (`venta`/`devolucion`) | no |
| `medio_pago` | text | no |
| `total_neto` | int | no |
| `total_iva` | int | no |
| `descuento` | int | no |
| `descripcion_descuento` | text | sí |
| `total` | int | no |
| `estado` | text (`completada`/`anulada`) | no |
| `created_at` | timestamptz | no |
| `vendedor_id` | uuid | no |

**Orden:** `created_at.desc`. **Límite:** 50. **Filtro:** `created_at >= desde AND created_at < hasta`.

### A.3 `venta_items` (detalle de venta)

`id` uuid, `producto_id` uuid, `nombre_producto` text, `codigo_barras` text|null,
`precio_unitario_neto` int, `iva_unitario` int, `cantidad` int, `total_linea` int,
`reingresa_stock` boolean. **Orden:** `nombre_producto.asc`.

### A.4 `clientes` y `clientes` con mascotas

`clientes`: `id` uuid, `nombres` text, `apellidos` text, `rut` text, `telefono` text,
`email` text|null, `created_at` timestamptz. **Orden:** `apellidos.asc`. **Límite:** 50.

Con mascotas (join): añade `mascotas: [{ id, nombre, especie, raza, peso_kg }]`.
```json
{ "id":"...","nombres":"Ana","apellidos":"Perez","rut":"12345678-5","telefono":"+56912345678","email":null,"created_at":"2026-01-01T00:00:00Z","mascotas":[{"id":"...","nombre":"Luna","especie":"perro","raza":"Mestiza","peso_kg":12.5}] }
```

### A.5 `mascotas`

`id` uuid, `nombre` text, `especie` text, `raza` text|null, `peso_kg` numeric|null.
**Orden:** `nombre.asc`. Filtro `activa = true`.

### A.6 `profesionales`

`id` uuid, `nombre` text, `area` text, `tipo` text, `genero` text, `especialidad` text|null,
`duracion_slot_min` int, `color` text|null, `orden` int, `activo` boolean, `email` text|null,
`perfil_id` uuid|null. Con join a perfiles: `perfil: { rol }` → la app lo aplana a `perfil_rol`.
**Orden:** `orden.asc`. Para agenda: `activo = true AND tipo <> 'vendedor'`.

### A.7 `horarios_semanales`

`id` uuid, `profesional_id` uuid, `dia_semana` int (1–7), `hora_inicio` time (`HH:MM:SS`),
`hora_fin` time. **Orden:** `dia_semana.asc, hora_inicio.asc`.
**Nota:** parsear `time` tolerando fracciones de segundo (`HH:MM:SS.ssssss`).

### A.8 `excepciones_agenda`

`id` uuid, `profesional_id` uuid|null, `area` text|null, `fecha_desde` date, `fecha_hasta` date,
`hora_inicio` time|null, `hora_fin` time|null, `modo` text (`cerrar`/`abrir`), `motivo` text|null.
Filtro: `fecha_desde <= hasta AND fecha_hasta >= desde`.

### A.9 `reservas` (listado simple)

`id` uuid, `profesional_id` uuid, `cliente_id` uuid, `mascota_id` uuid|null, `inicio` timestamptz,
`fin` timestamptz, `estado` text, `motivo` text|null, `origen` text, `fuera_de_horario` boolean.
**Orden:** `inicio.asc`. **Límite:** 200.

### A.10 `reservas` con detalle (agenda del día)

Añade joins:
```json
{
  "id":"...","profesional_id":"...","cliente_id":"...","mascota_id":"...",
  "inicio":"2026-11-19T12:00:00Z","fin":"2026-11-19T12:30:00Z","estado":"confirmada",
  "motivo":"Control","origen":"interno","fuera_de_horario":false,
  "clientes":{"nombres":"Ana","apellidos":"Perez","rut":"12345678-5","telefono":"+56912345678"},
  "mascotas":{"nombre":"Luna","especie":"perro","raza":"Mestiza","peso_kg":12.5}
}
```
`clientes` y `mascotas` pueden ser `null` (el join es **left**, no `!inner`). El `select`
exacto es:
```
select=id,profesional_id,cliente_id,mascota_id,inicio,fin,estado,motivo,origen,fuera_de_horario,clientes(nombres,apellidos,rut,telefono),mascotas(nombre,especie,raza,peso_kg)
```

### A.11 `mis-reservas` (cliente)

`id` uuid, `inicio` timestamptz, `fin` timestamptz, `estado` text, `motivo` text|null,
`origen` text, `profesionales: { nombre }`|null, `mascotas: { nombre }`|null.
**Orden:** `inicio.desc`. **Límite:** 50. **Incluye todos los estados** (confirmada,
completada, cancelada, no_asistio) e incluye reservas pasadas: es un **historial completo**.
La UI solo muestra el botón "Cancelar" cuando `estado = 'confirmada'`.

### A.12 `v_reservas_producto`

`id` uuid, `producto_id` uuid, `producto_nombre` text, `codigo_barras` text|null,
`perfil_id` uuid, `perfil_nombre` text|null, `cantidad` int, `estado` text
(`pendiente`/`retirada`/`cancelada`/`vencida`), `expira_at` timestamptz, `notas` text|null,
`created_at` timestamptz. **Orden:** `created_at.desc`. **Límite:** 100.

### A.13 `v_encargos_producto`

`id` uuid, `producto_id` uuid, `producto_nombre` text, `codigo_barras` text|null,
`perfil_id` uuid, `perfil_nombre` text|null, `cantidad` int, `estado` text
(`pendiente`/`entregado`/`cancelado`), `notas` text|null, `created_at` timestamptz,
`fecha_entrega` date|null. **Orden:** `created_at.desc`. **Límite:** 100.

### A.14 `ranking_productos` (RPC)

`producto_id` uuid, `nombre` text, `unidades` bigint, `total` bigint, `ultima_venta` timestamptz|null,
`dias_detenido` int.
**Rango sin ventas:** devuelve **todos los productos activos** con `unidades = 0` y `total = 0`
(no un array vacío), porque parte de `productos` con `left join` a las ventas.

### A.15 `reporte_ventas_productos` (RPC)

`producto_id` uuid, `nombre_producto` text, `periodo` date, `unidades` bigint,
`total_neto` bigint, `total_iva` bigint, `total` bigint.

### A.16 `agenda_ocupacion` (RPC, cliente)

`profesional_id` uuid, `inicio` timestamptz, `fin` timestamptz. **Sin datos personales.**
La RPC **no recibe filtro por profesional**: devuelve la ocupación de **todos** los
profesionales en el rango. El cliente la usa para ver qué bloques están ocupados y **filtra
en el cliente** por el profesional elegido.

### A.17 `profesionales_publicos` (RPC)

`id` uuid, `nombre` text, `area` text.

### A.18 `config_publica` (RPC)

`nombre_negocio` text, `reserva_anticipacion_min_horas` int, `reserva_max_dias` int,
`reserva_max_activas_por_contacto` int.

### A.19 `perfiles` y `configuracion`

`perfiles`: `id` uuid, `nombre_completo` text, `rol` text, `activo` boolean.
`configuracion`: `iva_porcentaje` numeric (solo lectura para la app). **Ojo:** en JSON llega
como **string** (`"19.00"`); parsear a `BigDecimal`. Lo mismo aplica a `mascotas.peso_kg`
(A.5) y a cualquier columna `numeric`.

---

## Anexo B — Catálogo de errores

PostgREST devuelve los `RAISE EXCEPTION` con **HTTP 400** y cuerpo:
```json
{ "code": "P0001", "message": "<mensaje>", "details": null, "hint": null }
```
La app debe mapear por `message` (texto en español). Las Edge Functions devuelven
`{ "error": "<mensaje>" }` con su propio status.

| Mensaje (message / error) | Origen | HTTP | Causa | Acción UI |
|---------------------------|--------|:----:|-------|-----------|
| `No autorizado` | RPC varias | 400 | Rol sin permiso | Mostrar "No tienes permiso" |
| `Solo el personal puede ajustar stock` | `ajustar_stock` | 400 | No es personal | Ocultar acción |
| `Solo un Maestro puede anular ventas` | `anular_venta` | 400 | No es maestro | Ocultar botón |
| `Solo un Maestro puede eliminar clientes` | `eliminar_cliente` | 400 | No es maestro | Ocultar botón |
| `Solo un Maestro puede eliminar profesionales` | `eliminar_profesional` | 400 | No es maestro | Ocultar botón |
| `Solo un Maestro puede anonimizar clientes` | `anonimizar_cliente` | 400 | No es maestro | Ocultar botón |
| `Solo un cliente puede usar esta funcion` | `crear_reserva_cliente` | 400 | No es cliente | Ocultar acción |
| `Solo un cliente puede actualizar sus datos` | `actualizar_mis_datos` | 400 | No es cliente | Ocultar acción |
| `Solo el personal puede marcar una reserva como retirada` | `marcar_reserva_retirada` | 400 | No es personal | Ocultar botón |
| `Debes incluir al menos un producto` | `registrar_venta`/`registrar_devolucion` | 400 | Carrito vacío | Validar antes de enviar |
| `Debes incluir al menos un item` | `registrar_ingreso` | 400 | Sin items | Validar |
| `Cantidad invalida` | varias | 400 | cantidad ≤ 0 | Validar |
| `Cantidad invalida para el producto %` | `registrar_ingreso` | 400 | cantidad ≤ 0 | Validar |
| `Producto no encontrado` | varias | 400 | id inexistente | Refrescar |
| `Producto no encontrado: %` | `registrar_ingreso` | 400 | id inexistente | Refrescar |
| `Producto inactivo: %` | `registrar_venta` | 400 | producto inactivo | Quitar del carrito |
| `Stock insuficiente para % (disponible %)` | `registrar_venta` | 400 | stock < cantidad | Ajustar cantidad |
| `Stock insuficiente (disponible %)` | `crear_reserva_producto` | 400 | stock < cantidad | Ajustar cantidad |
| `El descuento no puede ser negativo` | `registrar_venta` | 400 | descuento < 0 | Validar |
| `El descuento no puede superar el total de la venta` | `registrar_venta` | 400 | descuento > total | Ajustar descuento |
| `El stock no puede ser negativo` | `ajustar_stock` | 400 | nuevo stock < 0 | Validar |
| `El stock no cambia` | `ajustar_stock` | 400 | mismo valor | No enviar |
| `Venta no encontrada` | `anular_venta` | 400 | id inexistente | Refrescar |
| `La venta ya esta anulada` | `anular_venta` | 400 | ya anulada | Refrescar |
| `Profesional no encontrado o inactivo` | reservas | 400 | id inválido/inactivo | Refrescar |
| `El fin debe ser posterior al inicio` | `crear_reserva_interna` | 400 | fin ≤ inicio | Validar |
| `El profesional ya tiene una reserva en ese horario` | `crear_reserva_interna` | 400 | solape | Elegir otro horario |
| `El horario esta fuera de la agenda configurada; confirma la excepcion` | `crear_reserva_interna` | 400 | fuera de horario | Marcar "forzar" |
| `El horario esta fuera de la agenda configurada` | `crear_reserva_cliente` | 400 | fuera de horario | Elegir otro |
| `El horario ya no esta disponible` | `crear_reserva_cliente`/`crear_reserva_publica` | 400 | solape | Elegir otro |
| `La mascota no pertenece al cliente` | `crear_reserva_cliente` | 400 | mascota ajena | Elegir la propia |
| `No tienes una ficha de cliente asociada` | cliente | 400 | sin ficha | Contactar clínica |
| `Reserva no encontrada o no cancelable` | `cancelar_mi_reserva`/`cancelar_reserva_producto` | 400 | estado no cancelable | Refrescar |
| `Reserva no encontrada o no pendiente` | `marcar_reserva_retirada` | 400 | no pendiente | Refrescar |
| `Reserva no encontrada o ya cancelada` | `cancelar_reserva_publica` | 400 | token inválido | — |
| `Cliente no encontrado` | `eliminar_cliente`/`anonimizar_cliente` | 400 | id inexistente | Refrescar |
| `Profesional no encontrado` | `eliminar_profesional` | 400 | id inexistente | Refrescar |
| `El nombre es obligatorio` | `actualizar_mis_datos` | 400 | vacío | Validar |
| `El apellido es obligatorio` | `actualizar_mis_datos` | 400 | vacío | Validar |
| `RUT invalido (revisa el digito verificador)` | `actualizar_mis_datos` | 400 | RUT malo | Corregir |
| `RUT invalido` | `crear_reserva_publica` | 400 | RUT malo | Corregir |
| `Ya tienes demasiadas reservas activas` | `crear_reserva_publica` | 400 | límite | Cancelar alguna |
| `Estado invalido` | `cambiar_estado_encargo` | 400 | estado no permitido | Validar |
| `No se pudieron actualizar tus datos` | `actualizar_mis_datos` | 400 | fallo update | Reintentar |
| `Solo un Maestro puede cambiar el rol o el estado de un perfil` | trigger perfiles | 400 | no maestro | Ocultar |
| `No se puede degradar o desactivar al ultimo Maestro activo` | trigger perfiles | 400 | último maestro | Impedir |
| `Metodo no permitido` | Edge Functions | 405 | método ≠ POST | — |
| `Configuracion del servidor incompleta` | Edge Functions | 500 | faltan secretos | — |
| `Cuerpo invalido` | Edge Functions | 400 | JSON malo | — |
| `Demasiados intentos. Intenta mas tarde.` | `reserva-publica` | 429 | rate limit | Esperar |
| `Turnstile no configurado` | `reserva-publica` | 500 | falta secret | — |
| `Verificacion anti-bot fallida` | `reserva-publica` | 400 | Turnstile | Reintentar |
| `Faltan datos obligatorios` | `reserva-publica` | 400 | body incompleto | Validar |
| `No autenticado` | `admin-usuarios` | 401 | sin JWT | Re-login |
| `Solo un Maestro puede administrar usuarios` | `admin-usuarios` | 403 | no maestro | Ocultar |
| `Faltan datos del usuario` | `admin-usuarios` | 400 | body incompleto | Validar |
| `No se pudo crear el usuario` | `admin-usuarios` | 400 | error Auth | Revisar |
| `Faltan datos` | `admin-usuarios` | 400 | body incompleto | Validar |
| `Accion no soportada` | `admin-usuarios` | 400 | acción inválida | — |

> **Nota:** los `RAISE EXCEPTION` sin `ERRCODE` explícito usan `P0001` y PostgREST los
> devuelve como **HTTP 400**. La app debe leer `message` (no `code`) para el texto al usuario.
>
> **Nota sobre `cancelar_reserva_publica`:** como esa RPC es `service_role`, la app Android
> **nunca** la invoca (ver decisión en 7.1 y F.3), por lo que el error
> `Reserva no encontrada o ya cancelada` **no llegará a Android**. Si en el futuro se crea la
> Edge Function pública de cancelación, el error provendrá de la **Edge Function**
> (`{ "error": ... }`), no de PostgREST.
>
> **Errores de red/timeout (no son de negocio):** en móvil, distinguir los fallos de
> conectividad/timeout (sin respuesta HTTP, `IOException`, `SocketTimeout`) de los errores de
> negocio (HTTP 400 con `message`). Para los de red: reintentar con backoff y mostrar un
> mensaje genérico ("Sin conexión, reintenta"); **no** mostrar el `message` del backend.

---

## Anexo C — Semántica de parámetros

### C.1 `reporte_ventas_productos`
- `p_agrupar`: valores válidos **`'dia'`** (default), **`'semana'`**, **`'mes'`**. Cualquier
  otro valor cae en `'dia'`. La agrupación se hace en zona `America/Santiago`.
- `p_desde`/`p_hasta`: `timestamptz` (rango `[desde, hasta)`).

### C.2 `registrar_ingreso`
- `p_items` (**obligatorio**): `[{ "producto_id": uuid, "cantidad": int>0 }]`.
- `p_proveedor_id` (opcional, default `null`).
- `p_documento` (opcional, default `null`; si viene vacío se guarda `null`).
- `p_notas` (opcional, default `null`).
- La web solo envía `p_items`.

### C.3 `horarios_disponibles`
- **3 args** (`p_profesional_id, p_desde, p_hasta`): uso **público**; respeta la anticipación
  mínima. `p_desde`/`p_hasta` son `date`.
- **4 args** (`+ p_ignorar_anticipacion boolean`): uso **interno** (agenda). Con
  `p_ignorar_anticipacion = true` **ignora** `reserva_anticipacion_min_horas` (permite ver
  bloques del día actual que aún no pasan). La web lo usa así en la agenda interna; **la
  agenda Android (personal) debe usar también la variante de 4 args con `true`**.

### C.4 `crear_reserva_interna`
- `p_fin` (opcional): si es `null`, la RPC calcula `min(inicio + duracion_slot, fin_ventana)`.
  **Recomendado:** enviar `p_fin = null` y dejar que la RPC lo calcule. Si se envía un `fin`
  explícito, debe ser **el mismo** que devolvió `horarios_disponibles` (no recalcularlo en la app).
- `p_forzar_fuera_horario` (default `false`): si es `true`, **omite** la validación de
  "fuera de horario" (permite agendar en emergencia). **Sí** sigue validando solape. La
  reserva queda con `fuera_de_horario = true` si el horario no estaba configurado.

### C.5 `crear_reserva_publica` (service_role)
- `p_cliente` (jsonb): `{ "nombres": str, "apellidos": str, "rut": str, "telefono": str, "email": str|null }`.
  - `rut` **obligatorio y válido** (si no, error `RUT invalido`).
  - `email` opcional (si vacío → `null`).
  - Si el RUT ya existe, **reutiliza** el cliente y actualiza teléfono/email.
- `p_mascota` (jsonb): `{ "nombre": str, "especie": "perro"|"gato"|"otro", "raza": str|null, "peso_kg": number|null }`.
  - Si ya existe una mascota con el mismo nombre en el cliente, la reutiliza.
- `p_motivo` (text, puede ser `null`).

### C.6 `crear_reserva_producto` / `crear_encargo_producto`
- `p_cantidad` debe ser `> 0`.
- `p_notas` opcional.

### C.7 `cambiar_estado_encargo`
- `p_estado` ∈ `'pendiente' | 'entregado' | 'cancelado'`.

### C.8 `cambiar_estado_reserva`
- `p_estado` ∈ `'confirmada' | 'completada' | 'cancelada' | 'no_asistio'`.

---

## Anexo D — Autenticación en Android

### D.1 Deep link scheme
Definir un esquema propio, p. ej. **`lankapets://`**, con rutas:
- `lankapets://auth-callback` → retorno de OAuth (PKCE `?code=...`).
- `lankapets://reset` → recuperación de contraseña.

### D.2 `redirectTo` / allowlist en Supabase
- En **Supabase → Authentication → URL Configuration**, agregar a *Redirect URLs*:
  - `lankapets://auth-callback`
  - `lankapets://reset`
- El `redirectTo` que envíe la app debe coincidir **exactamente** con una de esas URLs.

### D.3 Flujo PKCE (Android)
1. `signInWith(Google)` (o `signInWithOAuth`) con `redirectTo = "lankapets://auth-callback"`.
2. El navegador vuelve a la app vía deep link con `?code=...`.
3. La app llama `exchangeCodeForSession(code)` (supabase-kt lo hace con `handleDeeplinks`).
4. Se guarda la sesión de forma segura.

### D.4 Recuperación de contraseña
1. `resetPasswordForEmail(email, redirectTo = "lankapets://reset")`.
2. El correo lleva a `lankapets://reset#access_token=...&refresh_token=...&type=recovery`.
3. La app hace `setSession` con esos tokens y muestra la pantalla de nueva contraseña
   (equivalente a `#/establecer-clave`).
4. `updateUser({ password })`.

### D.5 Metadata de `signUp` (autoregistro de cliente)
```json
{
  "nombres": "Ana",
  "apellidos": "Perez",
  "rut": "12345678-5",
  "telefono": "+56912345678",
  "nombre_completo": "Ana Perez"
}
```
- El trigger `private.crear_perfil_cliente()` crea el perfil (rol `cliente`) y la ficha en
  `clientes` (por email). Si el RUT es inválido o duplicado, guarda `'ANONIMO'`.
- **Rama de UI según la respuesta de `signUp`:**
  - Si **devuelve sesión** (`requiereConfirmacion = false`): el usuario queda autenticado →
    entrar directo a la app.
  - Si **no devuelve sesión** (`requiereConfirmacion = true`, confirmación de correo activada):
    mostrar pantalla "Revisa tu correo para confirmar tu cuenta" y **no** navegar al inicio.

### D.6 Confirmación de correo
Depende de la configuración del proyecto Supabase (Authentication → Email). Si está activada,
el usuario debe confirmar antes de poder iniciar sesión. La app debe manejar ambos casos.

---

## Anexo E — Exportaciones (columnas exactas y orden)

### E.1 Inventario (`inventario-YYYY-MM-DD.xlsx`)
`Nombre, Codigo, Descripcion, Stock, Stock minimo, Precio neto, IVA, Precio total, Activo`
(+ si maestro: `Costo neto, IVA costo, Costo total`). `Activo` = `si`/`no`.

### E.2 Ventas (`ventas-{tipo}-YYYY-MM-DD.xlsx`)
`Numero, Fecha, Tipo, Medio de pago, Neto, IVA, Descuento, Descripcion descuento, Total,
Costo neto, IVA costo, Costo total, Estado`. `Fecha` = `formatFechaHora` (America/Santiago).

### E.3 Historial de consultas (`consultas-{tipo}-YYYY-MM-DD.xlsx`)
`Fecha, Hora, Profesional, Dueno, RUT, Telefono, Mascota, Especie, Motivo, Estado, Origen`.

### E.4 Reportes (`reporte-ventas-{desde}-{hasta}.xlsx`)
`Producto, Periodo, Unidades, Neto, IVA, Total` (sin columnas de costo).

---

## Anexo F — Turnstile y cancelación pública

### F.1 Site key
La site key de Turnstile se inyecta en la web vía `VITE_TURNSTILE_SITE_KEY` (en el repo es un
placeholder). La app Android debe usar la **misma site key** del widget de Cloudflare.

### F.2 Flujo en Android
1. Cargar el widget de Turnstile en un **WebView** con la site key y un `callback` JS que
   entregue el token a la app (vía `addJavascriptInterface`).
2. Enviar el token como `turnstile_token` a la Edge Function `reserva-publica`.
3. La Edge Function verifica el token contra Cloudflare.

### F.3 `token_gestion`
- Se devuelve al crear la reserva pública y **se muestra** al usuario (código para gestionar).
- **Hoy no hay endpoint público de cancelación**: la RPC `cancelar_reserva_publica` es
  `service_role`. Para cancelar por token desde la app habría que **crear una Edge Function**
  pública que reciba el token y llame a la RPC.
- **DECISIÓN (app Android v1):** la cancelación pública por token queda **FUERA DE ALCANCE**.
  La app **solo muestra** el `token_gestion`. **No** llamar a `cancelar_reserva_publica`
  (fallaría con 401/403). Requiere trabajo de backend previo.

---

## Anexo G — Realtime (opcional)

La web **no** usa Realtime: refresca con TanStack Query (polling por `staleTime`). Si la app
Android quiere agenda en vivo, debe **habilitar Realtime por tabla** en Supabase y suscribirse:

| Tabla | Eventos | Filtro sugerido |
|-------|---------|-----------------|
| `reservas` | INSERT, UPDATE | `profesional_id=eq.{id}` (o sin filtro para personal) |
| `reservas_productos` | INSERT, UPDATE | `perfil_id=eq.{uid}` (cliente) |
| `encargos_productos` | INSERT, UPDATE | `perfil_id=eq.{uid}` (cliente) |

> RLS aplica a Realtime: el usuario solo recibe filas que puede leer. Requiere habilitar la
> publicación `supabase_realtime` y que las columnas usadas en el filtro estén en la
> publicación. **`REPLICA IDENTITY FULL` solo es necesario si se requiere el registro completo
> en el payload del UPDATE**; para filtros por `profesional_id`/`perfil_id` basta con
> `DEFAULT` (más barato). Usar `FULL` solo si el caso lo exige.

---

*Fin del documento. Esta especificación refleja el estado del código en el repositorio
`RCP_Veterinaria` (LankaPets v2.0). Cualquier cambio futuro en el esquema o las RPC debe
reflejarse aquí para mantener la paridad entre la web y la app Android.*
