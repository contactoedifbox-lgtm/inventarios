import { z } from 'zod';
import { CostumeType } from '@/types/enums';

/** Schema para crear/editar un traje */
export const costumeSchema = z
  .object({
    type: z.nativeEnum(CostumeType, {
      errorMap: () => ({ message: 'Selecciona el tipo de publicación' }),
    }),
    year: z
      .string({ required_error: 'El año del traje es obligatorio' })
      .min(4, 'Ingresa un año válido (ej: 2024)')
      .max(4)
      .regex(/^(19|20)\d{2}$/, 'Ingresa un año válido (ej: 2024)'),
    size: z
      .string({ required_error: 'La talla es obligatoria' })
      .min(1, 'Ingresa la talla')
      .max(10, 'Talla inválida'),
    boot_size: z
      .string({ required_error: 'La talla de botas es obligatoria' })
      .min(1, 'Ingresa la talla de botas')
      .max(10, 'Talla inválida'),
    price: z
      .number({ required_error: 'El precio es obligatorio', invalid_type_error: 'Ingresa un número' })
      .int('El precio debe ser un número entero')
      .positive('El precio debe ser mayor a 0')
      .max(100_000_000, 'El precio es demasiado alto'),
    bank_info: z
      .string({ required_error: 'Los datos bancarios son obligatorios' })
      .min(10, 'Ingresa los datos bancarios completos (banco, tipo de cuenta, número, titular)')
      .max(500),
    event_ids: z.array(z.string().uuid()).optional().default([]),
  })
  .superRefine((data, ctx) => {
    // Solo los trajes de arriendo pueden (y deben) tener eventos asociados
    if (data.type === CostumeType.Sale && data.event_ids.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Los trajes de venta no pueden asociarse a eventos',
        path: ['event_ids'],
      });
    }
    if (data.type === CostumeType.Rent && data.event_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecciona al menos un evento para el arriendo',
        path: ['event_ids'],
      });
    }
  });

export type CostumeInput = z.infer<typeof costumeSchema>;

/** Schema para filtros del catálogo (query params) */
export const costumeFiltersSchema = z.object({
  type: z.nativeEnum(CostumeType).optional(),
  eventId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export type CostumeFiltersInput = z.infer<typeof costumeFiltersSchema>;