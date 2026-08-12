'use client';

import { useState } from 'react';
import { useMyCostumes, useDeleteCostume } from '@/hooks/useCostumes';
import {
  useMySales,
  useReceivedSales,
  useUploadSaleVoucher,
  useCreateTransaction,
} from '@/hooks/useSales';
import { useAuth } from '@/hooks/useAuth';
import { CostumeType, SaleStatus, UserRole } from '@/types/enums';
import { formatCLP } from '@/lib/utils/currency';
import type { CostumeWithOwner, SaleWithDetails } from '@/types/models';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CostumeTable } from '@/components/costumes/CostumeTable';
import { CostumeFilters } from '@/components/costumes/CostumeFilters';
import { CostumeForm } from '@/components/costumes/CostumeForm';
import { CostumeStatusBadge } from '@/components/costumes/CostumeStatusBadge';
import { SaleRequestModal } from '@/components/sales/SaleRequestModal';
import { SaleConfirmDialog } from '@/components/sales/SaleConfirmDialog';
import { VoucherUploader } from '@/components/rentals/VoucherUploader';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { EmptyState } from '@/components/shared/EmptyState';

export default function VentaPage() {
  const [selectedCostume, setSelectedCostume] = useState<CostumeWithOwner | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Venta de trajes</h1>
          <p className="text-sm text-muted-foreground">
            Compra el traje de otro integrante o vende el tuyo.
          </p>
        </div>
        <CostumeForm defaultType={CostumeType.Sale} triggerLabel="Publicar traje en venta" />
      </div>

      <Tabs defaultValue="catalogo">
        <TabsList className="flex-wrap">
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="mis-trajes">Mis trajes</TabsTrigger>
          <TabsTrigger value="mis-compras">Mis compras</TabsTrigger>
          <TabsTrigger value="recibidas">Solicitudes recibidas</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="space-y-4">
          <CostumeFilters />
          <CostumeTable
            type={CostumeType.Sale}
            actionLabel="Comprar"
            onAction={(costume) => {
              setSelectedCostume(costume);
              setModalOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="mis-trajes">
          <MySaleCostumes />
        </TabsContent>

        <TabsContent value="mis-compras">
          <MyPurchases />
        </TabsContent>

        <TabsContent value="recibidas">
          <ReceivedSales />
        </TabsContent>
      </Tabs>

      <SaleRequestModal costume={selectedCostume} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function MySaleCostumes() {
  const { data: costumes, isLoading } = useMyCostumes(CostumeType.Sale);
  const deleteCostume = useDeleteCostume();

  if (isLoading) return <SkeletonTable rows={3} columns={4} />;
  if (!costumes || costumes.length === 0) {
    return (
      <EmptyState
        title="No has publicado trajes"
        description="Publica tu primer traje en venta para que otros integrantes puedan comprarlo."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Talla</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {costumes.map((costume) => (
          <TableRow key={costume.id}>
            <TableCell className="font-medium">{costume.size}</TableCell>
            <TableCell>{formatCLP(costume.price)}</TableCell>
            <TableCell>
              {costume.is_sold ? (
                <Badge variant="secondary">Vendido</Badge>
              ) : (
                <CostumeStatusBadge status={costume.status} />
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteCostume.isPending || costume.status !== 'disponible'}
                onClick={() => {
                  if (window.confirm('¿Eliminar este traje? Esta acción no se puede deshacer.')) {
                    deleteCostume.mutate(costume.id);
                  }
                }}
              >
                Eliminar
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MyPurchases() {
  const { data: sales, isLoading } = useMySales();
  const uploadVoucher = useUploadSaleVoucher();

  if (isLoading) return <SkeletonTable rows={3} columns={4} />;
  if (!sales || sales.length === 0) {
    return (
      <EmptyState
        title="Sin compras"
        description="Cuando solicites la compra de un traje aparecerá aquí."
      />
    );
  }

  return (
    <div className="space-y-4">
      {sales.map((sale) => (
        <SaleCard
          key={sale.id}
          sale={sale}
          actions={
            <VoucherUploader
              hasVoucher={Boolean(sale.voucher_path)}
              onUpload={async (file) => {
                await uploadVoucher.mutateAsync({ saleId: sale.id, file });
              }}
            />
          }
        />
      ))}
    </div>
  );
}

function ReceivedSales() {
  const { data: sales, isLoading } = useReceivedSales();

  if (isLoading) return <SkeletonTable rows={3} columns={4} />;
  if (!sales || sales.length === 0) {
    return (
      <EmptyState
        title="Sin solicitudes recibidas"
        description="Cuando alguien solicite comprar uno de tus trajes aparecerá aquí."
      />
    );
  }

  return (
    <div className="space-y-4">
      {sales.map((sale) => (
        <SaleCard
          key={sale.id}
          sale={sale}
          actions={
            sale.status === SaleStatus.Reservado ? (
              <div className="flex flex-col items-end gap-1">
                <SaleConfirmDialog sale={sale} />
                {!sale.voucher_path && (
                  <span className="text-xs text-muted-foreground">
                    Esperando comprobante del comprador
                  </span>
                )}
              </div>
            ) : (
              <Badge variant="success">Venta completada</Badge>
            )
          }
        />
      ))}
    </div>
  );
}

function SaleCard({ sale, actions }: { sale: SaleWithDetails; actions: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 text-sm">
        <p className="font-medium">
          Traje talla {sale.costume.size} · {formatCLP(sale.costume.price)}
        </p>
        <p className="text-muted-foreground">
          {sale.first_name} {sale.last_name} · {sale.email} · {sale.phone}
        </p>
        <p className="text-muted-foreground">
          Estado: {sale.status === 'reservado' ? 'Reservado' : 'Completado'}
        </p>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}
