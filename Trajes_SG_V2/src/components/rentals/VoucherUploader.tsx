'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/utils/image';
import { ACCEPTED_IMAGE_TYPES } from '@/config/constants';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface VoucherUploaderProps {
  /** Recibe el Blob ya comprimido listo para subir al bucket 'vouchers' */
  onUpload: (file: Blob) => Promise<void>;
  hasVoucher: boolean;
  label?: string;
}

/** Botón para adjuntar el comprobante de pago (comprime antes de subir) */
export function VoucherUploader({ onUpload, hasVoucher, label }: VoucherUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const compressed = await compressImage(file);
      await onUpload(compressed.blob);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar el comprobante.');
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        size="sm"
        variant={hasVoucher ? 'outline' : 'brand'}
        disabled={isProcessing}
        onClick={() => inputRef.current?.click()}
      >
        {isProcessing ? (
          <LoadingSpinner size={16} className={hasVoucher ? '' : 'text-white'} />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {label ?? (hasVoucher ? 'Reemplazar comprobante' : 'Subir comprobante')}
      </Button>
      {hasVoucher && <span className="text-xs text-green-700">Comprobante cargado</span>}
    </div>
  );
}
