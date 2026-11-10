# nueva-app — Registro de Gastos (Telegram WebApp)

WebApp de Telegram para registrar gastos: se sube la foto de un documento,
un webhook de **n8n** realiza el OCR y devuelve los datos, y un segundo
webhook guarda el gasto.

## 🔒 Configuración de los webhooks (sin secretos en el código)

Las URLs de los webhooks de n8n **ya no están en el código fuente**. La app las
lee en tiempo de ejecución desde `window.APP_CONFIG`, definido en un archivo
`config.js` que **no se versiona** (está en `.gitignore`).

### Desarrollo local

```bash
cp nueva-app/config.example.js nueva-app/config.js
# edita nueva-app/config.js y coloca las URLs reales
```

Abre `nueva-app/index.html` (o sirve la carpeta con cualquier servidor estático).

### Producción en GitHub Pages (automático)

El workflow [`.github/workflows/deploy-nueva-app.yml`](../.github/workflows/deploy-nueva-app.yml)
genera `nueva-app/config.js` desde los **Repository secrets** antes de publicar.

1. Ve a **Settings → Secrets and variables → Actions → New repository secret** y crea:

   | Nombre del secreto          | Valor                                                        |
   |-----------------------------|--------------------------------------------------------------|
   | `N8N_WEBHOOK_OCR_URL`       | URL del webhook de OCR                                        |
   | `N8N_WEBHOOK_GUARDAR_URL`   | URL del webhook que guarda el gasto                           |
   | `N8N_WEBHOOK_AUTH_TOKEN`    | (Opcional) token para la cabecera `X-Webhook-Token`           |

2. Ve a **Settings → Pages** y en *Build and deployment → Source* selecciona
   **GitHub Actions**.

3. Haz un push a `main` (o ejecuta el workflow manualmente con *Run workflow*).

> ⚠️ **Importante:** aunque la URL no esté en el repositorio, un usuario del
> WebApp puede ver la URL real inspeccionando el tráfico de red. Por eso se
> recomienda **proteger el webhook de n8n con autenticación** (ver abajo).

## 🛡️ Proteger el webhook en n8n (recomendado)

En el nodo **Webhook** de n8n, activa **Authentication → Header Auth** y define,
por ejemplo:

- **Header Name:** `X-Webhook-Token`
- **Header Value:** una cadena aleatoria larga

Luego guarda ese mismo valor en el secreto `N8N_WEBHOOK_AUTH_TOKEN` (y en
`WEBHOOK_AUTH_TOKEN` de tu `config.js` local). La app enviará automáticamente la
cabecera en cada petición.

## ⚠️ Rotación de secretos

Las URLs anteriores estuvieron expuestas en el historial de git. Se recomienda
**regenerar/rotar** las URLs de los webhooks en n8n (o al menos añadirles
autenticación) para invalidar las filtradas.
