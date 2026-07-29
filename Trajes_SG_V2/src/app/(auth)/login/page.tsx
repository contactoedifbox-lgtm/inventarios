import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { ROUTES } from '@/config/constants';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">Ingresa con tu correo y contraseña</p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <Link href={ROUTES.register} className="font-medium text-brand-red hover:underline">
          Regístrate aquí
        </Link>
      </p>
    </div>
  );
}
