import Link from 'next/link';
import { Shirt, ShieldCheck, CalendarDays, HandCoins } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { siteConfig } from '@/config/site';
import { ROUTES } from '@/config/constants';

const features = [
  {
    icon: Shirt,
    title: 'Trajes de arriendo',
    description:
      'Arrienda trajes de caporales por evento, con cupos controlados por la agrupación.',
  },
  {
    icon: HandCoins,
    title: 'Compra venta segura',
    description: 'Compra y vende trajes entre integrantes verificados de la comunidad.',
  },
  {
    icon: ShieldCheck,
    title: 'Identidad verificada',
    description:
      'Cada cuenta se aprueba manualmente con foto de carnet. Solo gente de confianza.',
  },
  {
    icon: CalendarDays,
    title: 'Gestión por eventos',
    description: 'Los trajes se liberan automáticamente después de cada evento.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1" aria-label="Contenido principal">
        {/* Hero */}
        <section
  aria-label="Presentación"
  className="bg-gradient-to-b from-brand-dark to-brand-dark/90 py-20 text-center text-brand-light sm:py-28"
>
          <div className="mx-auto max-w-3xl px-4">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-brand-gold">
              Agrupación folclórica
            </p>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
              {siteConfig.name}
            </h1>
            <p className="mb-8 text-lg text-brand-light/80">
              Plataforma oficial de arriendo y venta de trajes. Publica tu traje, reserva el de un
              compañero y coordina todo desde un solo lugar.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="brand" asChild>
                <Link href={ROUTES.register}>Crear cuenta</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-brand-light/30 bg-transparent text-brand-light hover:bg-brand-light/10 hover:text-brand-light"
                asChild
              >
                <Link href={ROUTES.login}>Ya tengo cuenta</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section aria-label="Características" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">
            Todo lo que necesitas para tus trajes
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="border-t-4 border-t-brand-red">
                <CardHeader>
                  <feature.icon className="mb-2 h-8 w-8 text-brand-orange" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Cómo funciona */}
        <section aria-label="Cómo funciona" className="bg-muted py-16">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="mb-8 text-2xl font-bold sm:text-3xl">¿Cómo funciona?</h2>
            <ol className="list-decimal space-y-4 pl-5 text-left">
              <li className="rounded-lg bg-background p-4 shadow-sm">
                <span className="font-bold text-brand-red">1.</span> Regístrate con tu RUT y una foto
                de tu carnet de identidad.
              </li>
              <li className="rounded-lg bg-background p-4 shadow-sm">
                <span className="font-bold text-brand-red">2.</span> El administrador revisa y
                aprueba tu cuenta (recibirás un correo).
              </li>
              <li className="rounded-lg bg-background p-4 shadow-sm">
                <span className="font-bold text-brand-red">3.</span> Publica tus trajes o solicita
                el de otro integrante, transfiere y sube tu comprobante.
              </li>
              <li className="rounded-lg bg-background p-4 shadow-sm">
                <span className="font-bold text-brand-red">4.</span> El dueño confirma el arriendo o
                la venta. ¡Listo para bailar!
              </li>
            </ol>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
