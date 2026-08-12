/**
 * Templates HTML de emails transaccionales.
 * Estilos inline (compatibilidad con clientes de correo) y colores de marca:
 *   rojo #d62828 · naranja #f77f00 · dorado #fcbf49 · oscuro #1a1a1a
 */
import { formatCLP } from '@/lib/utils/currency';
import { formatDateLong } from '@/lib/utils/dates';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Caporales San Gabriel';

// ---------- Layout base ----------
function baseLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — ${SITE_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#fafafa;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eaeaea;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#d62828 0%,#f77f00 100%);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;">${SITE_NAME}</h1>
              <p style="margin:6px 0 0;color:#fcbf49;font-size:13px;letter-spacing:1px;text-transform:uppercase;">${title}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#1a1a1a;font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#1a1a1a;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#fcbf49;font-size:12px;">© ${new Date().getFullYear()} ${SITE_NAME}</p>
              <p style="margin:6px 0 0;color:#888888;font-size:11px;">Este es un correo automático, por favor no responder.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------- Componentes reutilizables ----------
function button(url: string, label: string, color: string): string {
  return `<a href="${url}" target="_blank" style="display:inline-block;background-color:${color};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:8px;margin:8px 4px;">${label}</a>`;
}

function dataRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;color:#666666;font-size:13px;width:160px;vertical-align:top;">${label}</td>
    <td style="padding:8px 12px;color:#1a1a1a;font-size:14px;font-weight:600;">${value}</td>
  </tr>`;
}

function dataTable(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border-radius:8px;border:1px solid #eeeeee;margin:16px 0;">${rows}</table>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;">${text}</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #eeeeee;margin:24px 0;" />`;
}

// ============================================================
// 1. NUEVA SOLICITUD DE REGISTRO → SUPER ADMIN
// ============================================================
export interface NewRegistrationEmailData {
  fullName: string;
  rut: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  idCardSignedUrl: string | null;
  approveUrl: string;
  rejectUrl: string;
}

export function emailNuevaSolicitudAdmin(data: NewRegistrationEmailData): string {
  const content = `
    ${paragraph(`Se ha registrado un nuevo usuario que solicita aprobación para usar la plataforma:`)}
    ${dataTable(`
      ${dataRow('Nombre completo', data.fullName)}
      ${dataRow('RUT', data.rut)}
      ${dataRow('Teléfono', data.phone)}
      ${dataRow('Correo', data.email)}
      ${dataRow('Dirección', `${data.address}, ${data.city}`)}
    `)}
    ${
      data.idCardSignedUrl
        ? paragraph(`<strong>Carnet de identidad:</strong> <a href="${data.idCardSignedUrl}" target="_blank" style="color:#f77f00;">Ver imagen del carnet</a> (enlace válido por 24 horas)`)
        : paragraph('<em>El usuario no adjuntó imagen de carnet.</em>')
    }
    ${divider()}
    <p style="text-align:center;margin:0 0 8px;font-weight:bold;">¿Qué deseas hacer con esta solicitud?</p>
    <p style="text-align:center;margin:0;">
      ${button(data.approveUrl, '✔ APROBAR', '#2e7d32')}
      ${button(data.rejectUrl, '✖ RECHAZAR', '#d62828')}
    </p>
    <p style="text-align:center;color:#999999;font-size:12px;margin-top:16px;">Estos enlaces expiran en 7 días y son de un solo uso.</p>
  `;
  return baseLayout('Nueva solicitud de registro', content);
}

// ============================================================
// 2. BIENVENIDA — CUENTA APROBADA
// ============================================================
export function emailBienvenidaAprobado(fullName: string, loginUrl: string): string {
  const content = `
    ${paragraph(`¡Hola <strong>${fullName}</strong>!`)}
    ${paragraph(`Tu cuenta en <strong>${SITE_NAME}</strong> ha sido <span style="color:#2e7d32;font-weight:bold;">APROBADA</span>. Ya puedes publicar trajes, solicitar arriendos y comprar trajes de la comunidad.`)}
    <p style="text-align:center;">${button(loginUrl, 'Ingresar a la plataforma', '#f77f00')}</p>
    ${divider()}
    ${paragraph('<strong>¿Qué puedes hacer ahora?</strong>')}
    ${paragraph('• Publicar tu traje para arriendo o venta.<br>• Solicitar el arriendo de un traje para un evento.<br>• Comprar trajes disponibles en el catálogo.')}
  `;
  return baseLayout('¡Cuenta aprobada!', content);
}

