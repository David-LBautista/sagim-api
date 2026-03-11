import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/es';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.locale('es');

export const TIMEZONE_MEXICO = 'America/Mexico_City';

export const fecha = {
  // Fecha actual en México
  ahoraEnMexico: () => dayjs().tz(TIMEZONE_MEXICO),

  // Convertir fecha UTC a México
  utcAMexico: (date: Date | string) => dayjs(date).tz(TIMEZONE_MEXICO),

  // Inicio del día en México (para queries de BD)
  inicioDia: (date?: Date | string) =>
    dayjs(date).tz(TIMEZONE_MEXICO).startOf('day').utc().toDate(),

  // Fin del día en México (para queries de BD)
  finDia: (date?: Date | string) =>
    dayjs(date).tz(TIMEZONE_MEXICO).endOf('day').utc().toDate(),

  // Inicio del mes en México
  inicioMes: (mes: number, anio: number) =>
    dayjs
      .tz(`${anio}-${String(mes).padStart(2, '0')}-01`, TIMEZONE_MEXICO)
      .startOf('month')
      .utc()
      .toDate(),

  // Fin del mes en México
  finMes: (mes: number, anio: number) =>
    dayjs
      .tz(`${anio}-${String(mes).padStart(2, '0')}-01`, TIMEZONE_MEXICO)
      .endOf('month')
      .utc()
      .toDate(),

  // Formatear para mostrar al usuario
  formatear: (date: Date | string, formato = 'DD/MM/YYYY HH:mm') =>
    dayjs(date).tz(TIMEZONE_MEXICO).format(formato),

  // Formatear solo hora para recibos (e.g. "04:55 p. m.")
  hora: (date: Date | string) =>
    dayjs(date).tz(TIMEZONE_MEXICO).format('hh:mm a'),

  // Agregar horas (para expiración de órdenes)
  agregarHoras: (date: Date | string, horas: number) =>
    dayjs(date).add(horas, 'hour').toDate(),

  // Parsear fecha YYYY-MM-DD como inicio del día en México
  parsearFecha: (fechaStr: string) =>
    dayjs
      .tz(fechaStr, 'YYYY-MM-DD', TIMEZONE_MEXICO)
      .startOf('day')
      .utc()
      .toDate(),

  // Parsear fecha YYYY-MM-DD como fin del día en México
  parsearFechaFin: (fechaStr: string) =>
    dayjs
      .tz(fechaStr, 'YYYY-MM-DD', TIMEZONE_MEXICO)
      .endOf('day')
      .utc()
      .toDate(),
};
