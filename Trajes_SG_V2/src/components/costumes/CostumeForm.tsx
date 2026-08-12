'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCreateCostume } from '@/hooks/useCostumes';
import { useUpcomingEvents } from '@/hooks/useEvents';
import { compressImage } from '@/lib/utils/image';
import { CostumeType, ListingType } from '@/types/enums';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_COSTUME_IMAGES,
  STORAGE_BUCKETS,
} from '@/config/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

// Esquema completo del formulario (sin .extend())
const costumeFormSchema = z.object({
  type: z.nativeEnum(CostumeType),
  year: z.string().min(4, 'Ingresa un año válido').max(4).regex(/^(19|20)\d{2}$/),
  size: z.string().min(1, 'La talla es obligatoria'),
  boot_size: z.string().min(1, 'La talla de botas es obligatoria'),
  price: z.number().positive('El precio debe ser mayor a 0'),
  bank_info: z.string().min(10, 'Los datos bancarios son obligatorios'),
  event_ids: z.array(z.string().uuid()).default([]),
  agrupacion: z.string().min(1, 'La agrupación es obligatoria'),
  character_type: z.string().min(1, 'El tipo de personaje es obligatorio'),
  bell_count: z.number().min(0).max(12),
  includes_accessories: z.boolean(),
  listing_type: z.nativeEnum(ListingType),
  rental_price: z.number().min(0),
  sale_price: z.number().min(0),
}).superRefine((data, ctx) => {
  if (data.listing_type === ListingType.Venta && data.event_ids.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Los trajes de venta no pueden asociarse a eventos',
      path: ['event_ids'],
    });
  }
  if ((data.listing_type === ListingType.Arriendo || data.listing_type === ListingType.Ambos) && data.event_ids.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecciona al menos un evento para el arriendo',
      path: ['event_ids'],
    });
  }
});

type CostumeFormValues = z.infer<typeof costumeFormSchema>;

interface CostumeFormProps {
  defaultType: CostumeType;
  triggerLabel: string;
}

/**
 * Formulario de publicación de traje (arriendo o venta).
 * Sube las imágenes comprimidas al bucket público 'costume-images'
 * y luego crea el registro con las rutas resultantes.
 */
