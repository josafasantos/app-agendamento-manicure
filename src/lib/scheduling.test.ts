import { describe, it, expect } from "vitest";
import { calculateAvailableSlots } from "./scheduling";
import type { Appointment, StudioSettings } from "../types";

const mockSettings: StudioSettings = {
  ownerName: "Valquiria Brombini",
  studioName: "Espaço Val Brombini",
  phone: "11999999999",
  address: "Rua das Flores, 123",
  workDays: [1, 2, 3, 4, 5, 6],
  dayStartTime: "08:00",
  dayEndTime: "18:00",
  lunchStart: "12:00",
  lunchEnd: "13:00",
  bufferMinutes: 10,
  cancelLimitHours: 12,
  maintenanceCycleDays: 20
};

describe("Scheduling - Cálculo de Horários Livres", () => {
  it("deve retornar lista vazia se data for vazia ou duração for zero", () => {
    expect(calculateAvailableSlots({
      clientDate: "",
      totalDuration: 60,
      settings: mockSettings,
      appointments: []
    })).toEqual([]);

    expect(calculateAvailableSlots({
      clientDate: "2026-11-28",
      totalDuration: 0,
      settings: mockSettings,
      appointments: []
    })).toEqual([]);
  });

  it("deve gerar horários de 30 em 30 min dentro do expediente comercial", () => {
    const slots = calculateAvailableSlots({
      clientDate: "2026-11-28",
      totalDuration: 60,
      settings: mockSettings,
      appointments: []
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots).toContain("08:00");
    expect(slots).toContain("08:30");
    expect(slots).toContain("09:00");
  });

  it("não deve permitir horários que invadam o intervalo de almoço", () => {
    const slots = calculateAvailableSlots({
      clientDate: "2026-11-28",
      totalDuration: 60, // 60 min + 10 min buffer = 70 min
      settings: mockSettings,
      appointments: []
    });

    // Um serviço de 60 min que inicia às 11:30 terminaria às 12:30 (dentro do almoço 12:00-13:00)
    expect(slots).not.toContain("11:30");
    // Um serviço que inicia às 12:00 ou 12:30 está dentro do almoço
    expect(slots).not.toContain("12:00");
    expect(slots).not.toContain("12:30");
    // Após o almoço (13:00) deve estar liberado
    expect(slots).toContain("13:00");
  });

  it("deve bloquear horários que colidam com agendamentos existentes", () => {
    const existingAppointments: Appointment[] = [
      {
        id: "app-1",
        clientName: "Maria",
        clientPhone: "11988887777",
        serviceId: "serv-1",
        serviceTitle: "Alongamento",
        totalPrice: 160,
        totalDurationMinutes: 120, // 2 horas (14:00 às 16:00)
        date: "2026-11-28",
        startTime: "14:00",
        endTime: "16:00",
        status: "confirmed",
        createdAt: "2026-11-20"
      }
    ];

    const slots = calculateAvailableSlots({
      clientDate: "2026-11-28",
      totalDuration: 60,
      settings: mockSettings,
      appointments: existingAppointments
    });

    // 14:00 até 16:00 está ocupado
    expect(slots).not.toContain("14:00");
    expect(slots).not.toContain("14:30");
    expect(slots).not.toContain("15:00");
    expect(slots).not.toContain("15:30");

    // 13:30 não cabe 60 min + 10 min buffer (terminaria às 14:40, colidindo com 14:00)
    expect(slots).not.toContain("13:30");

    // Horários da manhã e após as 16:00 continuam disponíveis
    expect(slots).toContain("09:00");
    expect(slots).toContain("16:00");
  });

  it("deve liberar o horário se o agendamento conflitante estiver cancelado", () => {
    const cancelledAppointment: Appointment[] = [
      {
        id: "app-2",
        clientName: "Ezia",
        clientPhone: "11943527623",
        serviceId: "serv-1",
        serviceTitle: "Alongamento",
        totalPrice: 160,
        totalDurationMinutes: 120,
        date: "2026-11-28",
        startTime: "14:00",
        endTime: "16:00",
        status: "cancelled", // Cancelado!
        createdAt: "2026-11-20"
      }
    ];

    const slots = calculateAvailableSlots({
      clientDate: "2026-11-28",
      totalDuration: 60,
      settings: mockSettings,
      appointments: cancelledAppointment
    });

    // Como está cancelado, o horário 14:00 volta a ficar livre para novas clientes
    expect(slots).toContain("14:00");
  });

  it("não deve permitir horários após o encerramento do expediente", () => {
    const slots = calculateAvailableSlots({
      clientDate: "2026-11-28",
      totalDuration: 60,
      settings: mockSettings, // encerra às 18:00
      appointments: []
    });

    // 17:00 + 60 min = 18:00 (limite) -> cabe
    expect(slots).toContain("17:00");
    // 17:30 + 60 min = 18:30 (ultrapassa 18:00) -> não cabe
    expect(slots).not.toContain("17:30");
    expect(slots).not.toContain("18:00");
  });
});
