'use client';

import { useState } from 'react';
import { useConfirmSale } from '@/hooks/useSales';
import { formatCLP } from '@/lib/utils/currency';
import type { SaleWithDetails } from '@/types/models';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface SaleConfirmDialogProps {
  sale: SaleWithDetails;
}

/**
 * Confirmación de venta por parte del dueño:
 * marca la venta como completada y el traje pasa a is_sold=true (soft delete).
 */
export function SaleConfirmDialog({ sale }: SaleConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const confirmSale = useConfirmSale();

  const handleConfirm = async () => {
    try {
      await confirmSale.mutateAsync(sale.id);
      setOpen(false);
    } catch {
      // El hook ya muestra el toast de error
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="brand" disabled={sale.status !== 'reservado'}>
          Confirmar venta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar venta del traje</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a confirmar la venta del traje talla {sale.costume.size} por{' '}
            {formatCLP(sale.costume.price)} a {sale.first_name} {sale.last_name}. Esta acción
            marcará el traje como vendido y dejará de mostrarse en el catálogo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleConfirm()} disabled={confirmSale.isPending}>
            {confirmSale.isPending ? <LoadingSpinner size={16} className="text-white" /> : 'Sí, confirmar venta'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
