# Caporales San Gabriel — Plataforma de Arriendo y Venta de Trajes

Aplicación web completa para gestionar el **arriendo y venta de trajes** de la agrupación Caporales San Gabriel, con registro verificado por carnet de identidad, aprobación manual de cuentas por email, límites de arriendos por evento, comprobantes de pago y panel de administración con auditoría.

---

## Tabla de contenidos

1. [Stack tecnológico](#1-stack-tecnológico)
2. [Requisitos previos](#2-requisitos-previos)
3. [Instalación local (paso a paso)](#3-instalación-local-paso-a-paso)
4. [Configuración de Supabase (guía para novatos)](#4-configuración-de-supabase-guía-para-novatos)
5. [Configuración de emails con Resend](#5-configuración-de-emails-con-resend)
6. [Rate limiting con Upstash (opcional)](#6-rate-limiting-con-upstash-opcional)
7. [Ejecutar el proyecto en local](#7-ejecutar-el-proyecto-en-local)
8. [Subir el código a GitHub (guía para novatos)](#8-subir-el-código-a-github-guía-para-novatos)
9. [Despliegue en Vercel (producción)](#9-despliegue-en-vercel-producción)
10. [Estructura del proyecto](#10-estructura-del-proyecto)
11. [Flujos de negocio](#11-flujos-de-negocio)
12. [Solución de problemas frecuentes](#12-solución-de-problemas-frecuentes)

---

## 1. Stack tecnológico

| Tecnología | Uso |
|---|---|
| Next.js 14 (App Router) | Framework principal |
| TypeScript (`strict: true`) | Tipado estricto |
| Tailwind CSS + shadcn/ui | Estilos y componentes |
| Supabase | Auth, PostgreSQL, Storage |
| TanStack React Query v5 | Estado servidor y caché |
| Zustand | Estado UI global (filtros del catálogo) |
| React Hook Form + Zod | Formularios y validación |
| date-fns v3 | Fechas |
| Sonner | Notificaciones toast |
| Lucide React | Iconos |
| Resend | Emails transaccionales |
| Upstash Ratelimit (opcional) | Rate limiting en API routes |

---

## 2. Requisitos previos

Antes de empezar necesitas:

1. **Node.js 18.17 o superior** instalado. Verifica en una terminal:
   ```bash
   node --version
   ```
   Debe mostrar `v18.17.0` o mayor. Si no lo tienes, descárgalo de <https://nodejs.org> (botón verde "LTS", siguiente → siguiente).

2. **Una cuenta gratuita en Supabase** → <https://supabase.com> (botón *Start your project*, puedes entrar con GitHub o Google).

3. **Una cuenta gratuita en Resend** → <https://resend.com> (para enviar los correos).

4. **Opcional:** cuenta en Upstash → <https://upstash.com> (rate limiting; sin ella la app funciona con un limitador en memoria).

5. **Opcional pero recomendado:** cuenta en Vercel → <https://vercel.com> (para publicar la app en internet gratis).

---

## 3. Instalación local (paso a paso)

### 3.1 Instalar dependencias

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

> ⏱️ Tarda 1-3 minutos. Al finalizar verás la carpeta `node_modules` creada.

### 3.2 Crear el archivo de variables de entorno

Copia el archivo de ejemplo:

```bash
copy .env.local.example .env.local
```

> En Mac/Linux usa: `cp .env.local.example .env.local`

Ahora **edita `.env.local`** con tus claves (las iremos obteniendo en los siguientes pasos). El archivo quedará así:

```env
# Supabase (paso 4.3)
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...tu-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...tu-service-role-key...

# Email con Resend (paso 5)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@tudominio.cl
SUPER_ADMIN_EMAIL=tu-correo-admin@gmail.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Caporales San Gabriel

# Seguridad: escribe una frase larga y aleatoria (la usas solo aquí)
APPROVAL_SECRET=una-frase-secreta-larga-y-aleatoria-cambiala

# Upstash (opcional, paso 6)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

> ⚠️ **NUNCA** subas `.env.local` a GitHub ni compartas la `SERVICE_ROLE_KEY`. El archivo ya está en `.gitignore`.

---

## 4. Configuración de Supabase (guía para novatos)

Esta es la parte más importante. Síguela con calma, paso a paso.

### 4.1 Crear el proyecto en Supabase

1. Entra a <https://supabase.com> e inicia sesión.
2. Click en **"New project"** (botón verde).
3. Completa el formulario:
   - **Name:** `caporales-san-gabriel`
   - **Database Password:** genera una contraseña y **guárdala en un papel** (no la necesitarás para la app, pero Supabase la pide).
   - **Region:** elige la más cercana (ej: `South America (São Paulo)`).
4. Click en **"Create new project"**.
5. ⏱️ Espera 1-2 minutos mientras se aprovisiona (verás una animación de carga).

> ✅ **Cómo verificar:** al terminar verás el *dashboard* del proyecto con un menú lateral izquierdo con iconos (tabla, cilindro de base de datos, candado, etc.).

### 4.2 Desactivar la confirmación de email (IMPORTANTE)

La app usa **aprobación manual por el administrador** en vez de confirmación por email. Si no desactivas esto, los usuarios no podrán completar el registro.

1. En el menú lateral, click en el icono de **🔐 Authentication**.
2. Click en **"Sign In / Providers"** (o "Providers" según la versión).
3. Busca la sección **Email** y desactiva el interruptor **"Confirm email"**.
4. Guarda si te lo pide.

> ✅ **Cómo verificar:** el toggle de "Confirm email" debe quedar en gris (apagado).

### 4.3 Obtener las claves del proyecto

1. En el menú lateral, click en el icono de **⚙️ (Settings / Configuración)** abajo a la izquierda.
2. Click en **"API"** (o "Data API").
3. Verás tres datos importantes:
   - **Project URL** → cópiala en `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → cópiala en `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (click en "Reveal" para verla) → cópiala en `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ La `service_role` key da acceso total a tu base de datos. Jamás la compartas.

### 4.4 Ejecutar las migraciones SQL (crear las tablas)

Las migraciones están en la carpeta `supabase/migrations/` del proyecto. Hay que ejecutarlas **en orden** en el SQL Editor de Supabase.

1. En el menú lateral, click en el icono **"SQL Editor"** (parece `>_`).
2. Click en **"New query"** (botón `+ New query`).
3. Abre el archivo `supabase/migrations/001_enums_and_schema.sql` de este repositorio, **copia TODO su contenido** y pégalo en el editor.
4. Click en **"Run"** (botón verde abajo a la derecha, o `Ctrl+Enter`).
5. Deberías ver el mensaje **"Success. No rows returned"**.

> ✅ **Cómo verificar que funcionó:** en el menú lateral entra a **"Table Editor"** (icono de tabla). Deberías ver las tablas: `profiles`, `events`, `costumes`, `costume_events`, `rentals`, `sales`, `audit_logs`, `approval_tokens`.

6. Repite el proceso (nueva query → pegar → Run) con **cada archivo en este orden exacto**:

| # | Archivo | ¿Qué hace? | Verificación |
|---|---|---|---|
| 1 | `001_enums_and_schema.sql` | Crea los tipos (enums) y las 8 tablas | Tablas visibles en Table Editor |
| 2 | `002_indexes.sql` | Crea índices para búsquedas rápidas | "Success" sin errores |
| 3 | `003_rls_policies.sql` | Activa la seguridad por filas (RLS) — **crítico** | En Table Editor cada tabla muestra "RLS enabled" |
| 4 | `004_functions_and_triggers.sql` | Triggers de `updated_at`, validaciones y funciones `confirm_sale` / `reset_costumes_post_event` | "Success" sin errores |
| 5 | `007_profile_fks.sql` | Llaves foráneas de perfiles para joins | "Success" sin errores |
| 6 | `006_storage_policies.sql` | Políticas de acceso a los buckets de imágenes | "Success" sin errores |
| 7 | `008_transactional_rental_sale.sql` | Funciones RPC `create_rental` / `create_sale`: crean arriendos y ventas en una **sola transacción atómica** (sin datos huérfanos, con validación de límites) | "Success" sin errores |

> ⚠️ **NO ejecutes aún** `005_seed.sql` (es el último paso, necesita el UUID del administrador).
> 💡 Si al ejecutar `006` ves un error tipo `relation "storage.objects" does not exist`, significa que saltaste el orden: primero crea los buckets (paso 4.5) y luego vuelve a correr `006`.

### 4.5 Crear los buckets de Storage (imágenes)

Las fotos (carnets, comprobantes, trajes) se guardan en 3 "buckets":

1. En el menú lateral, click en el icono **🗄️ "Storage"**.
2. Click en **"New bucket"** y crea estos **tres**, uno por uno:

| Nombre del bucket | ¿Público? | ¿Para qué? |
|---|---|---|
| `id-cards` | **NO** (privado) | Fotos de carnet de identidad (solo las ve el admin) |
| `vouchers` | **NO** (privado) | Comprobantes de pago |
| `costume-images` | **SÍ** (público) | Fotos de los trajes (las ve todo el mundo) |

Para cada uno: escribe el nombre **exactamente igual** (en minúsculas y con guiones), marca o desmarca el toggle **"Public bucket"** según la tabla, y click en **"Save"**.

> ✅ **Cómo verificar:** en Storage deberías ver los 3 buckets listados; `costume-images` con una etiqueta "Public".

> 💡 Si ejecutaste `006_storage_policies.sql` **antes** de crear los buckets, vuelve a ejecutar el `006` ahora para que las políticas queden aplicadas.

### 4.6 Crear el usuario administrador

1. En el menú lateral, click en **🔐 "Authentication"** → pestaña **"Users"**.
2. Click en **"Add user"** → **"Create new user"**.
3. Completa:
   - **Email:** el correo del administrador (el mismo que pondrás en `SUPER_ADMIN_EMAIL`)
   - **Password:** una contraseña segura (guárdala)
   - Activa **"Auto Confirm User"** ✅ (muy importante)
4. Click en **"Create user"**.
5. En la lista de usuarios verás la fila del nuevo usuario. **Copia su "UID"** (un código tipo `b3f7c2a1-....` — click en la fila para verlo completo).

### 4.7 Darle el rol de administrador (seed)

1. Abre el archivo `supabase/migrations/005_seed.sql`.
2. Reemplaza las dos apariciones de `'SUPER_ADMIN_UUID'` por el UID que copiaste (manteniendo las comillas). Puedes editar los datos de ejemplo (nombre, RUT, teléfono).
3. Pega el contenido ya editado en el **SQL Editor** → **Run**.

> ✅ **Cómo verificar:** ve a **Table Editor** → tabla `profiles` → deberías ver una fila con tu nombre y rol `super_admin`. En la tabla `events` deberías ver 2 eventos de ejemplo.

### 4.8 (Opcional) Liberar trajes automáticamente después de cada evento

La función `reset_costumes_post_event()` devuelve a `disponible` los trajes arrendados cuyos eventos ya pasaron. Puedes ejecutarla a mano cuando quieras:

```sql
select reset_costumes_post_event();
```

O programarla cada noche (requiere activar la extensión `pg_cron` en **Database → Extensions**):

```sql
select cron.schedule(
  'reset-costumes-nightly',
  '0 6 * * *',
  $$select reset_costumes_post_event()$$
);
```

---

## 5. Configuración de emails con Resend

Los emails (aprobación de cuentas, solicitudes, confirmaciones) se envían con Resend.

1. Entra a <https://resend.com> e inicia sesión.
2. En el menú, click en **"API Keys"** → **"Create API Key"**:
   - Name: `caporales-app`
   - Permission: `Sending access`
3. Copia la clave (empieza con `re_`) → pégala en `RESEND_API_KEY`.
4. Configura el remitente (`RESEND_FROM_EMAIL`):
   - **Opción rápida (pruebas):** usa `onboarding@resend.dev` — solo puede enviar correos **al mismo email con el que creaste tu cuenta Resend**.
   - **Opción real (producción):** en **"Domains"** → **"Add Domain"**, agrega tu dominio y configura los registros DNS que Resend te indica (SPF/DKIM). Cuando esté verificado (✓ verde), usa algo como `noreply@tudominio.cl`.
5. Pon en `SUPER_ADMIN_EMAIL` el correo donde quieres recibir las solicitudes de registro.

> ✅ **Cómo verificar:** registra un usuario de prueba en la app; deberías recibir un email con los datos y los botones verde **[APROBAR]** y rojo **[RECHAZAR]**.

> 💡 **Sin Resend configurado:** la app funciona igual; los emails se "omitirán" y verás un aviso `[email] RESEND_API_KEY no configurada` en la consola del servidor. Las aprobaciones siempre se pueden hacer desde el panel `/admin/usuarios`.

---

## 6. Rate limiting con Upstash (opcional)

Protege las API routes contra abuso. Sin Upstash se usa un limitador en memoria (suficiente para desarrollo; en producción serverless se recomienda Upstash).

1. Entra a <https://upstash.com> → **Create Database** (tipo Redis):
   - Name: `caporales-ratelimit`
   - Type: **Regional** (gratis)
2. En la página de la base de datos, sección **"REST API"**, copia:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Pégalos en tu `.env.local` (y luego en Vercel).

> ✅ **Cómo verificar:** haz 35 seguidas solicitudes a cualquier API (ej. recargar rápidamente); la app responderá `429 Demasiadas solicitudes` pasado el límite.

---

## 7. Ejecutar el proyecto en local

```bash
npm run dev
```

Abre <http://localhost:3000> en el navegador.

**Recorrido de prueba recomendado:**

1. Deberías ver la landing con los colores rojo/naranja/dorado.
2. Click en **"Crear cuenta"** y registra un usuario de prueba con una foto de carnet cualquiera.
3. Revisa el email del administrador (`SUPER_ADMIN_EMAIL`): llega la solicitud con botones **APROBAR / RECHAZAR**. (Alternativa: entra como admin a `/admin/usuarios`.)
4. Click en **APROBAR** del email → verás una página de confirmación verde.
5. Cierra sesión e ingresa con el usuario de prueba → ya puedes ver el catálogo en `/arriendo` y `/venta`.
6. Ingresa como administrador → acceso a `/admin` (usuarios, eventos, auditoría).

**Comandos útiles:**

| Comando | ¿Qué hace? |
|---|---|
| `npm run dev` | Servidor de desarrollo en `localhost:3000` |
| `npm run build` | Compila para producción (verifica que todo esté bien) |
| `npm start` | Sirve la versión de producción |
| `npm run type-check` | Verifica los tipos TypeScript |
| `npm run lint` | Revisa el código con ESLint |

---

## 8. Subir el código a GitHub (guía para novatos)

Esta sección te lleva de la mano para publicar tu código en GitHub, aunque nunca hayas usado Git.

### 8.1 ¿Qué es Git y GitHub?

- **Git** es un programa que lleva el "historial" de tu código (como un control de versiones).
- **GitHub** es una página web donde guardas una copia de tu código en la nube (gratis).

Necesitas ambos: Git en tu computador y una cuenta en GitHub.

### 8.2 Instalar Git (solo la primera vez)

1. Entra a <https://git-scm.com/downloads> y descarga la versión para tu sistema (Windows/Mac/Linux).
2. Instálalo con las opciones por defecto (siguiente → siguiente → finalizar).
3. **Cierra y vuelve a abrir la terminal** (o VS Code) para que reconozca el comando.
4. Verifica que quedó instalado:
   ```bash
   git --version
   ```
   Debe mostrar algo como `git version 2.45.0`.

### 8.3 Configurar tu nombre y correo (solo la primera vez)

Git necesita saber quién eres para firmar tus cambios. Ejecuta estos dos comandos (pon **tus** datos entre las comillas):

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo@ejemplo.com"
```

> 💡 Usa el mismo correo con el que crearás tu cuenta de GitHub.

### 8.4 Crear tu cuenta y el repositorio en GitHub

1. Entra a <https://github.com> y crea una cuenta gratuita (botón **Sign up**).
2. Una vez dentro, ve a <https://github.com/new> (o click en el **+** arriba a la derecha → **New repository**).
3. Completa el formulario:
   - **Repository name:** `caporales-san-gabriel`
   - **Description:** *(opcional)* `Plataforma de arriendo y venta de trajes`
   - **Visibilidad:** elige **Private** 🔒 (recomendado: tu código queda solo para ti)
   - **NO marques** ninguna casilla de "Add a README", ".gitignore" ni "License" (el proyecto ya los trae).
4. Click en **"Create repository"**.
5. GitHub te mostrará una página con comandos. **Copia la URL de tu repo**, se ve así:
   ```
   https://github.com/tu-usuario/caporales-san-gabriel.git
   ```

### 8.5 Subir el código (comandos exactos)

Abre una terminal **en la carpeta del proyecto** y ejecuta estos comandos **uno por uno, en orden**:

```bash
git init
```
> Crea la carpeta oculta `.git` (el historial). Solo se hace una vez.

```bash
git add .
```
> Prepara **todos** los archivos para ser guardados. El `.gitignore` evita que se suban `node_modules`, `.env.local` y otros archivos que no deben ir a GitHub.

```bash
git commit -m "Versión inicial - Caporales San Gabriel"
```
> Guarda la primera "foto" del código con un mensaje descriptivo.

```bash
git branch -M main
```
> Renombra la rama principal a `main` (el estándar actual de GitHub).

```bash
git remote add origin https://github.com/tu-usuario/caporales-san-gabriel.git
```
> ⚠️ **Reemplaza la URL** por la que copiaste en el paso 8.4. Conecta tu carpeta local con el repo de GitHub.

```bash
git push -u origin main
```
> 🚀 **Sube el código a GitHub.** La primera vez te pedirá iniciar sesión (se abre una ventana del navegador para autorizar).

> ✅ **Cómo verificar:** recarga la página de tu repositorio en GitHub. Deberías ver todas las carpetas (`src`, `supabase`, etc.) y el README mostrándose en la página principal.

> ⚠️ **Verifica que NO se subió `.env.local`:** en la lista de archivos del repo en GitHub **no debe aparecer** `.env.local`. Si aparece, bórralo de inmediato (ver sección 12, última fila de la tabla).

### 8.6 Subir cambios en el futuro

Cada vez que hagas cambios y quieras subirlos:

```bash
git add .
git commit -m "Describe aquí qué cambiaste"
git push
```

---

## 9. Despliegue en Vercel (producción)

### 9.1 Importar en Vercel

1. Entra a <https://vercel.com> → **"Add New..."** → **"Project"**.
2. Click en **"Import"** junto a tu repositorio.
3. Vercel detecta Next.js automáticamente — **no cambies** los comandos de build.
4. En la sección **"Environment Variables"**, agrega **una por una** todas las variables de tu `.env.local`:

| Variable | Valor en producción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | igual que en local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | igual que en local |
| `SUPABASE_SERVICE_ROLE_KEY` | igual que en local |
| `RESEND_API_KEY` | igual que en local |
| `RESEND_FROM_EMAIL` | tu email verificado en Resend |
| `SUPER_ADMIN_EMAIL` | correo del administrador |
| `NEXT_PUBLIC_APP_URL` | `https://tu-proyecto.vercel.app` (la URL que Vercel te dará; puedes actualizarla después del primer deploy) |
| `NEXT_PUBLIC_SITE_NAME` | `Caporales San Gabriel` |
| `APPROVAL_SECRET` | una frase larga aleatoria (puede ser otra distinta a local) |
| `UPSTASH_REDIS_REST_URL` | (opcional) |
| `UPSTASH_REDIS_REST_TOKEN` | (opcional) |

5. Click en **"Deploy"**. ⏱️ 2-4 minutos.
6. Al terminar verás 🎉 y la URL pública (ej: `https://caporales-san-gabriel.vercel.app`).

> ✅ **Verificación final en producción:** repite el recorrido de prueba del paso 7 en la URL pública. Recuerda actualizar `NEXT_PUBLIC_APP_URL` con la URL real y **redeployar** (Deployments → ⋯ → Redeploy) para que los enlaces de los emails apunten al dominio correcto.

---

## 10. Estructura del proyecto

```
├── supabase/migrations/     # SQL: schema, índices, RLS, funciones, seed
├── src/
│   ├── app/                 # Rutas (App Router)
│   │   ├── (auth)/          #   login, register
│   │   ├── (dashboard)/     #   arriendo, venta, perfil (requieren aprobación)
│   │   ├── admin/           #   panel super_admin (usuarios, eventos, auditoría)
│   │   ├── api/             #   approve, reject, notify, rentals, sales, users, callback
│   │   ├── cuenta-en-revision/
│   │   ├── layout.tsx / page.tsx / globals.css
│   ├── components/          # ui/ (shadcn), layout/, auth/, costumes/, rentals/, sales/, admin/, shared/
│   ├── hooks/               # useAuth, useCostumes, useEvents, useAdmin, useRentals, useSales
│   ├── lib/                 # supabase/, validations/ (Zod), utils/, email/, audit, rate-limit
│   ├── types/               # enums, models, database.types
│   ├── config/              # site, constants
│   └── middleware.ts        # protección de rutas (sesión + rol)
└── .env.local.example
```

---

## 11. Flujos de negocio

### Registro y aprobación
`Registro (con foto de carnet)` → `role='pending'` → email al admin con URL firmada del carnet + botones con **token firmado (HMAC) y expiración de 7 días** → `[APROBAR]` activa la cuenta y envía bienvenida · `[RECHAZAR]` marca `rejected`, **borra el carnet** y avisa con motivo. Todo queda en `audit_logs` con la IP.

### Arriendo
`disponible` → (solicitud validando límites del evento: global y por usuario) → `reservado` → (arrendatario sube comprobante → dueño confirma) → `arrendado` → (tras la fecha del evento, `reset_costumes_post_event()`) → `disponible`.

### Venta
`disponible` → (solicitud de compra) → `reservado` → (comprador sube comprobante → dueño confirma vía función `confirm_sale()`) → `is_sold=true` (el traje desaparece del catálogo, soft delete).

---

## 12. Solución de problemas frecuentes

| Problema | Causa probable | Solución |
|---|---|---|
| "La confirmación por correo está activada..." al registrarse | No desactivaste *Confirm email* | Paso **4.2** |
| Error `row-level security` al consultar | No ejecutaste `003_rls_policies.sql` | Paso **4.4** migración 003 |
| No se ven las fotos de los trajes | Bucket no público o sin políticas | Revisa paso **4.5** y re-ejecuta `006` |
| Error al subir el carnet | Bucket `id-cards` inexistente o políticas faltantes | Paso **4.5** + migración `006` |
| No llegan los emails | Falta `RESEND_API_KEY` o dominio no verificado | Paso **5**; revisa los logs del servidor (`[email] ...`) |
| El admin no ve el panel | El usuario no tiene rol `super_admin` | Repite paso **4.7** con el UID correcto |
| Los links del email llevan a localhost | `NEXT_PUBLIC_APP_URL` apunta a `localhost:3000` | Actualízala en Vercel y redeploy |
| `429 Demasiadas solicitudes` en todo | Upstash mal configurado | Vacía `UPSTASH_REDIS_REST_URL/TOKEN` (usa memoria) o corrige las claves |
| Error de tipos al compilar | — | `npm run type-check` muestra el archivo y línea exacta |
| Subí `.env.local` a GitHub por error | No estaba en `.gitignore` o usaste `git add -f` | 1) En Supabase → Settings → API presiona **"Roll"** para regenerar las claves; en Resend revoca la API key y crea otra. 2) Borra el archivo del historial: `git rm --cached .env.local` → `git commit -m "Elimina .env.local"` → `git push`. 3) Actualiza las claves nuevas en tu `.env.local` y en Vercel |

---

<div align="center">
<strong>Caporales San Gabriel</strong> — Hecho con ❤️ para la agrupación.<br>
Rojo <code>#d62828</code> · Naranja <code>#f77f00</code> · Dorado <code>#fcbf49</code>
</div>