// ============================================================
// 3. CUENTA RECHAZADA
// ============================================================
export function emailCuentaRechazada(fullName: string, reason: string): string {
  const content = `
    ${paragraph(`Hola <strong>${fullName}</strong>,`)}
    ${paragraph(`Lamentamos informarte que tu solicitud de registro en <strong>${SITE_NAME}</strong> ha sido <span style="color:#d62828;font-weight:bold;">rechazada</span>.`)}
    ${dataTable(dataRow('Motivo', reason))}
    ${paragraph('Si crees que se trata de un error, comunícate con la directiva de la agrupación.')}
  `;
  return baseLayout('Solicitud rechazada', content);
}

// ============================================================
// 4. CUENTA SUSPENDIDA
// ============================================================
export function emailCuentaSuspendida(fullName: string, reason: string): string {
  const content = `
    ${paragraph(`Hola <strong>${fullName}</strong>,`)}
    ${paragraph(`Tu cuenta en <strong>${SITE_NAME}</strong> ha sido <span style="color:#d62828;font-weight:bold;">suspendida</span>.`)}
    ${dataTable(dataRow('Motivo', reason))}
    ${paragraph('Mientras tu cuenta esté suspendida no podrás publicar trajes ni realizar solicitudes. Para apelar esta decisión, contacta a la directiva.')}
  `;
  return baseLayout('Cuenta suspendida', content);
}

// ============================================================
// 5. SOLICITUD DE ARRIENDO → DUEÑO DEL TRAJE
// ============================================================
export interface RentRequestEmailData {
  ownerName: string;
  renterFullName: string;
  renterRut: string;
  renterPhone: string;
  renterEmail: string;
  costumeSummary: string;
  price: number;
  eventName: string;
  eventDate: string;
  dashboardUrl: string;
}

export function emailSolicitudArriendo(data: RentRequestEmailData): string {
  const content = `
    ${paragraph(`¡Hola <strong>${data.ownerName}</strong>!`)}
    ${paragraph(`Has recibido una <strong>solicitud de arriendo</strong> para tu traje <strong>${data.costumeSummary}</strong>:`)}
    ${dataTable(`
      ${dataRow('Solicitante', data.renterFullName)}
      ${dataRow('RUT', data.renterRut)}
      ${dataRow('Teléfono', data.renterPhone)}
      ${dataRow('Correo', data.renterEmail)}
      ${dataRow('Evento', `${data.eventName} — ${formatDateLong(data.eventDate)}`)}
      ${dataRow('Precio acordado', formatCLP(data.price))}
    `)}
    ${paragraph('El traje quedó en estado <strong>RESERVADO</strong>. Una vez recibas el pago, confirma el arriendo desde tu panel.')}
    <p style="text-align:center;">${button(data.dashboardUrl, 'Ver solicitud en mi panel', '#f77f00')}</p>
  `;
  return baseLayout('Nueva solicitud de arriendo', content);
}

// ============================================================
// 6. ARRIENDO CONFIRMADO → ARRENDATARIO
// ============================================================
export interface RentConfirmedEmailData {
  renterName: string;
  costumeSummary: string;
  eventName: string;
  eventDate: string;
  ownerName: string;
  ownerPhone: string;
}

export function emailArriendoConfirmado(data: RentConfirmedEmailData): string {
  const content = `
    ${paragraph(`¡Hola <strong>${data.renterName}</strong>!`)}
    ${paragraph(`Tu arriendo del traje <strong>${data.costumeSummary}</strong> ha sido <span style="color:#2e7d32;font-weight:bold;">CONFIRMADO</span>.`)}
    ${dataTable(`
      ${dataRow('Evento', `${data.eventName} — ${formatDateLong(data.eventDate)}`)}
      ${dataRow('Dueño del traje', data.ownerName)}
      ${dataRow('Contacto del dueño', data.ownerPhone)}
    `)}
    ${paragraph('Coordina la entrega del traje directamente con su dueño. ¡Éxito en tu presentación!')}
  `;
  return baseLayout('Arriendo confirmado', content);
}

// ============================================================
// 7. SOLICITUD DE COMPRA → DUEÑO DEL TRAJE
// ============================================================
export interface SaleRequestEmailData {
  ownerName: string;
  buyerFullName: string;
  buyerRut: string;
  buyerPhone: string;
  buyerEmail: string;
  costumeSummary: string;
  price: number;
  dashboardUrl: string;
}

