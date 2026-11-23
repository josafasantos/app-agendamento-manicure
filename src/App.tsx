import { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  CheckCircle2,
  Phone,
  User,
  ArrowRight,
  Scissors,
  Plus,
  MessageSquare,
  RotateCcw,
  Ban,
  Lock,
  LogOut,
  ArrowLeft,
  Settings as SettingsIcon,
  Users,
  Wallet,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  Edit2,
  UserPlus
} from "lucide-react";
import { formatCurrency, formatPhone } from "./lib/utils";
import type { Service, Appointment, ClientProfile, StudioSettings, Transaction } from "./types";
import { InstallPrompt } from "./components/InstallPrompt";
import { LoginModal } from "./components/LoginModal";
import { CompleteAppointmentModal } from "./components/CompleteAppointmentModal";
import { ManualAppointmentModal } from "./components/ManualAppointmentModal";
import { ExpenseModal } from "./components/ExpenseModal";
import { ClientDetailModal } from "./components/ClientDetailModal";
import { ServiceModal } from "./components/ServiceModal";
import { SettingsModal } from "./components/SettingsModal";
import { AddStaffModal } from "./components/AddStaffModal";
import { auth } from "./lib/firebase";
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import {
  subscribeServices,
  subscribeSettings,
  subscribeAppointments,
  subscribeClients,
  subscribeTransactions,
  createAppointment,
  updateAppointmentStatus,
  DEFAULT_SETTINGS
} from "./services/firestoreService";

