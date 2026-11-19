import { describe, expect, it } from 'vitest';
import { chileAUtc, diaSemanaISO, rangoDiaLocal } from './dateRanges';

describe('fechas en zona America/Santiago', () => {
  it('convierte 09:00 de Chile a UTC (UTC-3 en noviembre)', () => {
    expect(chileAUtc('2026-11-19', '09:00').toISOString()).toBe('2026-11-19T12:00:00.000Z');
  });

  it('convierte 00:00 de Chile a UTC', () => {
    expect(chileAUtc('2026-11-19', '00:00').toISOString()).toBe('2026-11-19T03:00:00.000Z');
  });

  it('calcula el dia ISO de la semana', () => {
    expect(diaSemanaISO('2026-11-16')).toBe(1); // lunes
    expect(diaSemanaISO('2026-11-19')).toBe(4); // jueves
    expect(diaSemanaISO('2026-11-22')).toBe(7); // domingo
  });

  it('calcula el rango del dia en Chile', () => {
    const rango = rangoDiaLocal('2026-11-19');
    expect(rango.desde).toBe('2026-11-19T03:00:00.000Z');
    expect(rango.hasta).toBe('2026-11-20T03:00:00.000Z');
  });
});