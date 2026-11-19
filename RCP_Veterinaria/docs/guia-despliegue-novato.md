# Guía para publicar LankaPets en GitHub (para principiantes)

Esta guía asume que **no sabes programar**. Vamos paso a paso, con clics exactos.
Al terminar, tu aplicación quedará publicada en internet y accesible desde
cualquier navegador.

---

## ¿Qué vamos a hacer? (en simple)

Tu aplicación tiene dos partes:

1. **La aplicación** (lo que ves en pantalla): vive en **GitHub**.
2. **La base de datos** (donde se guardan clientes, ventas, etc.): ya está en
   **Supabase** y **ya funciona**.

GitHub puede "construir" y publicar tu aplicación automáticamente cada vez que
subes cambios. Para eso usa un archivo llamado **workflow** (una receta). Esa
receta **todavía no está subida**, y por eso el sitio se ve en blanco. Vamos a
subirla.

Al final, tu app quedará en esta dirección:

```
https://contactoedifbox-lgtm.github.io/inventarios/RCP_Veterinaria/
```

---

## Antes de empezar

- Ten a mano tu **usuario de GitHub**: `contactoedifbox-lgtm`.
- Abre el navegador en: `https://github.com/contactoedifbox-lgtm/inventarios`
- No necesitas instalar nada.

---

## Paso 1 — Subir la "receta" (workflow)

Este es el paso que falta. Lo haremos **desde la web de GitHub**, sin programas.

1. Entra a:
   `https://github.com/contactoedifbox-lgtm/inventarios/blob/main/.github/workflows/deploy-nueva-app.yml`
2. Arriba a la derecha del recuadro del archivo, haz clic en el **ícono de lápiz**
   (✏️ "Edit this file").
3. **Selecciona TODO el contenido** del recuadro (haz clic dentro y presiona
   `Ctrl + A`) y **bórralo** (`Supr`).
4. **Copia y pega** exactamente esto:

```yaml
name: Deploy (GitHub Pages)

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configurar Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: RCP_Veterinaria/package-lock.json

      - name: Instalar dependencias de RCP_Veterinaria
        working-directory: RCP_Veterinaria
        run: npm ci

      - name: Build de RCP_Veterinaria
        working-directory: RCP_Veterinaria
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_TURNSTILE_SITE_KEY: ${{ secrets.VITE_TURNSTILE_SITE_KEY }}
          VITE_BASE_PATH: /inventarios/RCP_Veterinaria/
        run: npm run build

      - name: Generar nueva-app/config.js desde los secretos
        env:
          N8N_WEBHOOK_OCR_URL: ${{ secrets.N8N_WEBHOOK_OCR_URL }}
          N8N_WEBHOOK_GUARDAR_URL: ${{ secrets.N8N_WEBHOOK_GUARDAR_URL }}
          N8N_WEBHOOK_AUTH_TOKEN: ${{ secrets.N8N_WEBHOOK_AUTH_TOKEN }}
        run: |
          if [ -z "$N8N_WEBHOOK_OCR_URL" ] || [ -z "$N8N_WEBHOOK_GUARDAR_URL" ]; then
            echo "::warning::Faltan los secretos N8N_WEBHOOK_OCR_URL y/o N8N_WEBHOOK_GUARDAR_URL."
          fi
          {
            echo "window.APP_CONFIG = {"
            echo "  WEBHOOK_OCR_URL: \"${N8N_WEBHOOK_OCR_URL}\","
            echo "  WEBHOOK_GUARDAR_URL: \"${N8N_WEBHOOK_GUARDAR_URL}\","
            echo "  WEBHOOK_AUTH_TOKEN: \"${N8N_WEBHOOK_AUTH_TOKEN}\""
            echo "};"
          } > nueva-app/config.js

      - name: Ensamblar sitio para Pages
        run: |
          mkdir -p staging
          rsync -a \
            --exclude '.git' \
            --exclude 'node_modules' \
            --exclude 'RCP_Veterinaria/node_modules' \
            --exclude 'RCP_Veterinaria/src' \
            --exclude 'RCP_Veterinaria/supabase' \
            --exclude 'RCP_Veterinaria/tests' \
            --exclude 'RCP_Veterinaria/plans' \
            --exclude 'RCP_Veterinaria/dist' \
            ./ staging/
          mkdir -p staging/RCP_Veterinaria
          cp -r RCP_Veterinaria/dist/. staging/RCP_Veterinaria/

      - name: Configurar Pages
        uses: actions/configure-pages@v5

      - name: Empaquetar el sitio
        uses: actions/upload-pages-artifact@v3
        with:
          path: staging

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Publicar en GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

5. Baja hasta el final de la página. En **"Commit changes"**:
   - Escribe un mensaje, por ejemplo: `Publicar LankaPets`
   - Deja seleccionado **"Commit directly to the main branch"**.
   - Haz clic en el botón verde **"Commit changes"**.

> **¿Qué acabo de hacer?** Reemplacé la receta vieja por la nueva, que además de
> publicar el portal, **construye y publica LankaPets**.

---

## Paso 2 — Guardar las "llaves" (secretos) en GitHub

La app necesita 3 datos para conectarse a la base de datos. Se guardan como
"secretos" (nadie los ve, ni siquiera tú después de guardarlos).

1. Ve a:
   `https://github.com/contactoedifbox-lgtm/inventarios/settings/secrets/actions`
