import type { Appointment, StudioSettings } from "../types";

export interface CalculateSlotsParams {
  clientDate: string;
  totalDuration: number;
  settings: StudioSettings;
  appointments: Appointment[];
  stepMinutes?: number;
}

/**
 * Calcula os horários disponíveis para agendamento levando em conta:
 * 1. Horário de início e fim do expediente
 * 2. Intervalo de almoço
 * 3. Buffer de descanso/higienização entre atendimentos
 * 4. Agendamentos existentes (evitando sobreposição/choque de horário)
 */
export function calculateAvailableSlots({
  clientDate,
  totalDuration,
  settings,
  appointments,
  stepMinutes = 30
}: CalculateSlotsParams): string[] {
  if (!clientDate || totalDuration <= 0) return [];

  const slots: string[] = [];
  const [startH, startM] = (settings.dayStartTime || "08:00").split(":").map(Number);
  const [endH, endM] = (settings.dayEndTime || "19:00").split(":").map(Number);
  const dayStartMinutes = startH * 60 + startM;
  const dayEndMinutes = endH * 60 + endM;

  // Almoço
  let lunchStartMin = -1;
  let lunchEndMin = -1;
  if (settings.lunchStart && settings.lunchEnd) {
    const [lsH, lsM] = settings.lunchStart.split(":").map(Number);
    const [leH, leM] = settings.lunchEnd.split(":").map(Number);
    lunchStartMin = lsH * 60 + lsM;
    lunchEndMin = leH * 60 + leM;
  }

  // Agendamentos ocupados no dia (desconsiderando cancelados)
  const dayAppointments = appointments.filter(
    (a) => a.date === clientDate && a.status !== "cancelled"
  );

  const totalSlotNeeded = totalDuration + (settings.bufferMinutes ?? 10);

  for (let cur = dayStartMinutes; cur + totalDuration <= dayEndMinutes; cur += stepMinutes) {
    const curEnd = cur + totalSlotNeeded;

    // Conflito com intervalo de almoço
    if (lunchStartMin > 0 && lunchEndMin > 0) {
      if (!(curEnd <= lunchStartMin || cur >= lunchEndMin)) {
        continue;
      }
    }

    // Colisão com agendamentos existentes
    const hasConflict = dayAppointments.some((app) => {
      const [appStartH, appStartM] = app.startTime.split(":").map(Number);
      const [appEndH, appEndM] = app.endTime.split(":").map(Number);
      const appStartMin = appStartH * 60 + appStartM;
      const appEndMin = appEndH * 60 + appEndM;

      return cur < appEndMin && curEnd > appStartMin;
    });

    if (!hasConflict) {
      const hStr = String(Math.floor(cur / 60)).padStart(2, "0");
      const mStr = String(cur % 60).padStart(2, "0");
      slots.push(`${hStr}:${mStr}`);
    }
  }

  return slots;
}
