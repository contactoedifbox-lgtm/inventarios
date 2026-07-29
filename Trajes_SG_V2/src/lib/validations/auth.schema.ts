import { z } from 'zod';
import { isValidRut } from '@/lib/utils/rut';

/** Schema de inicio de sesión */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'El correo es obligatorio' })
    .email('Ingresa un correo válido')
    .max(255),
  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede superar 72 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Schema de registro de usuario */
export const registerSchema = z
  .object({
    full_name: z
      .string({ required_error: 'El nombre completo es obligatorio' })
      .min(3, 'Ingresa tu nombre completo')
      .max(120)
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'.-]+$/, 'El nombre solo puede contener letras'),
    rut: z
      .string({ required_error: 'El RUT es obligatorio' })
      .refine(isValidRut, 'RUT inválido. Verifica el dígito verificador'),
    phone: z
      .string({ required_error: 'El teléfono es obligatorio' })
      .regex(/^(\+?56)?\s?9\d{8}$/, 'Ingresa un celular chileno válido (ej: +56912345678)'),
    address: z
      .string({ required_error: 'La dirección es obligatoria' })
      .min(5, 'Ingresa una dirección válida')
      .max(200),
    city: z
      .string({ required_error: 'La ciudad es obligatoria' })
      .min(2, 'Ingresa una ciudad válida')
      .max(100),
    email: z
      .string({ required_error: 'El correo es obligatorio' })
      .email('Ingresa un correo válido')
      .max(255),
    password: z
      .string({ required_error: 'La contraseña es obligatoria' })
      .min(8, 'Mínimo 8 caracteres')
      .max(72)
      .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
      .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
      .regex(/[0-9]/, 'Debe incluir al menos un número'),
    confirmPassword: z.string({ required_error: 'Confirma tu contraseña' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/** Datos de contacto para solicitudes de arriendo/compra */
export const contactInfoSchema = z.object({
  first_name: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(2, 'Ingresa tu nombre')
    .max(60),
  last_name: z
    .string({ required_error: 'El apellido es obligatorio' })
    .min(2, 'Ingresa tu apellido')
    .max(60),
  rut: z
    .string({ required_error: 'El RUT es obligatorio' })
    .refine(isValidRut, 'RUT inválido. Verifica el dígito verificador'),
  phone: z
    .string({ required_error: 'El teléfono es obligatorio' })
    .regex(/^(\+?56)?\s?9\d{8}$/, 'Ingresa un celular chileno válido'),
  email: z
    .string({ required_error: 'El correo es obligatorio' })
    .email('Ingresa un correo válido')
    .max(255),
});

export type ContactInfoInput = z.infer<typeof contactInfoSchema>;