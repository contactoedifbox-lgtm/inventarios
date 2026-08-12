'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { loginSchema, type LoginInput } from '@/lib/validations/auth.schema';
import { ROUTES } from '@/config/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginInput) => {
    setIsSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error || !data.user) {
      toast.error('Credenciales inválidas. Verifica tu correo y contraseña.');
      setIsSubmitting(false);
      return;
    }

    // Redirigir según rol del perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    toast.success('Sesión iniciada');

    // Roles de App A
    const role = profile?.role;

    if (role === 'pending' || role === 'rejected' || role === 'suspended') {
      router.push(ROUTES.pendingReview);
    } else if (role === 'super_admin' || role === 'maestro') {
      router.push(ROUTES.admin.home);
    } else if (role === 'approved' || role === 'propietario' || role === 'arrendatario') {
      router.push(ROUTES.dashboard.arriendo);
    } else {
      router.push(ROUTES.pendingReview);
    }
    router.refresh();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" variant="brand" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <LoadingSpinner size={18} className="text-white" /> : 'Ingresar'}
        </Button>
      </form>
    </Form>
  );
}
