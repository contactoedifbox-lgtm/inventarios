import { Resend } from 'resend';
import {
  emailArriendoConfirmado,
  emailBienvenidaAprobado,
  emailCuentaRechazada,
  emailCuentaSuspendida,
  emailNuevaSolicitudAdmin,
  emailSolicitudArriendo,
  emailSolicitudCompra,
  emailVentaConfirmada,
  type NewRegistrationEmailData,
  type RentConfirmedEmailData,
  type RentRequestEmailData,
  type SaleConfirmedEmailData,
  type SaleRequestEmailData,
} from './templates';

/**
 * Lógica de envío de emails transaccionales con Resend.
 * SOLO SERVIDOR: usa RESEND_API_KEY.
 */

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Caporales San Gabriel';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@caporalessangabriel.cl';
const FROM = `${SITE_NAME} <${FROM_EMAIL}>`;

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Falta RESEND_API_KEY en las variables de entorno.');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export interface SendResult {
  success: boolean;
  error?: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  // En desarrollo sin API key configurada, registrar en consola en vez de fallar
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY no configurada. Email omitido → ${to} | ${subject}`);
    return { success: false, error: 'RESEND_API_KEY no configurada' };
  }

  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`[email] Error Resend → ${to}:`, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido al enviar email';
    console.error(`[email] Excepción → ${to}:`, message);
    return { success: false, error: message };
  }
}

// ---------- 1. Nueva solicitud de registro → admin ----------
export async function sendNewRegistrationToAdmin(
  data: NewRegistrationEmailData,
): Promise<SendResult> {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!adminEmail) return { success: false, error: 'SUPER_ADMIN_EMAIL no configurado' };
  return sendEmail(
    adminEmail,
    `Nueva solicitud de registro: ${data.fullName}`,
    emailNuevaSolicitudAdmin(data),
  );
}

// ---------- 2. Bienvenida (aprobado) ----------
export async function sendWelcomeApproved(
  email: string,
  fullName: string,
  loginUrl: string,
): Promise<SendResult> {
  return sendEmail(
    email,
    `¡Tu cuenta fue aprobada! — ${SITE_NAME}`,
    emailBienvenidaAprobado(fullName, loginUrl),
  );
}

// ---------- 3. Cuenta rechazada ----------
export async function sendAccountRejected(
  email: string,
  fullName: string,
  reason: string,
): Promise<SendResult> {
  return sendEmail(
    email,
    `Solicitud de registro rechazada — ${SITE_NAME}`,
    emailCuentaRechazada(fullName, reason),
  );
}

// ---------- 4. Cuenta suspendida ----------
export async function sendAccountSuspended(
  email: string,
  fullName: string,
  reason: string,
): Promise<SendResult> {
  return sendEmail(
    email,
    `Tu cuenta ha sido suspendida — ${SITE_NAME}`,
    emailCuentaSuspendida(fullName, reason),
  );
}

// ---------- 5. Solicitud de arriendo → dueño ----------
export async function sendRentRequest(
  ownerEmail: string,
  data: RentRequestEmailData,
): Promise<SendResult> {
  return sendEmail(
    ownerEmail,
    `Nueva solicitud de arriendo: ${data.costumeSummary}`,
    emailSolicitudArriendo(data),
  );
}

// ---------- 6. Arriendo confirmado → arrendatario ----------
export async function sendRentConfirmed(
  renterEmail: string,
  data: RentConfirmedEmailData,
): Promise<SendResult> {
  return sendEmail(
    renterEmail,
    `Arriendo confirmado: ${data.costumeSummary}`,
    emailArriendoConfirmado(data),
  );
}

// ---------- 7. Solicitud de compra → dueño ----------
export async function sendSaleRequest(
  ownerEmail: string,
  data: SaleRequestEmailData,
): Promise<SendResult> {
  return sendEmail(
    ownerEmail,
    `Nueva solicitud de compra: ${data.costumeSummary}`,
    emailSolicitudCompra(data),
  );
}

// ---------- 8. Venta confirmada → comprador ----------
export async function sendSaleConfirmed(
  buyerEmail: string,
  data: SaleConfirmedEmailData,
): Promise<SendResult> {
  return sendEmail(
    buyerEmail,
    `Compra confirmada: ${data.costumeSummary}`,
    emailVentaConfirmada(data),
  );
}