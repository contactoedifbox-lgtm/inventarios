import { z } from 'zod';
import { isValid, parseISO, startOfToday } from 'date-fns';
import { UserRole } from '@/types/enums';
import { isValidRut } from '@/lib/utils/rut';

/** Schema para actualización de perfil por el propio usuario */
export const profileUpdateSchema = z.object({
  full_name: z
    .string({ required_error: 'El nombre completo es obligatorio' })
    .min(3, 'Ingresa tu nombre completo')
    .max(120)
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'.-]+$/, 'El nombre solo puede contener letras'),
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
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** Schema para acciones del administrador sobre usuarios */
export const adminUserActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
  }),
  z.object({
    action: z.literal('reject'),
    reason: z
      .string()
      .min(5, 'El motivo debe tener al menos 5 caracteres')
      .max(500)
      .optional(),
  }),
  z.object({
    action: z.literal('suspend'),
    reason: z
      .string()
      .min(5, 'El motivo debe tener al menos 5 caracteres')
      .max(500)
      .optional(),
  }),
  z.object({
    action: z.literal('reactivate'),
  }),
  z.object({
    action: z.literal('delete'),
    confirm: z.literal(true, {
      errorMap: () => ({ message: 'Debes confirmar la eliminación' }),
    }),
  }),
]);

export type AdminUserActionInput = z.infer<typeof adminUserActionSchema>;

/** Schema para crear/editar eventos (admin) */
export const eventSchema = z.object({
  name: z
    .string({ required_error: 'El nombre del evento es obligatorio' })
    .min(3, 'Ingresa un nombre válido')
    .max(120),
  event_date: z
    .string({ required_error: 'La fecha del evento es obligatoria' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (AAAA-MM-DD)')
    .refine((value) => isValid(parseISO(value)), 'La fecha no existe en el calendario')
    .refine(
      (value) => parseISO(value) >= startOfToday(),
      'La fecha del evento no puede estar en el pasado',
    ),
  max_global_rentals: z.coerce
    .number({ invalid_type_error: 'Ingresa un número' })
    .int('Debe ser un número entero')
    .positive('Debe ser mayor a 0')
    .max(10000),
  max_user_rentals: z.coerce
    .number({ invalid_type_error: 'Ingresa un número' })
    .int('Debe ser un número entero')
    .positive('Debe ser mayor a 0')
    .max(100),
  is_archived: z.boolean().optional().default(false),
});

export type EventInput = z.infer<typeof eventSchema>;

/** Re-export del enum para uso en validaciones */
export { UserRole };

/** Validador standalone de RUT para uso directo */
export const rutSchema = z
  .string({ required_error: 'El RUT es obligatorio' })
  .refine(isValidRut, 'RUT inválido. Verifica el dígito verificador');