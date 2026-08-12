'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/utils/image';
import { formatRut, isValidRut } from '@/lib/utils/rut';
import { ROUTES, STORAGE_BUCKETS } from '@/config/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, Check, AlertCircle } from 'lucide-react';
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

// Esquema de registro extendido (sin usar .extend() en un ZodEffects)
const registerSchema = z.object({
  full_name: z
    .string({ required_error: 'El nombre completo es obligatorio' })
    .min(3, 'Ingresa tu nombre completo')
    .max(120)
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'.-]+$/, 'El nombre solo puede contener letras'),
  rut: z
    .string({ required_error: 'El RUT es obligatorio' })
    .refine(isValidRut, 'RUT inválido. Verifica el dígito verificador'),
  phone: z
    .string({ required_error: 'El teléfono es obligatorio' })
    .regex(/^(\+?56)?\s?9\d{8}$/, 'Ingresa un celular chileno válido (ej: +56912345678)'),
  address: z
    .string({ required_error: 'La dirección es obligatoria' })
    .min(5, 'Ingresa una dirección válida')
    .max(200),
  city: z
    .string({ required_error: 'La ciudad es obligatoria' })
    .min(2, 'Ingresa una ciudad válida')
    .max(100),
  email: z
    .string({ required_error: 'El correo es obligatorio' })
    .email('Ingresa un correo válido')
    .max(255),
  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(8, 'Mínimo 8 caracteres')
    .max(72)
    .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
  confirmPassword: z.string({ required_error: 'Confirma tu contraseña' }),
  role: z.enum(['propietario', 'arrendatario']),
  agrupacion: z.string().optional(),
  bankNombre: z.string().min(1, 'El nombre del titular es obligatorio'),
  bankBanco: z.string().min(1, 'El banco es obligatorio'),
  bankTipoCuenta: z.string().min(1, 'El tipo de cuenta es obligatorio'),
  bankNumeroCuenta: z.string().min(1, 'El número de cuenta es obligatorio'),
  bankRut: z.string().min(1, 'El RUT del titular es obligatorio'),
  bankCorreo: z.string().email('Ingresa un correo válido'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
}).superRefine((data, ctx) => {
  if (data.role === 'propietario' && !data.agrupacion) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debes ingresar la agrupación a la que perteneces',
      path: ['agrupacion'],
    });
  }
});

