/**
 * Utilidades para el RUT chileno (Rol Único Tributario).
 * Algoritmo de verificación: Módulo 11.
 */

/** Limpia el RUT: quita puntos, guion y deja solo dígitos + K mayúscula. */
export function cleanRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

/** Calcula el dígito verificador (DV) para un cuerpo de RUT numérico. */
export function calculateDv(body: string): string {
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

/** Valida un RUT chileno completo (con o sin formato). */
export function isValidRut(rut: string): boolean {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 2) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  // El cuerpo debe ser numérico y dentro de un rango razonable
  if (!/^\d+$/.test(body)) return false;
  const bodyNumber = Number(body);
  if (bodyNumber < 1_000_000 || bodyNumber > 99_999_999) return false;

  return calculateDv(body) === dv;
}

/**
 * Formatea un RUT a su representación canónica: 12.345.678-9.
 * Devuelve el string original limpio si no es válido.
 */
export function formatRut(rut: string): string {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 2) return cleaned;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
}

/** Valida y formatea: devuelve null si el RUT es inválido. */
export function validateAndFormatRut(rut: string): string | null {
  if (!isValidRut(rut)) return null;
  return formatRut(rut);
}