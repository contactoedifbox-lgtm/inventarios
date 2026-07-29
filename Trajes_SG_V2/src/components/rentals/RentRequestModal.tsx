'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { contactInfoSchema, type ContactInfoInput } from '@/lib/validations/auth.schema';
import { useCreateRental } from '@/hooks/useRentals';
import { formatCLP } from '@/lib/utils/currency';
import type { CostumeWithOwner } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface RentRequestModalProps {
  costume: CostumeWithOwner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const rentalRequestSchema = contactInfoSchema.extend({
  event_id: z.string({ required_error: 'Selecciona un evento' }).uuid('Selecciona un evento'),
});

/** Modal para solicitar el arriendo de un traje, eligiendo el evento asociado */
export function RentRequestModal({ costume, open, onOpenChange }: RentRequestModalProps) {
  const createRental = useCreateRental();

  const form = useForm<ContactInfoInput & { event_id: string }>({
    resolver: zodResolver(rentalRequestSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      rut: '',
      phone: '',
      email: '',
      event_id: '',
    },
  });

  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  if (!costume) return null;

  const onSubmit = async (values: ContactInfoInput & { event_id: string }) => {
    try {
      await createRental.mutateAsync({ ...values, costume_id: costume.id });
      onOpenChange(false);
    } catch {
      // El toast de error ya lo maneja el hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar arriendo</DialogTitle>
          <DialogDescription>
            Traje talla {costume.size} · {formatCLP(costume.price)} · de {costume.owner.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">Datos bancarios del dueño para el pago:</p>
          <p className="whitespace-pre-line text-muted-foreground">{costume.bank_info}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="event_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Evento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el evento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {costume.events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="María" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input placeholder="Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="rut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RUT</FormLabel>
                    <FormControl>
                      <Input placeholder="12.345.678-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="+56912345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="tu@correo.cl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" variant="brand" className="w-full" disabled={createRental.isPending}>
              {createRental.isPending ? (
                <LoadingSpinner size={18} className="text-white" />
              ) : (
                'Confirmar solicitud de arriendo'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