export function CostumeForm({ defaultType, triggerLabel }: CostumeFormProps) {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const createCostume = useCreateCostume();
  const { data: events } = useUpcomingEvents();

  // App A fields
  const [characterType, setCharacterType] = useState('Macho');
  const [bellCount, setBellCount] = useState(6);
  const [includesAccessories, setIncludesAccessories] = useState(true);
  const [listingType, setListingType] = useState<ListingType>(ListingType.Arriendo);
  const [rentalPrice, setRentalPrice] = useState(25000);
  const [salePrice, setSalePrice] = useState(350000);

  const form = useForm<CostumeFormValues>({
    resolver: zodResolver(costumeFormSchema),
    defaultValues: {
      type: defaultType === CostumeType.Rent ? CostumeType.Rent : CostumeType.Sale,
      year: '',
      size: '',
      boot_size: '',
      price: 0,
      bank_info: '',
      event_ids: [],
      agrupacion: '',
      character_type: 'Macho',
      bell_count: 6,
      includes_accessories: true,
      listing_type: ListingType.Arriendo,
      rental_price: 25000,
      sale_price: 350000,
    },
  });

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const next = [...imageFiles, ...Array.from(files)].slice(0, MAX_COSTUME_IMAGES);
    if (imageFiles.length + files.length > MAX_COSTUME_IMAGES) {
      toast.warning(`Máximo ${MAX_COSTUME_IMAGES} imágenes por traje.`);
    }
    setImageFiles(next);
  };

  const removeImage = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: CostumeFormValues) => {
    if (imageFiles.length === 0) {
      toast.error('Debes adjuntar al menos una foto del traje.');
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión no válida.');

      // Subir imágenes
      const folderId = crypto.randomUUID();
      const total = imageFiles.length;
      setUploadProgress({ done: 0, total });

      const results = await Promise.allSettled(
        imageFiles.map(async (file, i) => {
          const compressed = await compressImage(file);
          const path = `${user.id}/${folderId}/img-${i}.webp`;
          const { error } = await supabase.storage
            .from(STORAGE_BUCKETS.costumeImages)
            .upload(path, compressed.blob, { contentType: 'image/webp' });
          if (error) throw new Error(`Imagen ${i + 1}: ${error.message}`);

          setUploadProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
          return path;
        }),
      );

      const uploadedPaths = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value);

      if (uploadedPaths.length === 0) {
        throw new Error('No se pudo subir ninguna imagen.');
      }

      // Crear el traje con todos los campos de App A
      await createCostume.mutateAsync({
        type: values.listing_type === ListingType.Venta ? CostumeType.Sale : CostumeType.Rent,
        year: values.year,
        size: values.size,
        boot_size: values.boot_size,
        price: values.listing_type === ListingType.Venta ? values.sale_price : values.rental_price,
        bank_info: values.bank_info,
        image_paths: uploadedPaths,
        event_ids: values.listing_type === ListingType.Venta ? [] : values.event_ids,
        agrupacion: values.agrupacion,
        character_type: values.character_type,
        bell_count: values.bell_count,
        includes_accessories: values.includes_accessories,
        listing_type: values.listing_type,
        rental_price: values.rental_price,
        sale_price: values.sale_price,
        status: 'Disponible',
      } as any);

      form.reset();
      setImageFiles([]);
      setOpen(false);
      toast.success('Traje publicado correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al publicar el traje.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Publicar traje</DialogTitle>
          <DialogDescription>
            Completa los detalles del traje. Todos los campos son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* TIPO DE PUBLICACIÓN */}
            <div>
              <Label>Tipo de publicación</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setListingType(ListingType.Arriendo);
                    form.setValue('listing_type', ListingType.Arriendo);
                    form.setValue('type', CostumeType.Rent);
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-md border transition-all ${
                    listingType === ListingType.Arriendo
                      ? 'bg-brand-red text-white border-brand-red'
                      : 'bg-muted text-muted-foreground border-muted'
                  }`}
                >
                  Solo Arriendo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setListingType(ListingType.Venta);
                    form.setValue('listing_type', ListingType.Venta);
                    form.setValue('type', CostumeType.Sale);
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-md border transition-all ${
                    listingType === ListingType.Venta
                      ? 'bg-brand-red text-white border-brand-red'
                      : 'bg-muted text-muted-foreground border-muted'
                  }`}
                >
                  Solo Venta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setListingType(ListingType.Ambos);
                    form.setValue('listing_type', ListingType.Ambos);
                    form.setValue('type', CostumeType.Rent);
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-md border transition-all ${
                    listingType === ListingType.Ambos
                      ? 'bg-brand-red text-white border-brand-red'
                      : 'bg-muted text-muted-foreground border-muted'
                  }`}
                >
                  Arriendo y Venta
                </button>
              </div>
            </div>

            {/* DETALLES DEL TRAJE */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="character_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Personaje *</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setCharacterType(value);
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Macho">Macho</SelectItem>
                        <SelectItem value="Machona">Machona</SelectItem>
                        <SelectItem value="Warmi">Warmi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agrupacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agrupación / Fraternidad *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Caporales San Simón" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año *</FormLabel>
                    <FormControl>
                      <Input placeholder="2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Talla *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Talla" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="S">S</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="XL">XL</SelectItem>
                        <SelectItem value="XXL">XXL</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="boot_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Talla de Botas *</FormLabel>
                    <FormControl>
                      <Input placeholder="42" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cascabeles o Accesorios */}
            {characterType === 'Warmi' ? (
              <FormField
                control={form.control}
                name="includes_accessories"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setIncludesAccessories(!!checked);
                      }} />
                    </FormControl>
                    <FormLabel className="font-normal">Incluye Accesorios (Joyas, grecas y tulmas)</FormLabel>
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="bell_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad de Cascabeles</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="12"
                          step="1"
                          value={field.value}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            field.onChange(val);
                            setBellCount(val);
                          }}
                          className="flex-1 accent-brand-red"
                        />
                        <span className="font-bold text-brand-red min-w-[30px] text-center">
                          {field.value}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* PRECIOS */}
            <div className="grid gap-4 sm:grid-cols-2">
              {(listingType === ListingType.Arriendo || listingType === ListingType.Ambos) && (
                <FormField
                  control={form.control}
                  name="rental_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio de Arriendo ($) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="25000"
                          {...field}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            field.onChange(val);
                            setRentalPrice(val);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(listingType === ListingType.Venta || listingType === ListingType.Ambos) && (
                <FormField
                  control={form.control}
                  name="sale_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio de Venta ($) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="350000"
                          {...field}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            field.onChange(val);
                            setSalePrice(val);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* DATOS BANCARIOS */}
            <FormField
              control={form.control}
              name="bank_info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datos bancarios para el pago *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Banco, tipo de cuenta, número, RUT, correo"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* EVENTOS (solo arriendo) */}
            {(listingType === ListingType.Arriendo || listingType === ListingType.Ambos) && (
              <FormField
                control={form.control}
                name="event_ids"
                render={() => (
                  <FormItem>
                    <FormLabel>Eventos en los que estará disponible *</FormLabel>
                    <div className="space-y-2 rounded-md border p-3 max-h-40 overflow-y-auto">
                      {(events ?? []).length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No hay eventos vigentes disponibles.
                        </p>
                      )}
                      {(events ?? []).map((event) => (
                        <FormField
                          key={event.id}
                          control={form.control}
                          name="event_ids"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(event.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value ?? [];
                                    field.onChange(
                                      checked
                                        ? [...current, event.id]
                                        : current.filter((id) => id !== event.id),
                                    );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{event.name}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* FOTOS */}
            <div className="space-y-2">
              <Label>Fotos del traje (máx. {MAX_COSTUME_IMAGES}) *</Label>
              <Input
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                multiple
                onChange={(event) => addImages(event.target.files)}
              />
              {imageFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {imageFiles.map((file, index) => (
                    <div key={index} className="relative aspect-square border rounded-lg overflow-hidden group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" variant="brand" className="w-full" disabled={isUploading}>
              {isUploading ? (
                <>
                  <LoadingSpinner size={18} className="mr-2 text-white" />
                  {uploadProgress
                    ? `Subiendo fotos ${uploadProgress.done}/${uploadProgress.total}...`
                    : 'Publicando...'}
                </>
              ) : (
                'Publicar traje'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
