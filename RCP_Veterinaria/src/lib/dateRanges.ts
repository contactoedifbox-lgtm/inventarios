export type RangoTipo = 'dia' | 'semana' | 'mes' | 'anio' | 'rango';

const TZ = 'America/Santiago';

/** Desfase (ms) de la zona respecto de UTC en un instante dado. */
function offsetMs(fecha: Date, timeZone = TZ): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const partes: Record<string, string> = {};
  for (const parte of dtf.formatToParts(fecha)) partes[parte.type] = parte.value;

  const comoUtc = Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    Number(partes.hour),
    Number(partes.minute),
    Number(partes.second),
  );

  return comoUtc - fecha.getTime();
}

/**
 * Convierte una fecha y hora local de Chile a un instante UTC.
 * Es la base para que la agenda no dependa de la zona horaria del navegador.
 */
export function chileAUtc(fecha: string, hora = '00:00'): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  const conjetura = Date.UTC(anio, mes - 1, dia, hh, mm, 0);
  const offset = offsetMs(new Date(conjetura));
  return new Date(conjetura - offset);
}

function isoDesdeUtc(fecha: Date): string {
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Fecha de hoy en Chile (YYYY-MM-DD). */
export function hoyISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Fecha en Chile (YYYY-MM-DD) de un instante dado. */
export function fechaISO(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
}

/** Numero de dia ISO (1 lunes ... 7 domingo) de una fecha calendario. */
export function diaSemanaISO(fecha: string): number {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const dow = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(); // 0 = domingo
  return ((dow + 6) % 7) + 1;
}

/** Rango [desde, hasta) de un dia en Chile. */
export function rangoDiaLocal(fecha: string): { desde: string; hasta: string } {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const siguiente = isoDesdeUtc(new Date(Date.UTC(anio, mes - 1, dia + 1)));
  return {
    desde: chileAUtc(fecha, '00:00').toISOString(),
    hasta: chileAUtc(siguiente, '00:00').toISOString(),
  };
}

/**
 * Calcula el rango ISO [desde, hasta) segun el tipo elegido, en hora de Chile.
 * La semana parte el lunes y el mes el dia 1.
 */
export function rangoDe(
  tipo: RangoTipo,
  desde?: string,
  hasta?: string,
): { desde: string; hasta: string } {
  const hoy = hoyISO();

  if (tipo === 'rango') {
    const inicio = desde || hoy;
    const finBase = hasta || hoy;
    const [anio, mes, dia] = finBase.split('-').map(Number);
    const siguiente = isoDesdeUtc(new Date(Date.UTC(anio, mes - 1, dia + 1)));
    return {
      desde: chileAUtc(inicio, '00:00').toISOString(),
      hasta: chileAUtc(siguiente, '00:00').toISOString(),
    };
  }

  if (tipo === 'dia') {
    return rangoDiaLocal(hoy);
  }

  if (tipo === 'semana') {
    const dow = diaSemanaISO(hoy);
    const [anio, mes, dia] = hoy.split('-').map(Number);
    const lunes = isoDesdeUtc(new Date(Date.UTC(anio, mes - 1, dia - (dow - 1))));
    const proximoLunes = isoDesdeUtc(new Date(Date.UTC(anio, mes - 1, dia - (dow - 1) + 7)));
    return {
      desde: chileAUtc(lunes, '00:00').toISOString(),
      hasta: chileAUtc(proximoLunes, '00:00').toISOString(),
    };
  }

  if (tipo === 'anio') {
    const anio = Number(hoy.slice(0, 4));
    return {
      desde: chileAUtc(`${anio}-01-01`, '00:00').toISOString(),
      hasta: chileAUtc(`${anio + 1}-01-01`, '00:00').toISOString(),
    };
  }

  const anio = Number(hoy.slice(0, 4));
  const mes = Number(hoy.slice(5, 7));
  const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const siguiente =
    mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
  return {
    desde: chileAUtc(inicio, '00:00').toISOString(),
    hasta: chileAUtc(siguiente, '00:00').toISOString(),
  };
}