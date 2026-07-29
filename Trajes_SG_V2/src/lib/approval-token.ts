import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Firma HMAC-SHA256 para los enlaces de aprobación/rechazo enviados por email.
 * El enlace incluye `token` (UUID en BD) + `sig` (firma del token con
 * APPROVAL_SECRET). Esto evita que alguien con acceso de lectura a la BD
 * pueda usar tokens sin conocer el secreto del servidor.
 */

function getSecret(): string {
  const secret = process.env.APPROVAL_SECRET;
  if (!secret) {
    throw new Error('Falta APPROVAL_SECRET en las variables de entorno.');
  }
  return secret;
}

/** Genera la firma HMAC-SHA256 (hex) de un token UUID. */
export function signApprovalToken(token: string): string {
  return createHmac('sha256', getSecret()).update(token).digest('hex');
}

/** Verifica una firma contra el token usando comparación de tiempo constante. */
export function verifyApprovalSignature(token: string, signature: string): boolean {
  const expected = signApprovalToken(token);

  const expectedBuffer = Buffer.from(expected, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');

  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

/** Construye la URL completa firmada para aprobar o rechazar. */
export function buildApprovalUrl(
  action: 'approve' | 'reject',
  token: string,
  reason?: string,
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const sig = signApprovalToken(token);
  const params = new URLSearchParams({ token, sig });
  if (reason) params.set('reason', reason);
  return `${appUrl}/api/admin/${action}?${params.toString()}`;
}