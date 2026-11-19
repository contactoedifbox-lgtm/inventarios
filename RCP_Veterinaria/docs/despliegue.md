# Despliegue — LankaPets v2.0

## 1. Entornos Supabase

| Proyecto | Uso | MCP |
|---|---|---|
| `lankapets-dev` | Desarrollo y pruebas | Escritura permitida |
| `lankapets-prod` | Produccion | Solo lectura o sin MCP |

Reglas:

- Usar las claves nuevas `sb_publishable_...` (cliente) y `sb_secret_...` (servidor).
- La clave `secret` nunca va en el frontend ni en el repositorio.
- El plan Free pausa el proyecto tras 7 dias sin actividad y no incluye backups;
  se recomienda plan Pro para produccion.

## 2. Secretos de GitHub

En **Settings → Secrets and variables → Actions** crear:

| Secreto | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave publishable |
| `VITE_TURNSTILE_SITE_KEY` | Site key de Cloudflare Turnstile |
| `N8N_WEBHOOK_OCR_URL` | (Existente) webhook de `nueva-app` |
| `N8N_WEBHOOK_GUARDAR_URL` | (Existente) webhook de `nueva-app` |
| `N8N_WEBHOOK_AUTH_TOKEN` | (Existente) token de `nueva-app` |

Secretos de las Edge Functions (configurar en Supabase, no en GitHub):

| Secreto | Uso |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secret para las Edge Functions |
| `TURNSTILE_SECRET_KEY` | Secret key de Turnstile |
| `IP_SALT` | Sal para hashear la IP en el rate limit |

## 3. Migraciones

```bash
cd RCP_Veterinaria
supabase link --project-ref <ref-dev>
supabase db push          # aplica supabase/migrations en orden
```

Cada migracion incluye en un mismo archivo: tabla, RLS, `GRANT` explicito y
politicas, segun la exigencia vigente desde el 30 de octubre de 2026.

Para produccion, repetir con el `project-ref` de `lankapets-prod` y sin aplicar
`0008_seed_dev.sql` con datos reales.

## 4. Edge Functions

```bash
supabase functions deploy reserva-publica --no-verify-jwt
supabase functions deploy admin-usuarios
supabase secrets set TURNSTILE_SECRET_KEY=... IP_SALT=...
```

- `reserva-publica`: `verify_jwt = false` (la llama el publico), valida Turnstile
  y aplica rate limit.
- `admin-usuarios`: `verify_jwt = true`, solo un Maestro autenticado.

## 5. GitHub Pages

El workflow [`.github/workflows/deploy-nueva-app.yml`](../../.github/workflows/deploy-nueva-app.yml):

1. Instala dependencias de `RCP_Veterinaria`.
2. Compila con `VITE_BASE_PATH=/inventarios/RCP_Veterinaria/`.
3. Genera `nueva-app/config.js` desde secretos.
4. Ensambla un directorio `staging/` (sin `node_modules`, `src`, `supabase`, `dist`).
5. Copia `RCP_Veterinaria/dist` a `staging/RCP_Veterinaria/`.
6. Publica `staging/` en GitHub Pages.

URLs resultantes:

- App interna: `https://<usuario>.github.io/inventarios/RCP_Veterinaria/`
- Reserva publica: `https://<usuario>.github.io/inventarios/RCP_Veterinaria/#/reservar`

En **Settings → Pages → Source** seleccionar **GitHub Actions**.

## 6. Primer Maestro

1. Crear el usuario en Supabase Auth (correo y contrasena).
2. Insertar su perfil:

```sql
insert into public.perfiles (id, nombre_completo, rol, activo)
values ('<uuid-del-usuario>', 'Nombre del Maestro', 'maestro', true);
```

3. Desde ese usuario, usar la Edge Function `admin-usuarios` para crear el resto
   del personal.

## 7. Verificacion posterior

- `npm run typecheck`, `npm test` y `npm run build` en verde.
- `supabase test db` con las pruebas de `supabase/tests/`.
- Confirmar que un usuario anonimo no lee `clientes`, `ventas` ni costos.
