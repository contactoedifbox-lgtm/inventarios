'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { eventSchema, type EventInput } from '@/lib/validations/user.schema';
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvents';
import type { Event } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface EventFormProps {
  event?: Event;
  triggerLabel: string;
}

/** Formulario de creación/edición de eventos (solo super admin) */
export function EventForm({ event, triggerLabel }: EventFormProps) {
  const [open, setOpen] = useState(false);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const isEditing = Boolean(event);

  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: event?.name ?? '',
      event_date: event?.event_date ?? '',
      max_global_rentals: event?.max_global_rentals ?? 50,
      max_user_rentals: event?.max_user_rentals ?? 1,
      is_archived: event?.is_archived ?? false,
    },
  });

  useEffect(() => {
    if (open && event) {
      form.reset({
        name: event.name,
        event_date: event.event_date,
        max_global_rentals: event.max_global_rentals,
        max_user_rentals: event.max_user_rentals,
        is_archived: event.is_archived,
      });
    }
  }, [open, event, form]);

  const isPending = createEvent.isPending || updateEvent.isPending;

  const onSubmit = async (values: EventInput) => {
    try {
      if (event) {
        await updateEvent.mutateAsync({ eventId: event.id, input: values });
      } else {
        await createEvent.mutateAsync(values);
      }
      form.reset();
      setOpen(false);
    } catch {
      // Los hooks ya muestran el toast de error
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isEditing ? 'outline' : 'brand'} size={isEditing ? 'sm' : 'default'}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar evento' : 'Crear evento'}</DialogTitle>
          <DialogDescription>
            Define los límites de arriendos globales y por usuario para este evento.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del evento</FormLabel>
                  <FormControl>
                    <Input placeholder="Festival Caporales 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="event_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha del evento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="max_global_rentals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máx. arriendos globales</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="max_user_rentals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máx. arriendos por usuario</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_archived"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Evento archivado</FormLabel>
                </FormItem>
              )}
            />

            <Button type="submit" variant="brand" className="w-full" disabled={isPending}>
              {isPending ? (
                <LoadingSpinner size={18} className="text-white" />
              ) : isEditing ? (
                'Guardar cambios'
              ) : (
                'Crear evento'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
