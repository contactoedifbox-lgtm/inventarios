'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactInfoSchema, type ContactInfoInput } from '@/lib/validations/auth.schema';
import { useCreateSale } from '@/hooks/useSales';
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
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface SaleRequestModalProps {
  costume: CostumeWithOwner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Modal para solicitar la compra de un traje */
export function SaleRequestModal({ costume, open, onOpenChange }: SaleRequestModalProps) {
  const createSale = useCreateSale();

  const form = useForm<ContactInfoInput>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: { first_name: '', last_name: '', rut: '', phone: '', email: '' },
  });

  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  if (!costume) return null;

  const onSubmit = async (values: ContactInfoInput) => {
    try {
      await createSale.mutateAsync({ ...values, costume_id: costume.id });
      onOpenChange(false);
    } catch {
      // El hook ya muestra el toast de error
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar compra</DialogTitle>
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

            <Button type="submit" variant="brand" className="w-full" disabled={createSale.isPending}>
              {createSale.isPending ? (
                <LoadingSpinner size={18} className="text-white" />
              ) : (
                'Confirmar solicitud de compra'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
