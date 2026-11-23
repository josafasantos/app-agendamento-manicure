import { describe, it, expect } from "vitest";
import { getMaintenanceAlertClients } from "./maintenance";
import type { ClientProfile } from "../types";

describe("Maintenance - Alertas de Retorno da Cliente", () => {
  it("deve filtrar clientes na janela de retorno recomendada (ex: >= 15 dias para ciclo de 20 dias)", () => {
    // Data base fixada: 2026-11-23
    const today = new Date("2026-11-23T12:00:00");

    const clients: ClientProfile[] = [
      {
        id: "11988881111",
        name: "Camila Recente",
        phone: "11988881111",
        totalVisits: 1,
        lastVisitDate: "2026-11-18" // 5 dias atrás -> NÃO deve alertar
      },
      {
        id: "11988882222",
        name: "Renata No Prazo",
        phone: "11988882222",
        totalVisits: 3,
        lastVisitDate: "2026-11-06" // 17 dias atrás (>= 15 dias) -> DEVE alertar
      },
      {
        id: "11988883333",
        name: "Juliana Atrasada",
        phone: "11988883333",
        totalVisits: 2,
        lastVisitDate: "2026-10-25" // 29 dias atrás -> DEVE alertar
      },
      {
        id: "11988884444",
        name: "Fernanda Sem Visita",
        phone: "11988884444",
        totalVisits: 0
        // sem lastVisitDate
      }
    ];

    const alerts = getMaintenanceAlertClients(clients, 20, today);

    expect(alerts.length).toBe(2);
    expect(alerts.map((c) => c.name)).toEqual(["Renata No Prazo", "Juliana Atrasada"]);
  });
});
