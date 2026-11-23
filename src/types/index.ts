export interface Service {
  id: string;
  title: string;
  description?: string;
  price: number;
  durationMinutes: number;
  category: "alongamento" | "manutencao" | "natural" | "adicional";
  active: boolean;
}

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceTitle: string;
  totalPrice: number;
  totalDurationMinutes: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: AppointmentStatus;
  notes?: string;
  paymentMethod?: "pix" | "cartao" | "dinheiro";
  createdAt: string;
  reminderSent?: boolean;
  reminderSentAt?: string;
}

export interface ClientProfile {
  id: string; // normalized phone
  name: string;
  phone: string;
  nailShape?: "quadrada" | "amendoada" | "bailarina" | "stiletto" | "redonda";
  favoriteColors?: string;
  allergies?: string;
  notes?: string;
  totalVisits: number;
  lastVisitDate?: string;
  nextRecommendedMaintenance?: string;
}

export interface StudioSettings {
  ownerName: string;
  studioName: string;
  phone: string;
  address: string;
  workDays: number[]; // 0 = Domingo, 1 = Segunda, etc.
  dayStartTime: string; // "08:00"
  dayEndTime: string; // "19:00"
  lunchStart?: string; // "12:00"
  lunchEnd?: string; // "13:00"
  bufferMinutes: number; // ex: 10 minutos para higienização
  cancelLimitHours: number; // ex: 12 horas
  maintenanceCycleDays: number; // ex: 20 dias
}

export interface Transaction {
  id: string;
  appointmentId?: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  category: "servico" | "produto" | "insumo" | "outro";
  paymentMethod: "pix" | "cartao" | "dinheiro";
  description: string;
}
