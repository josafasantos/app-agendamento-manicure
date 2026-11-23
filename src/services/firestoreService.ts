import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  Service,
  Appointment,
  ClientProfile,
  StudioSettings,
  Transaction
} from "../types";

export const DEFAULT_SETTINGS: StudioSettings = {
  ownerName: "Josafá Santos",
  studioName: "Studio Nails",
  phone: "11999999999",
  address: "Rua das Flores, 123 - Centro",
  workDays: [1, 2, 3, 4, 5, 6], // Segunda a Sábado
  dayStartTime: "08:00",
  dayEndTime: "19:00",
  lunchStart: "12:00",
  lunchEnd: "13:00",
  bufferMinutes: 10,
  cancelLimitHours: 12,
  maintenanceCycleDays: 20
};

export const INITIAL_SERVICES: Omit<Service, "id">[] = [
  {
    title: "Alongamento em Fibra de Vidro",
    description: "Aplicação completa com cutilagem e esmaltação básica",
    price: 160,
    durationMinutes: 120,
    category: "alongamento",
    active: true
  },
  {
    title: "Manutenção de Alongamento (Gel/Fibra)",
    description: "Nivelamento, troca de formato e esmaltação",
    price: 110,
    durationMinutes: 90,
    category: "manutencao",
    active: true
  },
  {
    title: "Banho de Gel na Unha Natural",
    description: "Fortalecimento com camada protetora de gel",
    price: 90,
    durationMinutes: 75,
    category: "natural",
    active: true
  },
  {
    title: "Cutilagem & Esmaltação Tradicional (Mão)",
    description: "Cuidado clássico completo com hidratação",
    price: 45,
    durationMinutes: 45,
    category: "natural",
    active: true
  },
  {
    title: "Nail Art / Francesinha Especial",
    description: "Decoração artística manual ou encapsulada",
    price: 25,
    durationMinutes: 20,
    category: "adicional",
    active: true
  }
];

// ==========================================
// 1. SERVIÇOS
// ==========================================
export function subscribeServices(callback: (services: Service[]) => void) {
  const colRef = collection(db, "services");
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        callback(INITIAL_SERVICES.map((s, idx) => ({ id: `serv-${idx + 1}`, ...s })));
      } else {
        const list: Service[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Service));
        callback(list);
      }
    },
    (err) => {
      console.warn("Erro ao ouvir serviços do Firestore (usando fallback local):", err);
      callback(INITIAL_SERVICES.map((s, idx) => ({ id: `serv-${idx + 1}`, ...s })));
    }
  );
}

export async function saveService(service: Omit<Service, "id"> & { id?: string }) {
  const colRef = collection(db, "services");
  const docRef = service.id ? doc(colRef, service.id) : doc(colRef);
  await setDoc(docRef, { ...service, id: docRef.id }, { merge: true });
}

export async function deleteService(id: string) {
  await deleteDoc(doc(db, "services", id));
}

// ==========================================
// 2. CONFIGURAÇÕES
// ==========================================
export function subscribeSettings(callback: (settings: StudioSettings) => void) {
  const docRef = doc(db, "settings", "business");
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as StudioSettings);
      } else {
        callback(DEFAULT_SETTINGS);
      }
    },
    () => callback(DEFAULT_SETTINGS)
  );
}

export async function updateSettings(settings: StudioSettings) {
  const docRef = doc(db, "settings", "business");
  await setDoc(docRef, settings, { merge: true });
}

// ==========================================
// 3. AGENDAMENTOS (APPOINTMENTS)
// ==========================================
export function subscribeAppointments(
  selectedDate: string | null,
  callback: (appointments: Appointment[]) => void
) {
  const colRef = collection(db, "appointments");
  let q = query(colRef, orderBy("startTime", "asc"));
  if (selectedDate) {
    q = query(colRef, where("date", "==", selectedDate), orderBy("startTime", "asc"));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Appointment[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Appointment));
      callback(list);
    },
    (err) => {
      console.warn("Erro ao ouvir agendamentos (usando dados locais):", err);
      callback([]);
    }
  );
}

export async function createAppointment(
  data: Omit<Appointment, "id" | "createdAt" | "status">
): Promise<string> {
  const slotDocId = `${data.date}_${data.startTime.replace(":", "-")}`;
  const slotRef = doc(db, "appointments", slotDocId);

  const appointment: Appointment = {
    ...data,
    id: slotDocId,
    status: "confirmed",
    createdAt: new Date().toISOString()
  };

  // 1. Grava o agendamento no Firestore
  await setDoc(slotRef, appointment);

  // 2. Atualiza a ficha da cliente de forma não-bloqueante
  try {
    const normalizedPhone = data.clientPhone.replace(/\D/g, "");
    if (normalizedPhone) {
      const clientRef = doc(db, "clients", normalizedPhone);
      await setDoc(
        clientRef,
        {
          id: normalizedPhone,
          name: data.clientName,
          phone: normalizedPhone,
          lastVisitDate: data.date,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("Aviso ao atualizar ficha da cliente:", err);
  }

  return slotDocId;
}

export async function updateAppointmentStatus(
  id: string,
  status: Appointment["status"],
  paymentMethod?: "pix" | "cartao" | "dinheiro"
) {
  const docRef = doc(db, "appointments", id);
  const updateData: Partial<Appointment> = { status };
  if (paymentMethod) {
    updateData.paymentMethod = paymentMethod;
  }
  await updateDoc(docRef, updateData);
}

export async function completeAppointmentWithPayment(
  appointment: Appointment,
  paymentMethod: "pix" | "cartao" | "dinheiro"
) {
  // 1. Atualiza agendamento para completed
  await updateAppointmentStatus(appointment.id, "completed", paymentMethod);

  // 2. Lança automaticamente entrada no caixa
  const transCol = collection(db, "transactions");
  const transDoc = doc(transCol);
  const transaction: Transaction = {
    id: transDoc.id,
    appointmentId: appointment.id,
    date: appointment.date,
    type: "income",
    amount: appointment.totalPrice,
    category: "servico",
    paymentMethod,
    description: `${appointment.serviceTitle} - ${appointment.clientName}`
  };
  await setDoc(transDoc, transaction);
}

// ==========================================
// 4. CLIENTES & CRM
// ==========================================
export function subscribeClients(callback: (clients: ClientProfile[]) => void) {
  const colRef = collection(db, "clients");
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ClientProfile[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as ClientProfile));
      callback(list);
    },
    (err) => {
      console.warn("Erro ao ouvir clientes:", err);
      callback([]);
    }
  );
}

export async function updateClientProfile(id: string, profile: Partial<ClientProfile>) {
  const docRef = doc(db, "clients", id);
  await setDoc(docRef, profile, { merge: true });
}

// ==========================================
// 5. TRANSAÇÕES / FINANCEIRO
// ==========================================
export function subscribeTransactions(callback: (transactions: Transaction[]) => void) {
  const colRef = collection(db, "transactions");
  const q = query(colRef, orderBy("date", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Transaction));
      callback(list);
    },
    (err) => {
      console.warn("Erro ao ouvir transações:", err);
      callback([]);
    }
  );
}

export async function addTransaction(transaction: Omit<Transaction, "id">) {
  const colRef = collection(db, "transactions");
  const docRef = doc(colRef);
  await setDoc(docRef, { ...transaction, id: docRef.id });
}