type RegisterFormData = z.infer<typeof registerSchema>;

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
  const [carnetFrontal, setCarnetFrontal] = useState<string | null>(null);
  const [carnetTrasera, setCarnetTrasera] = useState<string | null>(null);
  const [compressingFront, setCompressingFront] = useState(false);
  const [compressingBack, setCompressingBack] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<RegisterFormData>({
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
      role: 'propietario',
      agrupacion: '',
      bankNombre: '',
      bankBanco: 'BancoEstado',
      bankTipoCuenta: 'Cuenta Vista / RUT',
      bankNumeroCuenta: '',
      bankRut: '',
      bankCorreo: '',
    },
  });

  const watchRole = form.watch('role');

  const handleCarnetUpload = async (file: File, side: 'front' | 'back') => {
    if (!file) return;

    if (side === 'front') {
      setCompressingFront(true);
    } else {
      setCompressingBack(true);
    }

    try {
      const compressed = await compressImage(file);
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(compressed.blob);
      });

      if (side === 'front') {
        setCarnetFrontal(dataUrl);
      } else {
        setCarnetTrasera(dataUrl);
      }
      setFileError(null);
    } catch (error) {
      toast.error('Error al procesar el carnet: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      if (side === 'front') {
        setCompressingFront(false);
      } else {
        setCompressingBack(false);
      }
    }
  };

  const onSubmit = async (values: RegisterFormData) => {
    if (!carnetFrontal || !carnetTrasera) {
      setFileError('Debes subir ambas fotos del carnet de identidad (frontal y trasera)');
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

      // 2. Insertar perfil con rol 'pending' y todos los campos de App A
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        full_name: values.full_name,
        nombres: values.full_name.split(' ')[0] || values.full_name,
        apellidos: values.full_name.split(' ').slice(1).join(' ') || '',
        email: values.email,
        rut: formatRut(values.rut),
        phone: values.phone,
        address: values.address,
        city: values.city,
        role: 'pending',
        agrupacion: values.role === 'propietario' ? values.agrupacion : null,
        bank_details: {
          nombre: values.bankNombre,
          banco: values.bankBanco,
          tipoCuenta: values.bankTipoCuenta,
          numeroCuenta: values.bankNumeroCuenta,
          rut: values.bankRut,
          correo: values.bankCorreo,
        },
        carnet_frontal_url: carnetFrontal,
        carnet_trasera_url: carnetTrasera,
      });

      if (profileError) {
        if (profileError.code === '23505') {
          throw new Error('Este RUT ya está registrado en la plataforma.');
        }
        throw new Error(profileError.message);
      }

      // 3. Notificar al super admin
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

      let notified = await notifyAdmin();
      if (!notified) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        notified = await notifyAdmin();
      }

      if (!notified) {
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
        {/* DATOS PERSONALES */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-red">1. Datos Personales</h3>

          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo *</FormLabel>
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
                  <FormLabel>RUT *</FormLabel>
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
                  <FormLabel>Teléfono *</FormLabel>
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
                  <FormLabel>Dirección *</FormLabel>
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
                  <FormLabel>Ciudad *</FormLabel>
                  <FormControl>
                    <Input placeholder="Santiago" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Usuario *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tu rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="propietario">Propietario de Traje</SelectItem>
                      <SelectItem value="arrendatario">Arrendatario / Comprador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchRole === 'propietario' && (
              <FormField
                control={form.control}
                name="agrupacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agrupación a la que perteneces *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Caporales San Simón" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* DATOS BANCARIOS */}
        <div className="space-y-4 pt-4 border-t border-muted">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-red">2. Datos para Transferencia Bancaria (Obligatorios)</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="bankNombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Titular Cuenta *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre completo del titular" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankBanco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tu banco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BancoEstado">BancoEstado</SelectItem>
                      <SelectItem value="Banco Santander">Banco Santander</SelectItem>
                      <SelectItem value="Banco de Chile">Banco de Chile / Edwards</SelectItem>
                      <SelectItem value="BCI">BCI / Mach</SelectItem>
                      <SelectItem value="Banco Falabella">Banco Falabella</SelectItem>
                      <SelectItem value="Scotiabank">Scotiabank</SelectItem>
                      <SelectItem value="Banco Itaú">Banco Itaú</SelectItem>
                      <SelectItem value="Tenpo / Mercado Pago">Tenpo / Mercado Pago</SelectItem>
                      <SelectItem value="Otro Banco">Otro Banco</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="bankTipoCuenta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Cuenta *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cuenta Vista / RUT">Cuenta Vista / RUT</SelectItem>
                      <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                      <SelectItem value="Cuenta de Ahorro">Cuenta de Ahorro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankNumeroCuenta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Cuenta *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 12345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="bankRut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RUT Titular Cuenta *</FormLabel>
                  <FormControl>
                    <Input placeholder="12.345.678-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankCorreo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo para Comprobante *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* FOTOS DEL CARNET */}
        <div className="space-y-3 pt-4 border-t border-muted">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-red">3. Fotos de Carnet de Identidad (Obligatorias)</h3>
          <p className="text-xs text-muted-foreground">
            Sube ambas caras del carnet. Se comprimirán automáticamente.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Carnet Frontal */}
            <div>
              <Label>Carnet Frontal *</Label>
              <div className="mt-1">
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCarnetUpload(file, 'front');
                  }}
                />
                <button
                  type="button"
                  onClick={() => frontInputRef.current?.click()}
                  disabled={compressingFront}
                  className="w-full h-24 border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center hover:border-brand-red transition-colors disabled:opacity-50"
                >
                  {compressingFront ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-brand-red mb-1" />
                      <span className="text-xs text-muted-foreground">Comprimiendo...</span>
                    </>
                  ) : carnetFrontal ? (
                    <>
                      <Check className="w-6 h-6 text-green-500 mb-1" />
                      <span className="text-xs text-green-600">Foto frontal cargada</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Subir frente</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Carnet Trasero */}
            <div>
              <Label>Carnet Trasero *</Label>
              <div className="mt-1">
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCarnetUpload(file, 'back');
                  }}
                />
                <button
                  type="button"
                  onClick={() => backInputRef.current?.click()}
                  disabled={compressingBack}
                  className="w-full h-24 border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center hover:border-brand-red transition-colors disabled:opacity-50"
                >
                  {compressingBack ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-brand-red mb-1" />
                      <span className="text-xs text-muted-foreground">Comprimiendo...</span>
                    </>
                  ) : carnetTrasera ? (
                    <>
                      <Check className="w-6 h-6 text-green-500 mb-1" />
                      <span className="text-xs text-green-600">Foto trasera cargada</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Subir trasera</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {fileError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              <AlertCircle className="w-4 h-4" />
              <span>{fileError}</span>
            </div>
          )}
        </div>

        {/* CREDENCIALES */}
        <div className="space-y-4 pt-4 border-t border-muted">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-red">4. Credenciales de Acceso</h3>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico *</FormLabel>
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
                  <FormLabel>Contraseña *</FormLabel>
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
                  <FormLabel>Confirmar contraseña *</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" variant="brand" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <LoadingSpinner size={18} className="text-white" /> : 'Crear cuenta'}
        </Button>
      </form>
    </Form>
  );
}
