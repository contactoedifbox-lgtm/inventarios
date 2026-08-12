'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useMyCostumes, useDeleteCostume } from '@/hooks/useCostumes';
import {
  useMyRentals,
  useReceivedRentals,
  useConfirmRental,
  useUploadRentalVoucher,
  useMyQueueRequests,
  useReceivedQueueRequests,
  useConfirmAvailability,
  useRejectAvailability,
  useConfirmPayment,
  useCancelQueueRequest,
} from '@/hooks/useRentals';
import { useAuth } from '@/hooks/useAuth';
import { CostumeType, QueueStatus, UserRole } from '@/types/enums';
import { formatCLP } from '@/lib/utils/currency';
import { formatDateShort } from '@/lib/utils/dates';
import type { CostumeWithOwner, RentalWithDetails, RentalQueue } from '@/types/models';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, CheckCircle, XCircle, ArrowRight, CreditCard } from 'lucide-react';
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
import { RentRequestModal } from '@/components/rentals/RentRequestModal';
import { VoucherUploader } from '@/components/rentals/VoucherUploader';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { EmptyState } from '@/components/shared/EmptyState';

export default function ArriendoPage() {
  const [selectedCostume, setSelectedCostume] = useState<CostumeWithOwner | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleRentRequest = (costume: CostumeWithOwner) => {
    setSelectedCostume(costume);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Arriendo de trajes</h1>
          <p className="text-sm text-muted-foreground">
            Reserva un traje para tu próximo evento o publica el tuyo.
          </p>
        </div>
        <CostumeForm defaultType={CostumeType.Rent} triggerLabel="Publicar traje en arriendo" />
      </div>

      <Tabs defaultValue="catalogo">
        <TabsList className="flex-wrap">
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="mis-trajes">Mis trajes</TabsTrigger>
          <TabsTrigger value="mis-solicitudes">Mis solicitudes</TabsTrigger>
          <TabsTrigger value="recibidas">Solicitudes recibidas</TabsTrigger>
          <TabsTrigger value="cola">Cola de arriendo</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="space-y-4">
          <CostumeFilters showEventFilter />
          <CostumeTable
            type={CostumeType.Rent}
            actionLabel="Arrendar"
            onAction={handleRentRequest}
          />
        </TabsContent>

        <TabsContent value="mis-trajes">
          <MyRentCostumes />
        </TabsContent>

        <TabsContent value="mis-solicitudes">
          <MyRentals />
        </TabsContent>

        <TabsContent value="recibidas">
          <ReceivedRentals />
        </TabsContent>

        <TabsContent value="cola">
          <RentalQueueView />
        </TabsContent>
      </Tabs>

      <RentRequestModal
        costume={selectedCostume}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

// ---------- Mis trajes publicados en arriendo ----------
function MyRentCostumes() {
  const { data: costumes, isLoading } = useMyCostumes(CostumeType.Rent);
  const deleteCostume = useDeleteCostume();

  if (isLoading) return <SkeletonTable rows={3} columns={5} />;
  if (!costumes || costumes.length === 0) {
    return (
      <EmptyState
        title="No has publicado trajes"
        description="Publica tu primer traje de arriendo para que otros integrantes puedan reservarlo."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Talla</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Eventos</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {costumes.map((costume) => (
          <TableRow key={costume.id}>
            <TableCell className="font-medium">{costume.size}</TableCell>
            <TableCell>{formatCLP(costume.price)}</TableCell>
            <TableCell className="text-sm">{costume.events.map((e) => e.name).join(', ') || '—'}</TableCell>
            <TableCell>
              <CostumeStatusBadge status={costume.status} />
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

// ---------- Mis solicitudes de arriendo (como arrendatario) ----------
function MyRentals() {
  const { data: rentals, isLoading } = useMyRentals();
  const uploadVoucher = useUploadRentalVoucher();

  if (isLoading) return <SkeletonTable rows={3} columns={5} />;
  if (!rentals || rentals.length === 0) {
    return (
      <EmptyState
        title="Sin solicitudes"
        description="Cuando reserves un traje aparecerá aquí con sus instrucciones de pago."
      />
    );
  }

  return (
    <div className="space-y-4">
      {rentals.map((rental) => (
        <RentalCard
          key={rental.id}
          rental={rental}
          actions={
            <VoucherUploader
              hasVoucher={Boolean(rental.voucher_path)}
              onUpload={async (file) => {
                await uploadVoucher.mutateAsync({ rentalId: rental.id, file });
              }}
            />
          }
        />
      ))}
    </div>
  );
}

// ---------- Solicitudes recibidas (como dueño) ----------
function ReceivedRentals() {
  const { data: rentals, isLoading } = useReceivedRentals();
  const confirmRental = useConfirmRental();

  if (isLoading) return <SkeletonTable rows={3} columns={5} />;
  if (!rentals || rentals.length === 0) {
    return (
      <EmptyState
        title="Sin solicitudes recibidas"
        description="Cuando alguien reserve uno de tus trajes aparecerá aquí."
      />
    );
  }

  return (
    <div className="space-y-4">
      {rentals.map((rental) => (
        <RentalCard
          key={rental.id}
          rental={rental}
          actions={
            rental.status === 'reservado' ? (
              <Button
                size="sm"
                variant="brand"
                disabled={confirmRental.isPending || !rental.voucher_path}
                onClick={() => {
                  if (!rental.voucher_path) {
                    toast.warning('Espera a que el arrendatario suba su comprobante de pago.');
                    return;
                  }
                  confirmRental.mutate(rental.id);
                }}
              >
                Confirmar arriendo
              </Button>
            ) : (
              <Badge variant="success">Arriendo confirmado</Badge>
            )
          }
        />
      ))}
    </div>
  );
}

// ---------- Tarjeta compartida de arriendo ----------
function RentalCard({
  rental,
  actions,
}: {
  rental: RentalWithDetails;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 text-sm">
        <p className="font-medium">
          Traje talla {rental.costume.size} · {formatCLP(rental.costume.price)}
        </p>
        <p className="text-muted-foreground">
          {rental.first_name} {rental.last_name} · {rental.event.name} ·{' '}
          {formatDateShort(rental.event.event_date)}
        </p>
        <p className="text-muted-foreground">Estado: {rental.status}</p>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

// ============================================================
// COLA DE ARRIENDO (App A style)
// ============================================================

function RentalQueueView() {
  const { profile } = useAuth();
  const { data: myQueue, isLoading: myLoading } = useMyQueueRequests();
  const { data: receivedQueue, isLoading: receivedLoading } = useReceivedQueueRequests();
  const confirmAvailability = useConfirmAvailability();
  const rejectAvailability = useRejectAvailability();
  const confirmPayment = useConfirmPayment();
  const cancelRequest = useCancelQueueRequest();

  const isOwner = profile?.role === UserRole.Propietario || profile?.role === UserRole.Maestro;

  if (myLoading || receivedLoading) return <SkeletonTable rows={3} columns={4} />;

  // Solicitudes del usuario (como arrendatario)
  const myRequests = myQueue ?? [];

  // Solicitudes recibidas (como dueño)
  const receivedRequests = receivedQueue ?? [];

  if (myRequests.length === 0 && receivedRequests.length === 0) {
    return (
      <EmptyState
        title="Sin solicitudes en cola"
        description="Cuando solicites un traje o recibas solicitudes, aparecerán aquí."
      />
    );
  }

  const getStatusBadge = (status: QueueStatus) => {
    switch (status) {
      case QueueStatus.VerificandoDisponibilidad:
        return <Badge variant="warning">Verificando disponibilidad</Badge>;
      case QueueStatus.PendienteDePago:
        return <Badge variant="warning">Pendiente de pago (24h)</Badge>;
      case QueueStatus.Seleccionado:
        return <Badge variant="success">Seleccionado</Badge>;
      case QueueStatus.Rechazado:
        return <Badge variant="destructive">Rechazado</Badge>;
      case QueueStatus.Completado:
        return <Badge variant="success">Completado</Badge>;
      case QueueStatus.Expirado:
        return <Badge variant="destructive">Expirado</Badge>;
      case QueueStatus.Cancelado:
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Mis solicitudes en cola */}
      {myRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-red" />
            Mis solicitudes en cola
          </h3>
          <div className="space-y-3">
            {myRequests.map((req) => (
              <QueueCard
                key={req.id}
                request={req}
                actions={
                  req.status === QueueStatus.PendienteDePago && req.payment_deadline ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        Plazo: {new Date(req.payment_deadline).toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        variant="brand"
                        onClick={() => {
                          toast.info('Función de pago en desarrollo');
                        }}
                      >
                        <CreditCard className="w-3 h-3 mr-1" /> Proceder a pago
                      </Button>
                    </div>
                  ) : req.status === QueueStatus.VerificandoDisponibilidad ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => cancelRequest.mutate({ requestId: req.id })}
                    >
                      Cancelar solicitud
                    </Button>
                  ) : null
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Solicitudes recibidas (como dueño) */}
      {receivedRequests.length > 0 && isOwner && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-red" />
            Solicitudes recibidas en mis trajes
          </h3>
          <div className="space-y-3">
            {receivedRequests.map((req) => (
              <QueueCard
                key={req.id}
                request={req}
                actions={
                  req.status === QueueStatus.VerificandoDisponibilidad ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="brand"
                        onClick={() => confirmAvailability.mutate({ requestId: req.id, suitId: req.suit_id })}
                        disabled={confirmAvailability.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Confirmar disponibilidad
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectAvailability.mutate({ requestId: req.id, suitId: req.suit_id })}
                        disabled={rejectAvailability.isPending}
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Rechazar
                      </Button>
                    </div>
                  ) : req.status === QueueStatus.PendienteDePago ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        Esperando pago de {req.renter_name}
                      </span>
                      <Button
                        size="sm"
                        variant="brand"
                        onClick={() => confirmPayment.mutate({ requestId: req.id, suitId: req.suit_id })}
                        disabled={confirmPayment.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Confirmar pago
                      </Button>
                    </div>
                  ) : (
                    getStatusBadge(req.status)
                  )
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QueueCard({ request, actions }: { request: RentalQueue; actions: React.ReactNode }) {
  const getStatusBadge = (status: QueueStatus) => {
    switch (status) {
      case QueueStatus.VerificandoDisponibilidad:
        return <Badge variant="warning">Verificando disponibilidad</Badge>;
      case QueueStatus.PendienteDePago:
        return <Badge variant="warning">Pendiente de pago (24h)</Badge>;
      case QueueStatus.Seleccionado:
        return <Badge variant="success">Seleccionado</Badge>;
      case QueueStatus.Rechazado:
        return <Badge variant="destructive">Rechazado</Badge>;
      case QueueStatus.Completado:
        return <Badge variant="success">Completado</Badge>;
      case QueueStatus.Expirado:
        return <Badge variant="destructive">Expirado</Badge>;
      case QueueStatus.Cancelado:
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 text-sm">
        <p className="font-medium">
          #{request.order_index} - {request.suit_id?.slice(0, 8) || 'Traje'} · {request.event_name || 'Evento'}
        </p>
        <p className="text-muted-foreground">
          {request.renter_name} ({request.renter_email})
        </p>
        <p className="text-muted-foreground">
          Dueño: {request.owner_name} · Acción: {request.action_type}
        </p>
        <div>{getStatusBadge(request.status)}</div>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}
