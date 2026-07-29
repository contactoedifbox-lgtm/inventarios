import { format, formatDistanceToNow, isBefore, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Helpers de fechas con date-fns v3 (locale español).
 */

/** "15 de octubre de 2026" */
export function formatDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** "15/10/2026" */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: es });
}

/** "15/10/2026 18:30" */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm', { locale: es });
}

/** "hace 3 días" / "en 5 días" */
export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

/** true si la fecha del evento ya pasó (respecto a hoy). */
export function isEventPast(eventDate: string): boolean {
  return isBefore(parseISO(eventDate), new Date());
}

/** Convierte un Date a string YYYY-MM-DD para inputs type="date". */
export function toDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}