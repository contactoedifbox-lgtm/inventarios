'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCostumes } from '@/hooks/useCostumes';
import { useCatalogFiltersStore } from '@/lib/store/ui-store';
import { CostumeStatus, CostumeType } from '@/types/enums';
import { formatCLP } from '@/lib/utils/currency';
import { getPublicImageUrl } from '@/lib/utils/image';
import { DEFAULT_PAGE_SIZE, STORAGE_BUCKETS } from '@/config/constants';
import type { CostumeWithOwner } from '@/types/models';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { CostumeStatusBadge } from '@/components/costumes/CostumeStatusBadge';

interface CostumeTableProps {
  type: CostumeType;
  actionLabel: string;
  onAction: (costume: CostumeWithOwner) => void;
  emptyAction?: () => void;
  emptyActionLabel?: string;
}

/** Tabla de catálogo con paginación del lado del servidor (10 por página) */
export function CostumeTable({
  type,
  actionLabel,
  onAction,
  emptyAction,
  emptyActionLabel,
}: CostumeTableProps) {
  const { search, eventId, page, setPage } = useCatalogFiltersStore();

  const { data, isLoading, isFetching } = useCostumes({
    type,
    search: search || undefined,
    eventId: type === CostumeType.Rent ? (eventId ?? undefined) : undefined,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  if (isLoading) return <SkeletonTable rows={5} columns={6} />;

  const costumes = data?.data ?? [];

  if (costumes.length === 0) {
    return (
      <EmptyState
        title="No hay trajes disponibles"
        description="Aún no se han publicado trajes en esta categoría o no coinciden con tu búsqueda."
        actionLabel={emptyActionLabel}
        onAction={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-4" aria-busy={isFetching}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Foto</TableHead>
            <TableHead>Talla</TableHead>
            <TableHead>Año</TableHead>
            <TableHead>Bota</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Dueño</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {costumes.map((costume) => {
            const imagePath = costume.image_paths[0];
            const imageUrl = imagePath
              ? getPublicImageUrl(STORAGE_BUCKETS.costumeImages, imagePath)
              : null;
            const isAvailable = costume.status === CostumeStatus.Disponible;

            return (
              <TableRow key={costume.id}>
                <TableCell>
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={`Traje talla ${costume.size}`}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                      Sin foto
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{costume.size}</TableCell>
                <TableCell>{costume.year}</TableCell>
                <TableCell>{costume.boot_size}</TableCell>
                <TableCell>{formatCLP(costume.price)}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{costume.owner.full_name}</span>
                    <span className="text-xs text-muted-foreground">{costume.owner.city}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <CostumeStatusBadge status={costume.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={isAvailable ? 'brand' : 'outline'}
                    disabled={!isAvailable}
                    onClick={() => onAction(costume)}
                  >
                    {actionLabel}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {data.page} de {data.totalPages} ({data.count} trajes)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