export default function App() {
  // Autenticação e Visão
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"client" | "admin">("client");
  const [adminTab, setAdminTab] = useState<"agenda" | "clients" | "finance" | "settings">("agenda");

  // Dados sincronizados em Tempo Real com Firestore
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Estados dos Modais
  const [activeAppointmentForComplete, setActiveAppointmentForComplete] = useState<Appointment | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualInitialMode, setManualInitialMode] = useState<"appointment" | "block">("appointment");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [activeClientForDetail, setActiveClientForDetail] = useState<ClientProfile | null>(null);
  const [activeServiceForEdit, setActiveServiceForEdit] = useState<Service | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);

  // Filtro de Data no Painel da Manicure
  const todayStr = new Date().toISOString().split("T")[0];
  const [adminSelectedDate, setAdminSelectedDate] = useState(todayStr);

  // Estado do fluxo da cliente
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [clientDate, setClientDate] = useState(todayStr);
  const [clientTime, setClientTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [lastBookedAppointment, setLastBookedAppointment] = useState<{
    date: string;
    time: string;
    servicesText: string;
    totalPrice: number;
  } | null>(null);

  // 1. Ouvintes do Firebase
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user && viewMode === "admin") {
        setViewMode("client");
      }
    });

    const unsubServices = subscribeServices((list) => {
      setServices(list);
      if (selectedServices.length === 0 && list.length > 0) {
        setSelectedServices([list[0].id]);
      }
    });

    const unsubSettings = subscribeSettings(setSettings);
    const unsubClients = subscribeClients(setClients);
    const unsubTransactions = subscribeTransactions(setTransactions);
    const unsubAppointments = subscribeAppointments(null, setAppointments);

    return () => {
      unsubAuth();
      unsubServices();
      unsubSettings();
      unsubClients();
      unsubTransactions();
      unsubAppointments();
    };
  }, [viewMode]);

  // Cálculos do serviço selecionado pela cliente
  const activeSelectedServices = useMemo(() => {
    return services.filter((s) => selectedServices.includes(s.id));
  }, [services, selectedServices]);

  const totalPrice = useMemo(() => {
    return activeSelectedServices.reduce((acc, curr) => acc + curr.price, 0);
  }, [activeSelectedServices]);

  const totalDuration = useMemo(() => {
    return activeSelectedServices.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  }, [activeSelectedServices]);

  // Alterna seleção de múltiplos procedimentos
  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter((s) => s !== id));
      }
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  // 2. Geração Dinâmica de Horários Livres (sem conflito)
  const availableSlots = useMemo(() => {
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

    // Agendamentos ocupados no dia
    const dayAppointments = appointments.filter(
      (a) => a.date === clientDate && a.status !== "cancelled"
    );

    const stepMinutes = 30;
    const totalSlotNeeded = totalDuration + (settings.bufferMinutes || 10);

    for (let cur = dayStartMinutes; cur + totalDuration <= dayEndMinutes; cur += stepMinutes) {
      const curEnd = cur + totalSlotNeeded;

      // Verifica conflito com almoço
      if (lunchStartMin > 0 && lunchEndMin > 0) {
        if (!(curEnd <= lunchStartMin || cur >= lunchEndMin)) {
          continue;
        }
      }

      // Verifica colisão com agendamentos existentes
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
  }, [clientDate, totalDuration, settings, appointments]);

  // Define horário padrão se o atual não estiver mais disponível
  useEffect(() => {
    if (availableSlots.length > 0 && !availableSlots.includes(clientTime)) {
      setClientTime(availableSlots[0]);
    }
  }, [availableSlots, clientTime]);

  // Submissão do Agendamento pela Cliente
  const handleClientBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !clientTime) return;

    setIsBookingLoading(true);
    setBookingError("");

    try {
      const [h, m] = clientTime.split(":").map(Number);
      const endTotalMin = h * 60 + m + totalDuration;
      const endHStr = String(Math.floor(endTotalMin / 60)).padStart(2, "0");
      const endMStr = String(endTotalMin % 60).padStart(2, "0");

      const servicesText = activeSelectedServices.map((s) => s.title).join(" + ");

      await createAppointment({
        clientName,
        clientPhone,
        serviceId: activeSelectedServices.map((s) => s.id).join(","),
        serviceTitle: servicesText,
        totalPrice,
        totalDurationMinutes: totalDuration,
        date: clientDate,
        startTime: clientTime,
        endTime: `${endHStr}:${endMStr}`,
        notes: clientNotes
      });

      setLastBookedAppointment({
        date: clientDate,
        time: clientTime,
        servicesText,
        totalPrice
      });

      setIsBookingLoading(false);
      setBookingConfirmed(true);
    } catch (err: unknown) {
      setIsBookingLoading(false);
      const e = err as { message?: string };
      setBookingError(e.message || "Erro ao confirmar agendamento. Tente outro horário.");
    }
  };

  // Links Rápidos de Confirmação da Cliente
  const openWhatsAppConfirmation = () => {
    if (!lastBookedAppointment) return;
    const text = encodeURIComponent(
      `Olá! Meu nome é ${clientName}. Acabei de agendar pelo seu app:\n💅 *Serviço:* ${lastBookedAppointment.servicesText}\n📅 *Data:* ${lastBookedAppointment.date}\n⏰ *Horário:* ${lastBookedAppointment.time}\n💰 *Valor:* ${formatCurrency(lastBookedAppointment.totalPrice)}\n\nAguardo a confirmação! 😊`
    );
    window.open(`https://wa.me/55${settings.phone}?text=${text}`, "_blank");
  };

  const getGoogleCalendarUrl = () => {
    if (!lastBookedAppointment) return "#";
    const startIso = `${lastBookedAppointment.date.replace(/-/g, "")}T${lastBookedAppointment.time.replace(":", "")}00`;
    const title = encodeURIComponent(`Unha: ${lastBookedAppointment.servicesText} - ${settings.studioName}`);
    const details = encodeURIComponent(`Atendimento com ${settings.ownerName}. Endereço: ${settings.address}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${startIso}&details=${details}&location=${encodeURIComponent(settings.address)}`;
  };

  // Filtragem de Agendamentos no Painel da Manicure
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === adminSelectedDate);
  }, [appointments, adminSelectedDate]);

  // Cálculos Financeiros
  const financeMetrics = useMemo(() => {
    const todayTrans = transactions.filter((t) => t.date === todayStr);
    const todayIncome = todayTrans
      .filter((t) => t.type === "income")
      .reduce((acc, curr) => acc + curr.amount, 0);

    const monthIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((acc, curr) => acc + curr.amount, 0);

    const monthExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((acc, curr) => acc + curr.amount, 0);

    const pixTotal = transactions
      .filter((t) => t.paymentMethod === "pix" && t.type === "income")
      .reduce((acc, curr) => acc + curr.amount, 0);

    const cardTotal = transactions
      .filter((t) => t.paymentMethod === "cartao" && t.type === "income")
      .reduce((acc, curr) => acc + curr.amount, 0);

    const cashTotal = transactions
      .filter((t) => t.paymentMethod === "dinheiro" && t.type === "income")
      .reduce((acc, curr) => acc + curr.amount, 0);

    return {
      todayIncome,
      monthIncome,
      monthExpense,
      netProfit: monthIncome - monthExpense,
      pixTotal,
      cardTotal,
      cashTotal
    };
  }, [transactions, todayStr]);

  // Clientes para Alerta de Retorno (15 a 21 dias)
  const maintenanceAlertClients = useMemo(() => {
    const today = new Date();
    return clients.filter((c) => {
      if (!c.lastVisitDate) return false;
      const last = new Date(c.lastVisitDate + "T12:00:00");
      const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= (settings.maintenanceCycleDays - 5);
    });
  }, [clients, settings.maintenanceCycleDays]);

  return (
    <div className="min-h-screen bg-rose-50/40 text-slate-800 pb-16">
      {/* ============================================================ */}
      {/* BARRA SUPERIOR DE NAVEGAÇÃO                                   */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-rose-100 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-rose-200 shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">{settings.studioName}</h1>
              <p className="text-xs text-rose-600 font-medium">Por {settings.ownerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <InstallPrompt />

            {!currentUser ? (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-full text-xs font-semibold border border-slate-200 hover:border-rose-200 transition-all shadow-xs"
                title="Acesso da manicure"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Área da Manicure</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                {viewMode === "client" ? (
                  <button
                    onClick={() => setViewMode("admin")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-xs font-bold shadow-xs transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Meu Painel</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setViewMode("client")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-xs font-semibold transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Ver Agendamento</span>
                  </button>
                )}

                <button
                  onClick={async () => {
                    await signOut(auth);
                    setViewMode("client");
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                  title="Sair do painel"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* CONTEÚDO PRINCIPAL                                           */}
      {/* ============================================================ */}
      <main className="max-w-4xl mx-auto px-4 pt-6">
        {viewMode === "client" ? (
          /* ============================================================ */
          /* MÓDULO 1: VISÃO DA CLIENTE (AGENDAMENTO ONLINE)              */
          /* ============================================================ */
          <div className="space-y-6">
            {!bookingConfirmed ? (
              <>
                <div className="bg-linear-to-r from-rose-500 to-pink-500 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-rose-500/20">
                  <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium mb-3">
                    Agendamento em Tempo Real
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Suas unhas impecáveis</h2>
                  <p className="text-rose-100 text-sm mt-1 max-w-lg">
                    Escolha seus procedimentos abaixo e reserve seu horário com facilidade. Sem filas e sem espera no WhatsApp.
                  </p>
                </div>

                {bookingError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold">
                    {bookingError}
                  </div>
                )}

                <form onSubmit={handleClientBooking} className="space-y-6">
                  {/* Passo 1: Catálogo de Procedimentos */}
                  <section className="bg-white rounded-2xl p-5 border border-rose-100/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-rose-500" />
                        1. Selecione os Procedimentos
                      </h3>
                      <span className="text-xs text-rose-600 font-medium">Combine opcionais</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {services.filter((s) => s.active).map((service) => {
                        const isSelected = selectedServices.includes(service.id);
                        return (
                          <div
                            key={service.id}
                            onClick={() => toggleService(service.id)}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-start ${
                              isSelected
                                ? "border-rose-500 bg-rose-50/50"
                                : "border-slate-100 hover:border-rose-200 bg-white"
                            }`}
                          >
                            <div className="space-y-1 pr-2">
                              <h4 className="font-semibold text-sm text-slate-900">{service.title}</h4>
                              {service.description && (
                                <p className="text-xs text-slate-500 leading-relaxed">{service.description}</p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-rose-600 font-medium pt-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{service.durationMinutes} min</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-slate-900 text-sm">
                                {formatCurrency(service.price)}
                              </span>
                              <div
                                className={`w-5 h-5 rounded-full mt-2 ml-auto flex items-center justify-center ${
                                  isSelected ? "bg-rose-500 text-white" : "border border-slate-300"
                                }`}
                              >
                                {isSelected && <CheckCircle2 className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 p-3.5 bg-rose-50/70 rounded-xl flex items-center justify-between text-xs text-rose-950 font-medium">
                      <span>
                        Duração combinada: <strong>{totalDuration} minutos</strong>
                      </span>
                      <span>
                        Valor total: <strong className="text-sm text-rose-600">{formatCurrency(totalPrice)}</strong>
                      </span>
                    </div>
                  </section>

                  {/* Passo 2: Seletor de Data e Horário em Tempo Real */}
                  <section className="bg-white rounded-2xl p-5 border border-rose-100/80 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-rose-500" />
                      2. Escolha o Dia e Horário Disponível
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data do Atendimento</label>
                      <input
                        type="date"
                        min={todayStr}
                        value={clientDate}
                        onChange={(e) => setClientDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Horários Livres (calculados para {totalDuration} min de atendimento)
                      </label>
                      {availableSlots.length > 0 ? (
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {availableSlots.map((time) => {
                            const isSelected = clientTime === time;
                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={() => setClientTime(time)}
                                className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                                  isSelected
                                    ? "bg-rose-500 text-white border-rose-500 shadow-xs scale-102"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-rose-300"
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-xs text-center">
                          Nenhum horário livre com duração de {totalDuration} min nesta data. Selecione outro dia acima.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Passo 3: Identificação Rápida */}
                  <section className="bg-white rounded-2xl p-5 border border-rose-100/80 shadow-xs space-y-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-rose-500" />
                      3. Seus Dados de Contato
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Seu Nome Completo</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Maria Eduarda"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">WhatsApp com DDD</label>
                        <input
                          type="tel"
                          required
                          placeholder="Ex: 11999999999"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Observações ou Alergias (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Alergia a algum esmalte, unha roída, etc."
                        value={clientNotes}
                        onChange={(e) => setClientNotes(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </section>

                  <button
                    type="submit"
                    disabled={isBookingLoading || availableSlots.length === 0}
                    className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  >
                    {isBookingLoading ? (
                      <span>Gravando Agendamento...</span>
                    ) : (
                      <>
                        <span>Confirmar Agendamento</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* Tela de Sucesso Completa */
              <div className="bg-white rounded-3xl p-8 border border-rose-100 shadow-sm text-center max-w-md mx-auto space-y-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Agendamento Confirmado!</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Obrigada, <strong>{clientName}</strong>! Seu horário foi salvo no sistema.
                  </p>
                </div>

                {lastBookedAppointment && (
                  <div className="bg-slate-50 p-4 rounded-2xl text-left text-xs space-y-2 border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Procedimento:</span>
                      <span className="font-semibold text-slate-800">{lastBookedAppointment.servicesText}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Data e Hora:</span>
                      <span className="font-semibold text-slate-800">
                        {lastBookedAppointment.date} às {lastBookedAppointment.time}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Local:</span>
                      <span className="font-semibold text-slate-800">{settings.address}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-700 font-bold">Valor Estimado:</span>
                      <span className="font-bold text-rose-600">
                        {formatCurrency(lastBookedAppointment.totalPrice)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  <button
                    onClick={openWhatsAppConfirmation}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-xs"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Avisar Manicure no WhatsApp
                  </button>

                  <a
                    href={getGoogleCalendarUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all text-xs"
                  >
                    <CalendarIcon className="w-4 h-4 text-blue-500" />
                    Adicionar ao Google Agenda
                  </a>

                  <button
                    onClick={() => {
                      setBookingConfirmed(false);
                      setClientName("");
                      setClientPhone("");
                      setClientNotes("");
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl text-xs transition-all"
                  >
                    Fazer Outro Agendamento
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : !currentUser ? (
          /* ============================================================ */
          /* TRAVA DE SEGURANÇA: NÃO AUTENTICADA                         */
          /* ============================================================ */
          <div className="bg-white rounded-3xl p-8 border border-rose-100 shadow-sm text-center max-w-md mx-auto space-y-4 mt-8">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Acesso Restrito</h2>
            <p className="text-xs text-slate-600">
              O Painel de Gestão e a agenda do estúdio são de acesso exclusivo da manicure autenticada.
            </p>
            <div className="pt-2 space-y-2">
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-200 transition-all"
              >
                Fazer Login da Manicure
              </button>
              <button
                onClick={() => setViewMode("client")}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all"
              >
                Voltar para Agendamentos
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* MÓDULO 2: PAINEL ADMINISTRATIVO DA MANICURE (COMPLETO)       */
          /* ============================================================ */
          <div className="space-y-6">
            {/* Abas do Painel */}
            <div className="flex bg-white p-1 rounded-2xl border border-rose-100 shadow-xs text-xs font-bold overflow-x-auto">
              <button
                onClick={() => setAdminTab("agenda")}
                className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  adminTab === "agenda" ? "bg-rose-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Agenda Diária</span>
              </button>

              <button
                onClick={() => setAdminTab("clients")}
                className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  adminTab === "clients" ? "bg-rose-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Clientes & Retorno</span>
              </button>

              <button
                onClick={() => setAdminTab("finance")}
                className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  adminTab === "finance" ? "bg-rose-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Caixa & Gastos</span>
              </button>

              <button
                onClick={() => setAdminTab("settings")}
                className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  adminTab === "settings" ? "bg-rose-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <SettingsIcon className="w-3.5 h-3.5" />
                <span>Estúdio & Serviços</span>
              </button>
            </div>

            {/* ABA 1: AGENDA DIÁRIA */}
            {adminTab === "agenda" && (
              <div className="space-y-5">
                {/* Métricas do Topo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
                    <span className="text-slate-500 text-xs">Hoje na Agenda</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {appointments.filter((a) => a.date === todayStr && a.status !== "cancelled").length} clientes
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium">Tempo real ativo</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
                    <span className="text-slate-500 text-xs">Receita Hoje</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formatCurrency(financeMetrics.todayIncome)}
                    </p>
                    <p className="text-[11px] text-slate-500">Lançado no caixa</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
                    <span className="text-slate-500 text-xs">Alertas de Retorno</span>
                    <p className="text-2xl font-bold text-rose-600 mt-1">
                      {maintenanceAlertClients.length} para chamar
                    </p>
                    <p className="text-[11px] text-slate-500">Janela de 15 a 21 dias</p>
                  </div>
                </div>

                {/* Filtro de Data e Ações Rápidas */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold text-slate-700">Ver Agenda:</span>
                    <input
                      type="date"
                      value={adminSelectedDate}
                      onChange={(e) => setAdminSelectedDate(e.target.value)}
                      className="p-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                    />
                    {adminSelectedDate !== todayStr && (
                      <button
                        onClick={() => setAdminSelectedDate(todayStr)}
                        className="text-[11px] text-rose-600 underline font-medium"
                      >
                        Voltar para Hoje
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setManualInitialMode("appointment");
                        setIsManualModalOpen(true);
                      }}
                      className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Encaixe Manual
                    </button>
                    <button
                      onClick={() => {
                        setManualInitialMode("block");
                        setIsManualModalOpen(true);
                      }}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Ban className="w-3.5 h-3.5 text-slate-400" /> Bloquear Horário
                    </button>
                  </div>
                </div>

                {/* Lista da Agenda */}
                <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-500" />
                    Horários Marcados para {adminSelectedDate}
                  </h3>

                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((app) => (
                      <div
                        key={app.id}
                        className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-rose-200 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="px-2.5 py-1.5 bg-rose-100/70 text-rose-800 rounded-lg text-xs font-bold text-center min-w-[70px]">
                            {app.startTime}
                            <span className="block text-[10px] font-normal text-slate-500">{app.endTime}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{app.clientName}</h4>
                            <p className="text-xs text-slate-600">{app.serviceTitle}</p>
                            {app.clientPhone && app.clientPhone !== "00000000000" && (
                              <p className="text-[11px] text-slate-400 mt-0.5">{formatPhone(app.clientPhone)}</p>
                            )}
                            {app.notes && (
                              <p className="text-[11px] text-amber-700 font-medium mt-1">Obs: {app.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="text-right mr-2">
                            {app.totalPrice > 0 && (
                              <span className="text-xs font-bold text-slate-900 block">
                                {formatCurrency(app.totalPrice)}
                              </span>
                            )}
                            <span
                              className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full mt-0.5 ${
                                app.status === "completed"
                                  ? "bg-slate-200 text-slate-700"
                                  : app.status === "in_progress"
                                  ? "bg-amber-100 text-amber-800"
                                  : app.status === "cancelled"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {app.status === "completed"
                                ? "Concluído"
                                : app.status === "in_progress"
                                ? "Na Bancada"
                                : app.status === "cancelled"
                                ? "Cancelado"
                                : "Confirmado"}
                            </span>
                          </div>

                          {/* Ações do Card */}
                          {app.status === "cancelled" && (
                            <button
                              onClick={() => updateAppointmentStatus(app.id, "confirmed")}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                              title="Desfazer cancelamento e reativar horário"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                              Desfazer
                            </button>
                          )}

                          {app.status === "completed" && (
                            <button
                              onClick={() => updateAppointmentStatus(app.id, "confirmed")}
                              className="px-2 py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                              title="Reabrir agendamento"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                              Reabrir
                            </button>
                          )}

                          {app.status !== "completed" && app.status !== "cancelled" && (
                            <>
                              <button
                                onClick={() => setActiveAppointmentForComplete(app)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                                title="Finalizar atendimento e registrar recebimento"
                              >
                                Concluir
                              </button>

                              <button
                                onClick={() => updateAppointmentStatus(app.id, "in_progress")}
                                className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-medium"
                                title="Marcar como em atendimento"
                              >
                                Atender
                              </button>

                              <button
                                onClick={() => updateAppointmentStatus(app.id, "cancelled")}
                                className="px-2 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium"
                                title="Cancelar horário"
                              >
                                Cancelar
                              </button>
                            </>
                          )}

                          {app.clientPhone && app.clientPhone !== "00000000000" && (
                            <a
                              href={`https://wa.me/55${app.clientPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-all"
                              title="Chamar no WhatsApp"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Nenhum agendamento para esta data. Clique em "Encaixe Manual" para adicionar.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ABA 2: CLIENTES & RETORNO */}
            {adminTab === "clients" && (
              <div className="space-y-5">
                {/* Alerta de Retorno Inteligente */}
                <section className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-pink-500" />
                      Alertas de Retorno (Ciclo de {settings.maintenanceCycleDays} dias)
                    </h3>
                    <span className="text-xs text-rose-600 font-semibold">
                      {maintenanceAlertClients.length} clientes na janela
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Clientes que realizaram manutenção ou alongamento há mais de {settings.maintenanceCycleDays - 5} dias.
                    Envie uma mensagem carinhosa para preencher sua agenda da semana!
                  </p>

                  <div className="space-y-2.5">
                    {maintenanceAlertClients.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl border border-pink-100 bg-pink-50/40 flex items-center justify-between"
                      >
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{c.name}</h4>
                          <p className="text-xs text-slate-600">
                            Última visita: <strong>{c.lastVisitDate}</strong> • Formato:{" "}
                            <span className="capitalize">{c.nailShape || "Natural"}</span>
                          </p>
                        </div>

                        <a
                          href={`https://wa.me/55${c.phone}?text=Olá%20${encodeURIComponent(
                            c.name
                          )}!%20Passando%20para%20lembrar%20que%20está%20na%20hora%20da%20sua%20manutenção%20de%20unhas.%20Quer%20garantir%20seu%20horário?`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Avisar no Zap</span>
                        </a>
                      </div>
                    ))}
                    {maintenanceAlertClients.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">
                        Nenhuma cliente com manutenção atrasada no momento. Parabéns!
                      </p>
                    )}
                  </div>
                </section>

                {/* Lista Completa de Clientes */}
                <section className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-rose-500" />
                    Ficha Técnica de Clientes ({clients.length})
                  </h3>

                  <div className="divide-y divide-slate-100">
                    {clients.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setActiveClientForDetail(c)}
                        className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded-xl transition-all"
                      >
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{c.name}</h4>
                          <p className="text-xs text-slate-500">
                            {formatPhone(c.phone)} • {c.totalVisits || 1} visitas • Formato:{" "}
                            <span className="capitalize">{c.nailShape || "Padrão"}</span>
                          </p>
                          {c.allergies && (
                            <p className="text-[11px] text-amber-600 font-medium">⚠️ {c.allergies}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="text-xs text-rose-600 font-semibold">Abrir Ficha</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                    {clients.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">
                        Nenhuma cliente registrada ainda. As fichas são geradas automaticamente a cada agendamento!
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* ABA 3: CAIXA & GASTOS */}
            {adminTab === "finance" && (
              <div className="space-y-5">
                {/* Indicadores Financeiros */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
                    <span className="text-slate-500 text-xs">Faturamento Mês</span>
                    <p className="text-xl font-bold text-emerald-600 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {formatCurrency(financeMetrics.monthIncome)}
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
                    <span className="text-slate-500 text-xs">Despesas Mês</span>
                    <p className="text-xl font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <TrendingDown className="w-4 h-4" />
                      {formatCurrency(financeMetrics.monthExpense)}
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
                    <span className="text-slate-500 text-xs">Lucro Líquido</span>
                    <p className="text-xl font-bold text-slate-900 mt-1">
                      {formatCurrency(financeMetrics.netProfit)}
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
                    <span className="text-slate-500 text-xs">Receita Hoje</span>
                    <p className="text-xl font-bold text-slate-900 mt-1">
                      {formatCurrency(financeMetrics.todayIncome)}
                    </p>
                  </div>
                </div>

                {/* Métodos de Pagamento */}
                <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex items-center justify-around text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total via PIX</span>
                    <strong className="text-slate-900 font-bold">{formatCurrency(financeMetrics.pixTotal)}</strong>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total via Cartão</span>
                    <strong className="text-slate-900 font-bold">{formatCurrency(financeMetrics.cardTotal)}</strong>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total em Dinheiro</span>
                    <strong className="text-slate-900 font-bold">{formatCurrency(financeMetrics.cashTotal)}</strong>
                  </div>
                </div>

                {/* Extrato e Botão de Nova Despesa */}
                <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-rose-500" />
                      Lançamentos do Caixa
                    </h3>
                    <button
                      onClick={() => setIsExpenseModalOpen(true)}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nova Despesa
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {transactions.map((t) => (
                      <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-900">{t.description}</p>
                          <p className="text-[11px] text-slate-400 capitalize">
                            {t.date} • {t.paymentMethod} • {t.category}
                          </p>
                        </div>
                        <span
                          className={`font-bold ${
                            t.type === "income" ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {t.type === "income" ? "+" : "-"} {formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                    {transactions.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">
                        Nenhuma transação lançada no caixa ainda.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 4: CONFIGURAÇÕES & CATÁLOGO */}
            {adminTab === "settings" && (
              <div className="space-y-5">
                {/* Dados Gerais do Estúdio */}
                <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <SettingsIcon className="w-4 h-4 text-rose-500" />
                      Dados do Estúdio & Expediente
                    </h3>
                    <button
                      onClick={() => setIsSettingsModalOpen(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar Configurações
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-500">Nome do Estúdio:</span>
                      <strong className="block text-slate-900">{settings.studioName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Manicure Responsável:</span>
                      <strong className="block text-slate-900">{settings.ownerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">WhatsApp de Notificações:</span>
                      <strong className="block text-slate-900">{formatPhone(settings.phone)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Endereço de Atendimento:</span>
                      <strong className="block text-slate-900">{settings.address}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Expediente Diário:</span>
                      <strong className="block text-slate-900">
                        {settings.dayStartTime} às {settings.dayEndTime} (Almoço: {settings.lunchStart || "12:00"} às {settings.lunchEnd || "13:00"})
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Intervalo entre Atendimentos:</span>
                      <strong className="block text-slate-900">{settings.bufferMinutes} minutos</strong>
                    </div>
                  </div>
                </div>

                {/* Gestão de Equipe & Acessos Restritos */}
                <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Users className="w-4 h-4 text-rose-500" />
                        Acessos da Manicure & Equipe
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Novos acessos ao painel são cadastrados exclusivamente por você aqui dentro
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddStaffModalOpen(true)}
                      className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-rose-200 transition-all self-start sm:self-auto cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Adicionar Profissional
                    </button>
                  </div>
                </div>

                {/* Catálogo de Serviços */}
                <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-rose-500" />
                      Catálogo de Procedimentos ({services.length})
                    </h3>
                    <button
                      onClick={() => {
                        setActiveServiceForEdit(null);
                        setIsServiceModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Novo Procedimento
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {services.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setActiveServiceForEdit(s);
                          setIsServiceModalOpen(true);
                        }}
                        className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-rose-200 cursor-pointer flex justify-between items-start transition-all"
                      >
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{s.title}</h4>
                          <p className="text-xs text-slate-500">{s.description || "Sem descrição"}</p>
                          <span className="text-[11px] text-rose-600 font-medium block mt-1">
                            {s.durationMinutes} min • Categoria: {s.category}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 text-sm block">
                            {formatCurrency(s.price)}
                          </span>
                          <span
                            className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full mt-1 ${
                              s.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {s.active ? "Ativo" : "Pausado"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* MODAIS DO SISTEMA                                            */}
      {/* ============================================================ */}

      {/* Modal de Conclusão de Atendimento */}
      {activeAppointmentForComplete && (
        <CompleteAppointmentModal
          appointment={activeAppointmentForComplete}
          isOpen={true}
          onClose={() => setActiveAppointmentForComplete(null)}
          onSuccess={() => setActiveAppointmentForComplete(null)}
        />
      )}

      {/* Modal de Encaixe Manual ou Bloqueio */}
      <ManualAppointmentModal
        services={services}
        defaultDate={adminSelectedDate}
        isOpen={isManualModalOpen}
        initialMode={manualInitialMode}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={() => setIsManualModalOpen(false)}
      />

      {/* Modal de Nova Despesa */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => setIsExpenseModalOpen(false)}
      />

      {/* Modal de Ficha Técnica da Cliente */}
      {activeClientForDetail && (
        <ClientDetailModal
          client={activeClientForDetail}
          isOpen={true}
          onClose={() => setActiveClientForDetail(null)}
          onSuccess={() => setActiveClientForDetail(null)}
        />
      )}

      {/* Modal de Cadastro/Edição de Serviço */}
      <ServiceModal
        service={activeServiceForEdit}
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onSuccess={() => setIsServiceModalOpen(false)}
      />

      {/* Modal de Configurações */}
      <SettingsModal
        settings={settings}
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSuccess={() => setIsSettingsModalOpen(false)}
      />

      {/* Modal de Novo Acesso de Equipe */}
      <AddStaffModal
        isOpen={isAddStaffModalOpen}
        onClose={() => setIsAddStaffModalOpen(false)}
      />

      {/* Modal de Login Protegido */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => setViewMode("admin")}
      />

      {/* Rodapé Institucional */}
      <footer className="mt-12 text-center text-xs text-slate-400">
        <p>© {settings.studioName} • Agendamento & Gestão de Manicure</p>
        {!currentUser && (
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="mt-1 text-slate-400 hover:text-rose-600 transition-colors underline text-[11px]"
          >
            Acesso da Manicure
          </button>
        )}
      </footer>
    </div>
  );
}