2. Haz clic en **"New repository secret"** (botón verde).
3. Crea **uno por uno** estos tres secretos (Nombre exacto → Valor):

| Nombre (Name) | Valor (Secret) |
|---|---|
| `VITE_SUPABASE_URL` | `https://vparxfmoqfaahsdqmjcf.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_kD6bulbCcinXkZZ9_4kM2Q_6OhBGMd7` |
| `VITE_TURNSTILE_SITE_KEY` | *(déjalo vacío por ahora; se completa en el Paso 5)* |

Para cada uno: escribe el **Name**, pega el **Secret**, y haz clic en
**"Add secret"**.

> Si ya existían los secretos de `nueva-app` (`N8N_WEBHOOK_*`), **no los toques**.

---

## Paso 3 — Activar la publicación (GitHub Pages)

1. Ve a:
   `https://github.com/contactoedifbox-lgtm/inventarios/settings/pages`
2. En **"Build and deployment" → "Source"**, elige **"GitHub Actions"**.
   (No elijas "Deploy from a branch".)
3. No hay botón de guardar; se guarda solo.

---

## Paso 4 — Ver que se publicó

1. Ve a:
   `https://github.com/contactoedifbox-lgtm/inventarios/actions`
2. Verás una ejecución llamada **"Deploy (GitHub Pages)"** con un círculo
   **amarillo** (en curso). Espera 1–3 minutos.
3. Cuando el círculo se ponga **verde** ✅, abre:
   `https://contactoedifbox-lgtm.github.io/inventarios/RCP_Veterinaria/`
4. Deberías ver la pantalla de **inicio de sesión** de LankaPets.

> Si el círculo queda **rojo** ❌, entra a la ejecución, mira el paso que falló y
> revisa "Problemas comunes" al final de esta guía.

---

## Paso 5 — Configurar el correo (para que lleguen los enlaces)

El correo integrado de Supabase sirve para probar, pero **rechaza correos de
prueba** y limita a 2 por hora. Para uso real, conecta tu propio correo.

1. Entra a tu proyecto Supabase:
   `https://supabase.com/dashboard/project/vparxfmoqfaahsdqmjcf`
2. Menú izquierdo: **Authentication → Emails** (o **Project Settings → Auth**).
3. Busca **"SMTP Settings"** y actívalo. Necesitas datos de un servicio de correo
   (por ejemplo **Resend**, **SendGrid** o **Gmail**). Ejemplo con Resend:
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **Username**: `resend`
   - **Password**: tu API key de Resend
   - **Sender email**: un correo tuyo verificado
4. Guarda.

> Mientras no configures SMTP, los correos de "crear contraseña" y "olvidé mi
> contraseña" pueden no llegar o llegar con retraso.

---

## Paso 6 — Activar "Continuar con Google" (opcional)

Solo si quieres que los clientes entren con su cuenta de Google.

1. En **Google Cloud Console** (`https://console.cloud.google.com`) crea un
   **OAuth client ID** de tipo **Web application**.
2. En **Authorized redirect URIs** agrega exactamente:
   `https://vparxfmoqfaahsdqmjcf.supabase.co/auth/v1/callback`
3. Copia el **Client ID** y **Client Secret**.
4. En **Supabase → Authentication → Sign In / Providers → Google**: actívalo y
   pega ambos valores.
5. En **Authentication → URL Configuration**:
   - **Site URL**: `https://contactoedifbox-lgtm.github.io/inventarios/RCP_Veterinaria/`
   - **Redirect URLs**: agrega esa misma URL y `http://localhost:5173/`.

---

## Problemas comunes

| Qué ves | Qué significa | Qué hacer |
|---|---|---|
| Página en blanco y en F12 dice `MIME text/html` | El workflow no está subido (Paso 1) | Repite el Paso 1 |
| El círculo de Actions queda rojo | Faltan secretos o el build falló | Revisa el Paso 2 y mira el paso que falló |
| "404" al abrir la app | Pages no está en "GitHub Actions" | Repite el Paso 3 |
| El correo no llega | SMTP no configurado | Repite el Paso 5 |
| "Continuar con Google" da error | Google no está activado | Repite el Paso 6 |

---

## Cómo actualizar la app en el futuro

Cada vez que se suban cambios a la rama `main`, GitHub **vuelve a publicar
automáticamente**. No tienes que hacer nada más: solo espera a que el círculo de
**Actions** se ponga verde.

---

## Resumen ultra corto

1. **Paso 1**: pegar la receta (workflow) en GitHub. ← *el que falta*
2. **Paso 2**: crear 3 secretos.
3. **Paso 3**: activar Pages con "GitHub Actions".
4. **Paso 4**: esperar el ✅ y abrir la app.
5. **Paso 5**: configurar el correo (SMTP).
6. **Paso 6**: activar Google (opcional).
