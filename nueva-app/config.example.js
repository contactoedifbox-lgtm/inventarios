/*
 * ============================================================================
 *  Plantilla de configuración — nueva-app (Telegram WebApp "Registro de Gastos")
 * ============================================================================
 *
 *  Este archivo SÍ se versiona en git y NO debe contener secretos.
 *
 *  Cómo usarlo:
 *    1. Copia este archivo como  config.js  en esta misma carpeta.
 *    2. Rellena las URLs reales de los webhooks de n8n.
 *    3. config.js está en .gitignore, por lo que NUNCA se subirá al repositorio.
 *
 *  En producción (GitHub Pages) el archivo config.js se genera automáticamente
 *  desde los "Repository secrets" mediante el workflow
 *  .github/workflows/deploy-nueva-app.yml. Ver nueva-app/README.md.
 * ============================================================================
 */

window.APP_CONFIG = {
  // Webhook n8n que recibe la imagen del documento y devuelve el OCR (tipo, monto, fecha, obras)
  WEBHOOK_OCR_URL: 'https://TU-HOST-N8N/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',

  // Webhook n8n que guarda el gasto definitivo
  WEBHOOK_GUARDAR_URL: 'https://TU-HOST-N8N/webhook/Ingreso_Gasto',

  // (Opcional, recomendado) Token compartido para autenticar las llamadas.
  // Si se define, se envía en la cabecera "X-Webhook-Token".
  // Debe coincidir con la autenticación configurada en el nodo Webhook de n8n.
  WEBHOOK_AUTH_TOKEN: ''
};
