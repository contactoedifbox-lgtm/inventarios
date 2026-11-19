import { describe, expect, it } from 'vitest';
import { calcularIva, formatCLP, normalizarTelefono } from './format';

describe('formato y calculos', () => {
  it('formatea pesos chilenos sin decimales', () => {
    expect(formatCLP(12345)).toContain('12.345');
    expect(formatCLP(0)).toContain('0');
  });

  it('calcula el IVA al 19% redondeando por unidad', () => {
    expect(calcularIva(1000)).toBe(190);
    expect(calcularIva(999)).toBe(190);
    expect(calcularIva(100)).toBe(19);
  });

  it('normaliza telefonos chilenos a +569XXXXXXXX', () => {
    expect(normalizarTelefono('9 1234 5678')).toBe('+56912345678');
    expect(normalizarTelefono('+56 9 1234 5678')).toBe('+56912345678');
    expect(normalizarTelefono('56912345678')).toBe('+56912345678');
    expect(normalizarTelefono('+56912345678')).toBe('+56912345678');
    expect(normalizarTelefono('12345678')).toBe('+56912345678');
  });
});
