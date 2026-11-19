# inventarios

Repositorio de aplicaciones web del rubro veterinario y afines, publicadas con
**GitHub Pages**. Incluye un portal central y varios sistemas independientes.

## 🌐 Portal

El sitio publicado está en:

**https://contactoedifbox-lgtm.github.io/inventarios/**

El portal ([`index.html`](index.html)) reúne el acceso a todas las versiones y
proyectos.

## 📦 Proyectos

| Proyecto | Descripción | Ruta publicada |
|---|---|---|
| **LankaPets v2.0** | ERP de gestión veterinaria (inventario, ventas, agenda, reserva online) | [`RCP_Veterinaria/`](RCP_Veterinaria/README.md) → `/inventarios/RCP_Veterinaria/` |
| **nueva-app** | Registro de gastos (Telegram WebApp) | `/inventarios/nueva-app/` |
| **Trajes SG** | Gestión y catálogo de trajes | `/inventarios/trajes_sg/` |
| **Caporales San Gabriel** | Plataforma de arriendo y venta de trajes (Next.js + Supabase) | repo independiente |
| **Snake 3D** | Juego clásico en 3D (Three.js) | `/inventarios/Snake3D/` |
| **Versiones Original / Mejoras / Mejoras2** | Inventario y ventas para veterinaria (versiones previas) | `/inventarios/original/`, `/mejoras/`, `/mejoras2/` |

## 🐾 LankaPets v2.0

La aplicación principal de este repositorio. Documentación completa en
[`RCP_Veterinaria/README.md`](RCP_Veterinaria/README.md).

- **Stack:** Vite + React + TypeScript + Tailwind + Supabase.
- **Roles:** Maestro, Vendedor y Cliente, con Row Level Security.
- **Módulos:** dashboard, inventario, ventas/devoluciones, clientes y mascotas,
  profesionales, agenda y página pública de reservas.
- **Enlace directo:** https://contactoedifbox-lgtm.github.io/inventarios/RCP_Veterinaria/

### Ejecutar en local

```bash
cd RCP_Veterinaria
npm install
cp .env.example .env.local   # completar con la URL y la clave publishable
npm run dev                  # http://localhost:5173
```

## 🚀 Despliegue (GitHub Pages)

El workflow [`.github/workflows/deploy-nueva-app.yml`](.github/workflows/deploy-nueva-app.yml)
se ejecuta al hacer `push` a `main`:

1. Compila `RCP_Veterinaria` con `VITE_BASE_PATH=/inventarios/RCP_Veterinaria/`.
2. Genera `nueva-app/config.js` desde los secretos de n8n.
3. Ensambla el sitio (portal raíz + build de LankaPets bajo `RCP_Veterinaria/`).
4. Publica todo en GitHub Pages.

**Secretos requeridos** (Settings → Secrets and variables → Actions):

| Secreto | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave publishable de Supabase |
| `VITE_TURNSTILE_SITE_KEY` | Site key pública de Cloudflare Turnstile |
| `N8N_WEBHOOK_OCR_URL` | Webhook OCR (nueva-app) |
| `N8N_WEBHOOK_GUARDAR_URL` | Webhook guardar (nueva-app) |
| `N8N_WEBHOOK_AUTH_TOKEN` | Token de autorización (nueva-app) |

Para activar Pages: **Settings → Pages → Source = GitHub Actions**.

## 🗂️ Estructura

```text
inventarios/
├── index.html            Portal central (GitHub Pages)
├── .github/workflows/    Workflows de despliegue
├── RCP_Veterinaria/      LankaPets v2.0 (Vite + React + Supabase)
├── nueva-app/            Registro de gastos (Telegram WebApp)
├── Trajes_SG_V2/         Caporales San Gabriel
├── Pagina_Gorras/        Página de gorras
└── Petra/                Proyecto Petra
```

## 🔐 Seguridad

- Los archivos `.env`, `.env.*` (excepto `.env.example`) y `config.js` con
  secretos están en `.gitignore` y **nunca** se suben.
- Las claves `secret` de Supabase viven solo en Edge Functions y GitHub Secrets.
- El frontend usa la clave `publishable` y depende del RLS de la base de datos.
