import { describe, expect, it } from 'vitest';
import { calcularDv, formatearRut, limpiarRut, normalizarRut, validarRut } from './rut';

describe('utilidades de RUT', () => {
  it('limpia puntos, guiones y espacios', () => {
    expect(limpiarRut('12.345.678-k')).toBe('12345678K');
  });

  it('calcula el digito verificador con modulo 11', () => {
    expect(calcularDv('12345678')).toBe('5');
    expect(calcularDv('11111111')).toBe('1');
    expect(calcularDv('22222222')).toBe('2');
  });

  it('valida RUT correctos e invalidos', () => {
    expect(validarRut('12.345.678-5')).toBe(true);
    expect(validarRut('12.345.678-9')).toBe(false);
    expect(validarRut('')).toBe(false);
  });

  it('normaliza y formatea', () => {
    expect(normalizarRut('123456785')).toBe('12345678-5');
    expect(formatearRut('123456785')).toBe('12.345.678-5');
  });
});
