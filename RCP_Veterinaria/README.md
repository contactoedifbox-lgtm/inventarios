# LankaPets v2.0 — RCP_Veterinaria

Sistema de gestión veterinaria con tres piezas:

1. **App interna** con login (roles Maestro, Vendedor y Cliente): dashboard con
   métricas, inventario con costos y márgenes, ventas y devoluciones con lector de
   código de barras, clientes y mascotas, profesionales con horario semanal y agenda.
2. **Página pública de reservas** sin login (veterinaria y peluquería).
3. **Base de datos Supabase** con RLS estricto, funciones RPC transaccionales y
   auditoría.

El frontend es estático y su código es público, por lo que la seguridad real vive
en la base de datos: `GRANT`, Row Level Security, funciones SQL y una Edge Function
para la reserva pública.

## Stack

| Capa | Elección |
|---|---|
| Frontend | Vite + React + TypeScript |
| Rutas | HashRouter (compatible con GitHub Pages) |
| Datos | supabase-js + TanStack Query |
| Tiempo real | Supabase Realtime sobre `productos` y `reservas` |
| Validación | Zod |
| Estilos | Tailwind CSS |
| Excel | ExcelJS |
| Anti-bots | Cloudflare Turnstile |
| Backend | Postgres (RLS, RPC, triggers) + 2 Edge Functions |
| Pruebas | Vitest, Playwright y pruebas SQL de RLS |

## Roles y permisos

| Rol | Alcance |
|---|---|
| **Maestro** | Todo: costos, profesionales, usuarios, anulación de ventas, reportes. |
| **Vendedor** | Inventario (sin costos), ventas, clientes, agenda. No ve profesionales ni costos. |
| **Cliente** | Ver catálogo de inventario (solo reservar producto), reservar horario, ver/cancelar sus reservas y sus datos. |

## Probar en local

Requisitos: Node 20+ y npm.

```bash
cd RCP_Veterinaria
npm install
npm run dev
```

Abre `http://localhost:5173/`.

Copia `.env.example` a `.env.local` y completa los valores reales:

```bash
cp .env.example .env.local
```

```dotenv
VITE_SUPABASE_URL=https://vparxfmoqfaahsdqmjcf.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_TURNSTILE_SITE_KEY=0x...
VITE_BASE_PATH=          # vacío en local; en Pages: /inventarios/RCP_Veterinaria/
```

`.env.local` **nunca** se sube al repositorio (está en `.gitignore`).

### Iniciar sesión

Usuarios de prueba (contraseña `123456`):

| Correo | Rol |
|---|---|
| `igneel.2@gmail.com` | Maestro |
| `contacto.edifbox@gmail.com` | Vendedor |
| `simon.e.monsalve@gmail.com` | Cliente |

Si necesitas restablecer una contraseña, hazlo en
**Supabase → Authentication → Users** o crea usuarios con la Edge Function
`admin-usuarios`.

### Página pública

`http://localhost:5173/#/reservar`. Para confirmar una reserva real necesitas
configurar `TURNSTILE_SECRET_KEY` en Supabase; si falta, la Edge Function
`reserva-publica` responde 500. Sin Turnstile la página carga y valida datos,
pero no confirma la reserva.

### Datos de ejemplo

Productos, costos, proveedor, profesionales y horarios ya están cargados por la
migración `0008_seed_dev`, así que el inventario y la agenda se ven con datos.

### Pruebas

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e   # requiere: npx playwright install chromium
```

## Cómo funciona en local (recursos, memoria, caché y sincronización)

Esta sección responde a las dudas típicas antes de operar la app.

### ¿Qué recursos usa?

- **Navegador**: la app es una SPA estática. Todo el JavaScript y el CSS corren en
  el navegador. No hay servidor de negocio propio.
- **Servidor de desarrollo (solo en local)**: `npm run dev` levanta un servidor
  Vite en `http://localhost:5173`. Es una herramienta de desarrollo; **no guarda
  datos de negocio**. Solo sirve los archivos y recarga en caliente al editar.
- **Supabase (nube)**: es la única fuente de verdad. La base de datos Postgres,
  la autenticación y las Edge Functions viven en el proyecto
  `vparxfmoqfaahsdqmjcf`. Cada lectura y escritura viaja por HTTPS a Supabase.

### ¿Hay memoria local / datos guardados en el navegador?

Sí, pero **solo cosas de sesión y caché temporal, nunca datos de negocio**:

1. **Sesión de autenticación**: supabase-js guarda el token de sesión (JWT) en el
   `localStorage` del navegador (clave `sb-<proyecto>-auth-token`) porque está
   configurado con `persistSession: true`. Esto es lo que te mantiene logueado al
   recargar.
