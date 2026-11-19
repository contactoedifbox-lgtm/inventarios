# Guía paso a paso: montar LankaPets en GitHub Pages

Esta guía deja la aplicación publicada en:

- App interna: `https://<usuario>.github.io/inventarios/RCP_Veterinaria/`
- Reserva pública: `https://<usuario>.github.io/inventarios/RCP_Veterinaria/#/reservar`

El esquema de base de datos ya está aplicado en el proyecto Supabase
`vparxfmoqfaahsdqmjcf` y las Edge Functions ya están desplegadas. Lo que falta es
la configuración de GitHub y los secretos.

---

## 1. Requisitos

- Repositorio `inventarios` en GitHub con la carpeta `RCP_Veterinaria/`.
- Node 20+ para probar antes de publicar.
- Proyecto Supabase `vparxfmoqfaahsdqmjcf`.
- Cuenta de Cloudflare para Turnstile (gratuita).

---

## 2. Obtener los datos de Supabase

1. Entra a **Supabase → proyecto Arriendo_Trajes → Settings → API**.
2. Anota:
   - **Project URL**: `https://vparxfmoqfaahsdqmjcf.supabase.co`
   - **Publishable key**: `sb_publishable_kD6bulbCcinXkZZ9_4kM2Q_6OhBGMd7`
3. No uses la clave `secret` en el frontend.

---

## 3. Configurar los secretos de las Edge Functions

En **Supabase → Edge Functions → Secrets** (o con la CLI) define:

| Secreto | Valor |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secret del proyecto (Settings → API → Secret keys) |
| `TURNSTILE_SECRET_KEY` | Secret key del widget de Turnstile |
| `IP_SALT` | Una cadena aleatoria larga, por ejemplo `lankapets-2026-cambiar` |

Sin `TURNSTILE_SECRET_KEY`, `reserva-publica` responde 500 y no se pueden crear
reservas desde la página pública.

La `SUPABASE_SERVICE_ROLE_KEY` suele estar disponible automáticamente para las
Edge Functions en Supabase; si no, créala con ese nombre.

---

## 4. Crear el widget de Cloudflare Turnstile

1. Entra a <https://dash.cloudflare.com> → **Turnstile → Add widget**.
2. Dominio: `<usuario>.github.io` (para producción) y `localhost` (para local).
3. Modo: **Managed**.
4. Copia:
   - **Site key** → va en GitHub como `VITE_TURNSTILE_SITE_KEY`.
   - **Secret key** → va en Supabase como `TURNSTILE_SECRET_KEY` (paso 3).

---

## 5. Configurar los secretos de GitHub

En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**.

| Secreto | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://vparxfmoqfaahsdqmjcf.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_kD6bulbCcinXkZZ9_4kM2Q_6OhBGMd7` |
| `VITE_TURNSTILE_SITE_KEY` | Site key de Turnstile |

Los secretos de `nueva-app` (`N8N_WEBHOOK_*`) no cambian.

> El MCP de GitHub no puede crear secretos ni variables: este paso es manual.

---

## 6. Activar GitHub Pages

1. **Settings → Pages**.
2. En **Build and deployment → Source** elige **GitHub Actions**.
3. No selecciones "Deploy from a branch".

El workflow [`.github/workflows/deploy-nueva-app.yml`](../../.github/workflows/deploy-nueva-app.yml)
compila `RCP_Veterinaria`, genera `nueva-app/config.js` y publica todo el sitio
desde un directorio `staging`.

---

## 7. Publicar

```bash
cd /mnt/datos/Repositorio_Github/inventarios
git add .
git commit -m "LankaPets v2.0: app, migraciones y workflow de Pages"
git push origin main
```

Luego revisa **Actions → Deploy (GitHub Pages)**. Cuando termine en verde:

- App interna: `https://<usuario>.github.io/inventarios/RCP_Veterinaria/`
- Reserva pública: `https://<usuario>.github.io/inventarios/RCP_Veterinaria/#/reservar`

---

## 8. Crear usuarios y perfiles

1. **Supabase → Authentication → Users → Add user** (correo y contraseña).
2. En **SQL Editor** asigna el perfil Maestro:

```sql
insert into public.perfiles (id, nombre_completo, rol, activo)
values ('<uuid-del-usuario>', 'Nombre del Maestro', 'maestro', true);
```

3. Los Vendedores se pueden crear desde el mismo panel y luego insertar su
   perfil con `rol = 'vendedor'`, o mediante la Edge Function `admin-usuarios`.

---

## 9. Verificación

- Login interno funciona y el nombre aparece en la barra superior.
- Inventario muestra los 3 productos del seed y los costos solo al Maestro.
- Una venta descuenta stock y aparece en "Ventas de hoy".
- `#/reservar` muestra profesionales y horarios libres.
- Una reserva pública devuelve un código de gestión (requiere Turnstile).

---

## 10. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Página en blanco o 404 al recargar | Pages no usa GitHub Actions | Revisar **Settings → Pages → Source** |
| Login dice "Invalid login credentials" | Usuario o contraseña incorrectos | Restablecer en Authentication → Users |
| Login entra pero todo vacío | Falta la fila en `perfiles` | Insertar el perfil (paso 8) |
| Reserva pública devuelve 500 | Falta `TURNSTILE_SECRET_KEY` | Configurar secretos de Edge Functions |
| Reserva pública devuelve 429 | Rate limit (3 por hora) | Esperar o revisar `intentos_reserva_publica` |
| Costos visibles para Vendedor | Rol mal asignado | Revisar `perfiles.rol` |
| Workflow falla en `npm ci` | `package-lock.json` desactualizado | Ejecutar `npm install` y commitear el lock |

---

## 11. Actualizar el esquema en el futuro

```bash
cd RCP_Veterinaria
supabase link --project-ref vparxfmoqfaahsdqmjcf
supabase db push
supabase functions deploy reserva-publica --no-verify-jwt
supabase functions deploy admin-usuarios
```

Cada migración nueva debe incluir en el mismo archivo: tabla, RLS, `GRANT`
explícito y políticas.