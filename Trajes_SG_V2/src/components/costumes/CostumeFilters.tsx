'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpcomingEvents } from '@/hooks/useEvents';
import { useCatalogFiltersStore } from '@/lib/store/ui-store';

/**
 * Filtros del catálogo: búsqueda con debounce de 300 ms y filtro por evento.
 * El estado vive en el store Zustand (compartido con la tabla).
 */
export function CostumeFilters({ showEventFilter = false }: { showEventFilter?: boolean }) {
  const { search, eventId, setSearch, setEventId } = useCatalogFiltersStore();
  const [inputValue, setInputValue] = useState(search);
  const { data: events } = useUpcomingEvents();

  // Debounce de 300 ms sobre el input de texto
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (inputValue !== search) setSearch(inputValue);
    }, 300);
    return () => clearTimeout(timeout);
  }, [inputValue, search, setSearch]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Buscar por talla o año..."
          className="pl-9"
        />
      </div>
      {showEventFilter && (
        <Select
          value={eventId ?? 'all'}
          onValueChange={(value) => setEventId(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrar por evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los eventos</SelectItem>
            {(events ?? []).map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
