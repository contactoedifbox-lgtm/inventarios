import { z } from 'zod';
import { validarRut } from './rut';

export const rolUsuarioSchema = z.enum(['maestro', 'vendedor']);
export const medioPagoSchema = z.enum(['efectivo', 'debito', 'credito', 'transferencia']);
export const areaAgendaSchema = z.enum(['veterinaria', 'peluqueria']);
export const especieSchema = z.enum(['perro', 'gato', 'otro']);

export const loginSchema = z.object({
  email: z.string().email('Correo invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
});

export const registroClienteSchema = z.object({
  nombres: z.string().trim().min(1, 'Los nombres son obligatorios').max(120),
  apellidos: z.string().trim().min(1, 'Los apellidos son obligatorios').max(120),
  rut: z
    .string()
    .trim()
    .refine((valor) => validarRut(valor), 'RUT invalido (digito verificador)'),
  telefono: z.string().trim().min(8, 'Telefono invalido').max(20),
  email: z.string().trim().email('Correo invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  consentimiento: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar el tratamiento de datos' }),
  }),
});

export const productoSchema = z.object({
  codigo_barras: z.string().trim().max(64).optional().or(z.literal('')),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(200),
  descripcion: z.string().trim().max(500).optional().or(z.literal('')),
  stock_minimo: z.coerce.number().int().min(0).default(0),
  precio_venta_total: z.coerce.number().int().min(0, 'El precio no puede ser negativo'),
  stock_inicial: z.coerce.number().int().min(0).default(0),
});

export const ventaItemSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a cero'),
});

export const ventaSchema = z.object({
  medio_pago: medioPagoSchema,
  items: z.array(ventaItemSchema).min(1, 'Agrega al menos un producto'),
});

export const clienteSchema = z.object({
  nombres: z.string().trim().min(1, 'Los nombres son obligatorios').max(120),
  apellidos: z.string().trim().min(1, 'Los apellidos son obligatorios').max(120),
  rut: z
    .string()
    .trim()
    .refine((valor) => validarRut(valor), 'RUT invalido (digito verificador)'),
  telefono: z.string().trim().min(8, 'Telefono invalido').max(20),
  email: z.string().trim().email('Correo invalido').optional().or(z.literal('')),
});

export const mascotaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  especie: especieSchema,
  raza: z.string().trim().max(120).optional().or(z.literal('')),
  peso_kg: z.coerce.number().positive('El peso debe ser mayor a cero').optional(),
});

export const reservaPublicaSchema = z.object({
  profesional_id: z.string().uuid('Selecciona un profesional'),
  inicio: z.string().min(1, 'Selecciona un horario'),
  motivo: z.string().trim().min(3, 'Describe el motivo').max(500),
  consentimiento: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar el tratamiento de datos' }),
  }),
  cliente: clienteSchema,
  mascota: mascotaSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegistroClienteInput = z.infer<typeof registroClienteSchema>;
export type ProductoInput = z.infer<typeof productoSchema>;
export type VentaInput = z.infer<typeof ventaSchema>;
export type ClienteInput = z.infer<typeof clienteSchema>;
export type MascotaInput = z.infer<typeof mascotaSchema>;
export type ReservaPublicaInput = z.infer<typeof reservaPublicaSchema>;
