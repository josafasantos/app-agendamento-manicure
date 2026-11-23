import type { ClientProfile } from "../types";

export function getMaintenanceAlertClients(
  clients: ClientProfile[],
  maintenanceCycleDays: number,
  today: Date = new Date()
): ClientProfile[] {
  return clients.filter((c) => {
    if (!c.lastVisitDate) return false;
    const last = new Date(c.lastVisitDate + "T12:00:00");
    const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= (maintenanceCycleDays - 5);
  });
}
