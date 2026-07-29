import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoadingSpinner({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <Loader2
      className={cn('animate-spin text-brand-red', className)}
      size={size}
      aria-label="Cargando"
    />
  );
}