export function emailSolicitudCompra(data: SaleRequestEmailData): string {
  const content = `
    ${paragraph(`¡Hola <strong>${data.ownerName}</strong>!`)}
    ${paragraph(`Has recibido una <strong>solicitud de compra</strong> para tu traje <strong>${data.costumeSummary}</strong>:`)}
    ${dataTable(`
      ${dataRow('Comprador', data.buyerFullName)}
      ${dataRow('RUT', data.buyerRut)}
      ${dataRow('Teléfono', data.buyerPhone)}
      ${dataRow('Correo', data.buyerEmail)}
      ${dataRow('Precio de venta', formatCLP(data.price))}
    `)}
    ${paragraph('El traje quedó en estado <strong>RESERVADO</strong>. Una vez recibas el pago, confirma la venta desde tu panel.')}
    <p style="text-align:center;">${button(data.dashboardUrl, 'Ver solicitud en mi panel', '#f77f00')}</p>
  `;
  return baseLayout('Nueva solicitud de compra', content);
}

// ============================================================
// 8. VENTA CONFIRMADA → COMPRADOR
// ============================================================
export interface SaleConfirmedEmailData {
  buyerName: string;
  costumeSummary: string;
  price: number;
  ownerName: string;
  ownerPhone: string;
}

export function emailVentaConfirmada(data: SaleConfirmedEmailData): string {
  const content = `
    ${paragraph(`¡Hola <strong>${data.buyerName}</strong>!`)}
    ${paragraph(`Tu compra del traje <strong>${data.costumeSummary}</strong> ha sido <span style="color:#2e7d32;font-weight:bold;">CONFIRMADA</span>.`)}
    ${dataTable(`
      ${dataRow('Monto', formatCLP(data.price))}
      ${dataRow('Vendedor', data.ownerName)}
      ${dataRow('Contacto del vendedor', data.ownerPhone)}
    `)}
    ${paragraph('Coordina la entrega del traje directamente con el vendedor. ¡Gracias por ser parte de la comunidad!')}
  `;
  return baseLayout('Venta confirmada', content);
}

// ============================================================
// 9. CONFIRMACIÓN DE DISPONIBILIDAD (App A style)
// ============================================================
export interface ConfirmAvailabilityEmailData {
  renterName: string;
  renterEmail: string;
  ownerName: string;
  suitTitle: string;
  rentalPrice: number;
  eventName: string;
  bankDetails: {
    tipoCuenta: string;
    banco: string;
    numeroCuenta: string;
    rut: string;
    correo: string;
    nombre: string;
  };
  paymentDeadline: string;
  dashboardUrl: string;
}

export function emailConfirmAvailability(data: ConfirmAvailabilityEmailData): string {
  const bankText = `
    ${dataRow('Banco', data.bankDetails.banco)}
    ${dataRow('Tipo Cuenta', data.bankDetails.tipoCuenta)}
    ${dataRow('N° Cuenta', data.bankDetails.numeroCuenta)}
    ${dataRow('RUT Titular', data.bankDetails.rut)}
    ${dataRow('Nombre Titular', data.bankDetails.nombre)}
    ${dataRow('Correo Comprobante', data.bankDetails.correo)}
  `;

  const content = `
    ${paragraph(`¡Hola <strong>${data.renterName}</strong>!`)}
    ${paragraph(`El propietario <strong>${data.ownerName}</strong> ha confirmado la disponibilidad de <strong>${data.suitTitle}</strong> para el evento <strong>${data.eventName}</strong>.`)}
    ${paragraph(`Tienes un plazo límite de <strong>24 horas</strong> para realizar la transferencia bancaria y adjuntar tu comprobante.`)}
    ${paragraph(`<strong>Monto a transferir:</strong> ${formatCLP(data.rentalPrice)}`)}
    ${divider()}
    ${paragraph('<strong>Datos bancarios del propietario:</strong>')}
    ${dataTable(bankText)}
    ${divider()}
    <p style="text-align:center;">${button(data.dashboardUrl, 'Ir a pagar ahora', '#f77f00')}</p>
  `;
  return baseLayout('¡Traje disponible! Tienes 24h para pagar', content);
}

// ============================================================
// 10. RECHAZO DE DISPONIBILIDAD (App A style)
// ============================================================
export interface RejectAvailabilityEmailData {
  renterName: string;
  ownerName: string;
  suitTitle: string;
}

export function emailRejectAvailability(data: RejectAvailabilityEmailData): string {
  const content = `
    ${paragraph(`Estimado/a <strong>${data.renterName}</strong>,`)}
    ${paragraph(`El propietario <strong>${data.ownerName}</strong> ha indicado que el traje <strong>${data.suitTitle}</strong> ya no está disponible para arriendo.`)}
    ${paragraph('Te sugerimos buscar otros trajes disponibles en el catálogo de la plataforma.')}
  `;
  return baseLayout('Solicitud no disponible', content);
}

// ============================================================
// 11. ARRENDADO A OTRO (App A style)
// ============================================================
export interface RentedToAnotherEmailData {
  renterName: string;
  ownerName: string;
  suitTitle: string;
}

