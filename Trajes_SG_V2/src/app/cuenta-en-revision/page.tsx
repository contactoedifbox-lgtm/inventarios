import type { Metadata } from 'next';
import { Clock } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PendingStatusWatcher } from '@/components/auth/PendingStatusWatcher';

export const metadata: Metadata = { title: 'Cuenta en revisión' };

export default function CuentaEnRevisionPage() {
  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Alert variant="warning" className="bg-card">
            <Clock className="h-5 w-5" />
            <AlertTitle className="text-lg">Tu cuenta está en revisión</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p>
                Gracias por registrarte. Un administrador revisará tus datos y tu carnet de
                identidad antes de activar tu cuenta.
              </p>
              <p>
                Recibirás un <strong>correo electrónico</strong> cuando tu cuenta sea aprobada.
                Este proceso suele tardar menos de 24 horas.
              </p>
              <p className="text-sm text-muted-foreground">
                Si tu cuenta fue rechazada o suspendida, el correo incluirá el motivo. Ante dudas,
                contacta a la directiva de la agrupación.
              </p>
            </AlertDescription>
          </Alert>
          <div className="mt-6">
            <PendingStatusWatcher />
          </div>
        </div>
      </main>
    </div>
  );
}
