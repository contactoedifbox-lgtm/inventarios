import { Badge } from '@/components/ui/badge';
import { CostumeStatus } from '@/types/enums';

const statusConfig: Record<CostumeStatus, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  [CostumeStatus.Disponible]: { label: 'Disponible', variant: 'success' },
  [CostumeStatus.Reservado]: { label: 'Reservado', variant: 'warning' },
  [CostumeStatus.Arrendado]: { label: 'Arrendado', variant: 'danger' },
};

/** Badge de estado del traje con los colores corporativos definidos */
export function CostumeStatusBadge({ status }: { status: CostumeStatus }) {
  const config = statusConfig[status] ?? statusConfig[CostumeStatus.Disponible];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
