'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { profileUpdateSchema, type ProfileUpdateInput } from '@/lib/validations/user.schema';
import { formatDateTime } from '@/lib/utils/dates';
import { UserRole } from '@/types/enums';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const roleLabels: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'Administrador',
  [UserRole.Pending]: 'Pendiente de aprobación',
  [UserRole.Approved]: 'Aprobado',
  [UserRole.Rejected]: 'Rechazado',
  [UserRole.Suspended]: 'Suspendido',
};

export default function PerfilPage() {
  const { profile, isLoading, user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { full_name: '', phone: '', address: '', city: '' },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
      });
    }
  }, [profile, form]);

  if (isLoading || !profile) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  const onSubmit = async (values: ProfileUpdateInput) => {
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update(values)
      .eq('id', profile.id);

    setIsSaving(false);

    if (error) {
      toast.error(`Error al actualizar: ${error.message}`);
      return;
    }

    toast.success('Perfil actualizado correctamente');
    await queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Revisa y actualiza tus datos de contacto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {profile.full_name}
            <Badge variant="secondary">{roleLabels[profile.role] ?? profile.role}</Badge>
          </CardTitle>
          <CardDescription>
            {user?.email} · Miembro desde {formatDateTime(profile.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium text-muted-foreground">RUT</p>
            <p>{profile.rut}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Ciudad</p>
            <p>{profile.city}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Editar datos de contacto</CardTitle>
          <CardDescription>El RUT y el correo no se pueden modificar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" variant="brand" disabled={isSaving}>
                {isSaving ? <LoadingSpinner size={18} className="text-white" /> : 'Guardar cambios'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