export function emailRentedToAnother(data: RentedToAnotherEmailData): string {
  const content = `
    ${paragraph(`Estimado/a <strong>${data.renterName}</strong>,`)}
    ${paragraph(`El traje <strong>${data.suitTitle}</strong> ha sido arrendado a otro usuario de la cola.`)}
    ${paragraph(`Te sugerimos buscar alternativas disponibles en el catálogo de la plataforma.`)}
  `;
  return baseLayout('Traje no disponible', content);
}

// ============================================================
// 12. PAGO CONFIRMADO (App A style)
// ============================================================
export interface PaymentConfirmedEmailData {
  renterName: string;
  ownerName: string;
  suitTitle: string;
}

export function emailPaymentConfirmed(data: PaymentConfirmedEmailData): string {
  const content = `
    ${paragraph(`¡Hola <strong>${data.renterName}</strong>!`)}
    ${paragraph(`El propietario <strong>${data.ownerName}</strong> ha verificado la recepción de tu pago.`)}
    ${paragraph(`Tu arriendo para <strong>${data.suitTitle}</strong> se encuentra oficialmente confirmado.`)}
    ${paragraph('Coordina la entrega del traje directamente con el dueño.')}
  `;
  return baseLayout('¡Pago confirmado!', content);
}

// ============================================================
// 13. TRANSFERENCIA REALIZADA (App A style)
// ============================================================
export interface TransferReceivedEmailData {
  ownerName: string;
  renterName: string;
  suitTitle: string;
  price: number;
}

export function emailTransferReceived(data: TransferReceivedEmailData): string {
  const content = `
    ${paragraph(`Estimado/a <strong>${data.ownerName}</strong>,`)}
    ${paragraph(`El usuario <strong>${data.renterName}</strong> ha adjuntado su comprobante de transferencia bancaria por <strong>${formatCLP(data.price)}</strong>.`)}
    ${paragraph(`Por favor, revisa tu cuenta bancaria y confirma la recepción del pago en el sistema.`)}
  `;
  return baseLayout('Comprobante de transferencia recibido', content);
}

// ============================================================
// 14. LIBERACIÓN POR NO PAGO (App A style)
// ============================================================
export interface ExpiredPaymentEmailData {
  ownerName: string;
  renterName: string;
  suitTitle: string;
}

export function emailExpiredPayment(data: ExpiredPaymentEmailData): string {
  const content = `
    ${paragraph(`Estimado/a <strong>${data.ownerName}</strong>,`)}
    ${paragraph(`El arrendatario <strong>${data.renterName}</strong> no realizó la transferencia bancaria en el plazo límite de 24 horas.`)}
    ${paragraph(`La solicitud ha sido cancelada y el traje <strong>${data.suitTitle}</strong> está disponible nuevamente. Revisa tu cola de arriendo para seleccionar al siguiente interesado.`)}
  `;
  return baseLayout('Plazo de pago expirado', content);
}

// ============================================================
// 15. TRAJE LIBERADO (App A style - para suscriptores)
// ============================================================
export interface SuitLiberatedEmailData {
  userEmail: string;
  userName: string;
  suitTitle: string;
  suitId: string;
  dashboardUrl: string;
}

export function emailSuitLiberated(data: SuitLiberatedEmailData): string {
  const content = `
    ${paragraph(`¡Hola <strong>${data.userName}</strong>!`)}
    ${paragraph(`El traje <strong>${data.suitTitle}</strong> se encuentra disponible nuevamente para arriendo.`)}
    <p style="text-align:center;">${button(data.dashboardUrl, 'Ver traje en el catálogo', '#f77f00')}</p>
  `;
  return baseLayout('¡Traje disponible nuevamente!', content);
}

// ============================================================
// 16. ARRIENDO CANCELADO (App A style)
// ============================================================
export interface RentalCanceledEmailData {
  userEmail: string;
  userName: string;
  suitTitle: string;
  reason?: string;
}

export function emailRentalCanceled(data: RentalCanceledEmailData): string {
  const content = `
    ${paragraph(`Estimado/a <strong>${data.userName}</strong>,`)}
    ${paragraph(`Le informamos que su reserva o arriendo del traje <strong>${data.suitTitle}</strong> ha sido cancelado.`)}
    ${data.reason ? paragraph(`<strong>Motivo:</strong> ${data.reason}`) : ''}
    ${paragraph('Le solicitamos amablemente buscar un nuevo traje disponible en el catálogo de la plataforma.')}
    ${paragraph('Disculpe las molestias ocasionadas.')}
  `;
  return baseLayout('Arriendo cancelado', content);
}
