'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { costumeSchema, type CostumeInput } from '@/lib/validations/costume.schema';
import { useCreateCostume } from '@/hooks/useCostumes';
import { useUpcomingEvents } from '@/hooks/useEvents';
import { compressImage } from '@/lib/utils/image';
import { CostumeType } from '@/types/enums';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_COSTUME_IMAGES,
  STORAGE_BUCKETS,
} from '@/config/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

  const form = useForm<CostumeInput>({
    resolver: zodResolver(costumeSchema),
    defaultValues: {
      type: defaultType,
      year: '',
      size: '',
      boot_size: '',
      price: 0,
      bank_info: '',
      event_ids: [],
    },
  });

  const watchType = form.watch('type');

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const next = [...imageFiles, ...Array.from(files)].slice(0, MAX_COSTUME_IMAGES);
    if (imageFiles.length + files.length > MAX_COSTUME_IMAGES) {
      toast.warning(`Máximo ${MAX_COSTUME_IMAGES} imágenes por traje.`);
    }
    setImageFiles(next);
  };

  const onSubmit = async (values: CostumeInput) => {
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

      // Carpeta única para las imágenes de este traje
      const folderId = crypto.randomUUID();
      const total = imageFiles.length;
      setUploadProgress({ done: 0, total });

      // Subida EN PARALELO: una imagen que falla NO cancela a las demás.
      // Cada tarea comprime + sube y reporta su progreso.
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
      const failedCount = results.length - uploadedPaths.length;

      if (uploadedPaths.length === 0) {
        const firstError = results.find((r) => r.status === 'rejected') as
          | PromiseRejectedResult
          | undefined;
        throw new Error(
          `No se pudo subir ninguna imagen. ${firstError?.reason instanceof Error ? firstError.reason.message : ''}`.trim(),
        );
      }

      await createCostume.mutateAsync({ ...values, image_paths: uploadedPaths });

      if (failedCount > 0) {
        toast.warning(
          `Traje publicado, pero ${failedCount} de ${total} imágenes no se pudieron subir. Puedes editarlo e intentarlo de nuevo.`,
        );
      }

      form.reset();
      setImageFiles([]);
      setOpen(false);
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
            Completa los datos del traje. Los campos con evento solo aplican a arriendo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de publicación</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={CostumeType.Rent}>Arriendo</SelectItem>
                      <SelectItem value={CostumeType.Sale}>Venta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año del traje</FormLabel>
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
                    <FormLabel>Talla</FormLabel>
                    <FormControl>
                      <Input placeholder="M / 48 / XL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="boot_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Talla de botas</FormLabel>
                    <FormControl>
                      <Input placeholder="42" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio (CLP)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="150000"
                      {...field}
                      onChange={(event) => field.onChange(event.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bank_info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datos bancarios para el pago</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Banco, tipo de cuenta, número, RUT, correo"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchType === CostumeType.Rent && (
              <FormField
                control={form.control}
                name="event_ids"
                render={() => (
                  <FormItem>
                    <FormLabel>Eventos en los que estará disponible</FormLabel>
                    <div className="space-y-2 rounded-md border p-3">
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

            <div className="space-y-2">
              <Label htmlFor="costume-images">Fotos del traje (máx. {MAX_COSTUME_IMAGES})</Label>
              <Input
                id="costume-images"
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                multiple
                onChange={(event) => addImages(event.target.files)}
              />
              {imageFiles.length > 0 && (
                <ul className="space-y-1">
                  {imageFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setImageFiles(imageFiles.filter((_, i) => i !== index))}
                        className="text-destructive hover:opacity-70"
                        aria-label={`Quitar ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
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
