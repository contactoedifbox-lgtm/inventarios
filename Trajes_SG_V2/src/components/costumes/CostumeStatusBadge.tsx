import { Badge } from '@/components/ui/badge';
import { CostumeStatus } from '@/types/enums';

const statusConfig: Record<CostumeStatus, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  [CostumeStatus.Disponible]: { label: 'Disponible', variant: 'success' },
  [CostumeStatus.VerificandoDisponibilidad]: { label: 'Verificando disponibilidad', variant: 'warning' },
  [CostumeStatus.PendienteDePago]: { label: 'Pendiente de pago', variant: 'warning' },
  [CostumeStatus.Reservado]: { label: 'Reservado', variant: 'warning' },
  [CostumeStatus.Arrendado]: { label: 'Arrendado', variant: 'danger' },
  [CostumeStatus.Vendido]: { label: 'Vendido', variant: 'danger' },
};

/** Badge de estado del traje con los colores corporativos definidos */
export function CostumeStatusBadge({ status }: { status: CostumeStatus }) {
  const config = statusConfig[status] ?? statusConfig[CostumeStatus.Disponible];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
