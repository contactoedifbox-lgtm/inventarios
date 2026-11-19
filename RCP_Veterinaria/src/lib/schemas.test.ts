import { describe, expect, it } from 'vitest';
import { clienteSchema, productoSchema, reservaPublicaSchema } from './schemas';

describe('esquemas de validacion', () => {
  it('rechaza un RUT con digito verificador invalido', () => {
    const resultado = clienteSchema.safeParse({
      nombres: 'Ana',
      apellidos: 'Perez',
      rut: '12.345.678-9',
      telefono: '912345678',
    });
    expect(resultado.success).toBe(false);
  });

  it('acepta un RUT valido', () => {
    const resultado = clienteSchema.safeParse({
      nombres: 'Ana',
      apellidos: 'Perez',
      rut: '12.345.678-5',
      telefono: '912345678',
    });
    expect(resultado.success).toBe(true);
  });

  it('exige el consentimiento de datos en la reserva publica', () => {
    const resultado = reservaPublicaSchema.safeParse({
      profesional_id: '00000000-0000-0000-0000-000000000000',
      inicio: '2026-12-01T10:00:00.000Z',
      motivo: 'Control general',
      consentimiento: false,
      cliente: {
        nombres: 'Ana',
        apellidos: 'Perez',
        rut: '12.345.678-5',
        telefono: '912345678',
      },
      mascota: { nombre: 'Firulais', especie: 'perro' },
    });
    expect(resultado.success).toBe(false);
  });

  it('rechaza un producto sin nombre', () => {
    const resultado = productoSchema.safeParse({ nombre: '', precio_venta_neto: 100 });
    expect(resultado.success).toBe(false);
  });
});
