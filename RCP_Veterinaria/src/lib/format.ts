const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

/** Formatea un entero en pesos chilenos: $12.345. */
export function formatCLP(valor: number): string {
  return clpFormatter.format(Math.round(valor));
}

/** Formatea solo la hora (HH:MM) en zona America/Santiago. */
export function formatHora(iso: string | Date): string {
  const fecha = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
}

/** Formatea una fecha ISO en zona America/Santiago. */
export function formatFecha(iso: string | Date): string {
  const fecha = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(fecha);
}

/** Formatea una fecha ISO con hora en zona America/Santiago. */
export function formatFechaHora(iso: string | Date): string {
  const fecha = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
}

/**
 * Normaliza un telefono chileno a +569XXXXXXXX.
 * Acepta +569XXXXXXXX, 569XXXXXXXX, 9XXXXXXXX, XXXXXXXX (8 digitos) y variantes
 * con espacios, puntos o guiones.
 */
export function normalizarTelefono(telefono: string): string {
  let digitos = telefono.replace(/\D/g, '');
  if (digitos.startsWith('56')) digitos = digitos.slice(2);
  if (digitos.length === 8) digitos = `9${digitos}`;
  return `+56${digitos}`;
}

/** Calcula el IVA de un monto neto segun el porcentaje configurado. */
export function calcularIva(neto: number, ivaPorcentaje = 19): number {
  return Math.round((neto * ivaPorcentaje) / 100);
}
