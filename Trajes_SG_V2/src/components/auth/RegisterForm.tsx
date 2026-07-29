'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth.schema';
import { compressImage } from '@/lib/utils/image';
import { formatRut } from '@/lib/utils/rut';
import { ROUTES, STORAGE_BUCKETS } from '@/config/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

/**
 * Formulario de registro con verificación de identidad:
 * 1. Crea el usuario en auth.users
 * 2. Inserta el perfil (role='pending')
 * 3. Sube el carnet comprimido al bucket privado 'id-cards'
 * 4. Notifica al super admin (API route: tokens + email con links)
 */
export function RegisterForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      rut: '',
      phone: '',
      address: '',
      city: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: RegisterInput) => {
    if (!idCardFile) {
      setFileError('Debes adjuntar una foto de tu carnet de identidad.');
      return;
    }
    setFileError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 1. Crear usuario en Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already')) {
          throw new Error('Ya existe una cuenta con este correo.');
        }
        throw new Error(signUpError.message);
      }

      const user = signUpData.user;
      if (!user) throw new Error('No se pudo crear la cuenta.');

      if (!signUpData.session) {
        throw new Error(
          'La confirmación por correo está activada. Contacta al administrador para habilitar el registro directo.',
        );
      }

      // 2. Insertar perfil con rol 'pending'
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        full_name: values.full_name,
        rut: formatRut(values.rut),
        phone: values.phone,
        address: values.address,
        city: values.city,
      });

      if (profileError) {
        if (profileError.code === '23505') {
          throw new Error('Este RUT ya está registrado en la plataforma.');
        }
        throw new Error(profileError.message);
      }

      // 3. Comprimir y subir carnet (la política exige la ruta {uid}/id_card)
      const compressed = await compressImage(idCardFile);
      const idCardPath = `${user.id}/id_card`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.idCards)
        .upload(idCardPath, compressed.blob, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (uploadError) throw new Error(`Error al subir el carnet: ${uploadError.message}`);

      const { error: pathError } = await supabase
        .from('profiles')
        .update({ id_card_path: idCardPath })
        .eq('id', user.id);

      if (pathError) throw new Error(pathError.message);

      // 4. Notificar al super admin (crea tokens y envía el email)
      const notifyAdmin = async (): Promise<boolean> => {
        try {
          const response = await fetch('/api/email/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, type: 'new_registration' }),
          });
          return response.ok;
        } catch {
          return false;
        }
      };

      // Un reintento automático antes de informar al usuario
      let notified = await notifyAdmin();
      if (!notified) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        notified = await notifyAdmin();
      }

      if (!notified) {
        // El registro NO se pierde: el admin puede aprobarlo desde su panel.
        toast.warning(
          'Tu cuenta se creó correctamente, pero no pudimos enviar el correo de aviso al administrador. No te preocupes: tu solicitud también aparece en su panel de revisión.',
          { duration: 8000 },
        );
      }

      toast.success('Registro exitoso. Tu cuenta está en revisión.');
      router.push(ROUTES.pendingReview);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error inesperado al registrarte.');
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input placeholder="Ej: María Fernanda Pérez Soto" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input placeholder="Calle, número, depto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciudad</FormLabel>
                <FormControl>
                  <Input placeholder="Santiago" {...field} />
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
                <Input type="email" placeholder="tu@correo.cl" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar contraseña</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="id_card">Foto del carnet de identidad</Label>
          <Input
            id="id_card"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setIdCardFile(file);
              if (file) setFileError(null);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Se comprime automáticamente (máx. 1 MB, formato WebP). Solo visible para el administrador.
          </p>
          {fileError && <p className="text-[0.8rem] font-medium text-destructive">{fileError}</p>}
        </div>

        <Button type="submit" variant="brand" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <LoadingSpinner size={18} className="text-white" /> : 'Crear cuenta'}
        </Button>
      </form>
    </Form>
  );
}