2. **Caché en memoria de TanStack Query**: las respuestas de la API se cachean
   **en memoria RAM de la pestaña**, no en disco. El `staleTime` es 30 s y el
   `gcTime` es 5 min; luego se vuelven a pedir a Supabase. No hay persistencia de
   la caché en el navegador.

No hay base de datos local, ni IndexedDB con datos de negocio, ni modo offline.
La app **necesita conexión a internet** para operar.

### ¿Qué pasa si borro la caché del navegador?

- **Cierras sesión**: al borrar `localStorage` se pierde el token, así que tendrás
  que volver a iniciar sesión. Tu usuario sigue existiendo en Supabase.
- **Se vacía la caché de consultas**: la próxima acción vuelve a pedir los datos a
  Supabase. No se pierde nada.
- **No se pierden datos de negocio**: productos, ventas, clientes, reservas, etc.
  están en Supabase, no en el navegador. Borrar caché es inofensivo para los datos.

### ¿El uso local se coordina con Supabase para que la base quede actualizada?

Sí, y de forma **inmediata y directa**:

- Cada acción (crear producto, registrar venta, agendar reserva) se envía a
  Supabase en el momento, mediante funciones RPC transaccionales o inserts con RLS.
- **No hay cola de sincronización ni "guardado pendiente"**: si la escritura
  responde OK, ya está en la base de datos en la nube. Si falla (sin internet, RLS
  la rechaza), la operación no se aplica y la UI muestra el error.
- Como local y producción apuntan al **mismo proyecto Supabase**, lo que haces en
  `localhost` queda reflejado al instante en la base real, y al revés.

### Riesgos a tener en cuenta

- **No hay base de datos local separada**: probar en `localhost` escribe sobre los
  datos reales de Supabase. Si quieres un entorno aislado, crea un segundo proyecto
  Supabase y apunta `VITE_SUPABASE_URL`/`ANON_KEY` a él.
- **Dependes de internet**: sin conexión, la app no puede leer ni escribir. Las
  vistas pueden mostrar datos cacheados unos segundos, pero no es modo offline.
- **La clave publishable es pública**: por diseño. La seguridad depende 100 % del
  RLS y los `GRANT`. Si una tabla quedara sin RLS, quedaría expuesta.
- **Nunca expongas la clave `secret` (`sb_secret_...`)**: solo va en la Edge
  Function `reserva-publica` y en GitHub Secrets. Jamás en el frontend ni en el
  repositorio.
- **Fugas de sesión**: al ser una app pública, cualquiera puede abrir la consola.
  Todo el control de acceso está en el servidor (RLS/RPC), no en la UI.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Previsualiza el build |
| `npm run typecheck` | Verificación de tipos |
| `npm test` | Pruebas unitarias con Vitest |
| `npm run test:e2e` | Pruebas end-to-end con Playwright |

## Estructura

```text
src/
├── lib/          Cliente Supabase, TanStack Query, RUT, formato, fechas y esquemas Zod
├── components/   Layout, UI y lector de código de barras
├── features/     auth, dashboard, inventario, ventas, clientes, agenda, profesionales, reportes, publico
└── styles/       Tailwind
supabase/
├── migrations/   Migraciones versionadas (tabla + RLS + GRANT + políticas)
├── functions/    Edge Functions admin-usuarios y reserva-publica
└── tests/        Pruebas SQL de RLS y RPC
```

## Despliegue en GitHub Pages

GitHub Pages publica el build en
`https://contactoedifbox-lgtm.github.io/inventarios/RCP_Veterinaria/`.
La ruta pública de reservas es `#/reservar`.

El workflow [`.github/workflows/deploy-nueva-app.yml`](../.github/workflows/deploy-nueva-app.yml)
compila `RCP_Veterinaria` y arma el sitio con el portal raíz más el build de
LankaPets bajo `RCP_Veterinaria/`.

- Guía paso a paso: [`docs/guia-github-paso-a-paso.md`](docs/guia-github-paso-a-paso.md)
- Referencia técnica: [`docs/despliegue.md`](docs/despliegue.md)

## Seguridad

- La clave `secret` (`sb_secret_...`) nunca va en el frontend; solo en la Edge
  Function `reserva-publica` y en GitHub Secrets.
- La clave `publishable` (`sb_publishable_...`) sí va en el cliente y depende
  100 % del RLS.
- Los costos viven en tablas separadas visibles solo para el Maestro.
- Ventas, devoluciones y movimientos no se borran: se anulan y queda auditoría.
