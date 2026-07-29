/**
 * Formateo de moneda chilena (CLP — pesos sin decimales).
 */

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

/** Formatea un monto en CLP: 150000 → "$150.000" */
export function formatCLP(amount: number): string {
  return clpFormatter.format(amount);
}

/** Parsea un string de monto CLP (con o sin formato) a número entero. */
export function parseCLP(value: string): number {
  const digits = value.replace(/[^\d]/g, '');
  return digits === '' ? 0 : parseInt(digits, 10);
}