/** Lo que devuelve el endpoint de disponibilidad para un slot horario */
export interface SlotDisponible {
  horario: string; // '09:00'
  disponible: boolean;
  capacidadTotal: number;
  citasAgendadas: number;
  lugaresRestantes: number;
}

/** Disponibilidad de un día completo con todos sus slots */
export interface DisponibilidadDia {
  fecha: string; // '2026-04-15'
  disponible: boolean; // false si no hay ningún slot disponible
  slots: SlotDisponible[];
}
