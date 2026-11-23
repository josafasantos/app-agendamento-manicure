import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  CheckCircle2,
  Phone,
  User,
  ArrowRight,
  DollarSign,
  Scissors,
  Plus,
  MessageSquare,
  RotateCcw,
  Ban
} from "lucide-react";
import { formatCurrency, formatPhone } from "./lib/utils";
import type { Service, Appointment, ClientProfile } from "./types";

// Dados iniciais de demonstração (serão sincronizados com o Firestore)
const INITIAL_SERVICES: Service[] = [
  {
    id: "serv-1",
    title: "Alongamento em Fibra de Vidro",
    description: "Aplicação completa com cutilagem e esmaltação básica",
    price: 160,
    durationMinutes: 120,
    category: "alongamento",
    active: true,
  },
  {
    id: "serv-2",
    title: "Manutenção de Alongamento (Gel/Fibra)",
    description: "Nivelamento, troca de formato e esmaltação",
    price: 110,
    durationMinutes: 90,
    category: "manutencao",
    active: true,
  },
  {
    id: "serv-3",
    title: "Banho de Gel na Unha Natural",
    description: "Fortalecimento com camada protetora de gel",
    price: 90,
    durationMinutes: 75,
    category: "natural",
    active: true,
  },
  {
    id: "serv-4",
    title: "Cutilagem & Esmaltação Tradicional (Mão)",
    description: "Cuidado clássico completo com hidratação",
    price: 45,
    durationMinutes: 45,
    category: "natural",
    active: true,
  },
  {
    id: "serv-5",
    title: "Nail Art / Francesinha Especial",
    description: "Decoração artística manual ou encapsulada",
    price: 25,
    durationMinutes: 20,
    category: "adicional",
    active: true,
  },
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "app-1",
    clientName: "Camila Ribeiro",
    clientPhone: "11987654321",
    serviceId: "serv-2",
    serviceTitle: "Manutenção de Alongamento",
    totalPrice: 110,
    totalDurationMinutes: 90,
    date: "Hoje",
    startTime: "09:00",
    endTime: "10:30",
    status: "completed",
    paymentMethod: "pix",
    createdAt: new Date().toISOString(),
  },
  {
    id: "app-2",
    clientName: "Juliana Mendes",
    clientPhone: "11976543210",
    serviceId: "serv-1",
    serviceTitle: "Alongamento em Fibra de Vidro",
    totalPrice: 160,
    totalDurationMinutes: 120,
    date: "Hoje",
    startTime: "11:00",
    endTime: "13:00",
    status: "in_progress",
    createdAt: new Date().toISOString(),
  },
  {
    id: "app-3",
    clientName: "Mariana Costa",
    clientPhone: "11965432109",
    serviceId: "serv-4",
    serviceTitle: "Cutilagem & Esmaltação",
    totalPrice: 45,
    totalDurationMinutes: 45,
    date: "Hoje",
    startTime: "14:30",
    endTime: "15:15",
    status: "confirmed",
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_RETENTIONS: ClientProfile[] = [
  {
    id: "cli-1",
    name: "Beatriz Oliveira",
    phone: "11954321098",
    nailShape: "amendoada",
    favoriteColors: "Vermelho cereja, Nude clássico",
    allergies: "Nenhuma conhecida",
    totalVisits: 6,
    lastVisitDate: "Há 19 dias",
    nextRecommendedMaintenance: "Retorno previsto: Esta semana",
  },
  {
    id: "cli-2",
    name: "Larissa Souza",
    phone: "11943210987",
    nailShape: "quadrada",
    favoriteColors: "Francesinha branca, Tons pastel",
    totalVisits: 4,
    lastVisitDate: "Há 23 dias",
    nextRecommendedMaintenance: "Atrasada: Há 3 dias",
  },
];

export default function App() {
  const [viewMode, setViewMode] = useState<"client" | "admin">("client");

  // Estado do fluxo da cliente
  const [selectedServices, setSelectedServices] = useState<string[]>(["serv-2"]);
  const [selectedDate, setSelectedDate] = useState("2026-11-24");
  const [selectedTime, setSelectedTime] = useState("14:00");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Totais do serviço selecionado
  const activeServices = INITIAL_SERVICES.filter((s) => selectedServices.includes(s.id));
  const totalPrice = activeServices.reduce((acc, curr) => acc + curr.price, 0);
  const totalDuration = activeServices.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter((s) => s !== id));
      }
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone) return;
    setBookingConfirmed(true);
  };

  const openWhatsAppConfirmation = () => {
    const serviceNames = activeServices.map((s) => s.title).join(" + ");
    const text = encodeURIComponent(
      `Olá! Meu nome é ${clientName}. Acabei de agendar pelo seu app:\n💅 *Serviço:* ${serviceNames}\n📅 *Data:* ${selectedDate}\n⏰ *Horário:* ${selectedTime}\n💰 *Valor:* ${formatCurrency(totalPrice)}\n\nAguardo a confirmação!`
    );
    window.open(`https://wa.me/5511999999999?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-rose-50/40 text-slate-800 pb-12">
      {/* Barra de Navegação Superior */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-rose-100 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-rose-200 shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">Studio Nails</h1>
              <p className="text-xs text-rose-600 font-medium">Nail Design & Agendamento</p>
            </div>
          </div>

          {/* Seletor de Modo (Cliente vs Manicure) */}
          <div className="flex bg-rose-100/60 p-1 rounded-full text-xs font-semibold">
            <button
              onClick={() => {
                setViewMode("client");
                setBookingConfirmed(false);
              }}
              className={`px-3 py-1.5 rounded-full transition-all ${
                viewMode === "client" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Visão Cliente
            </button>
            <button
              onClick={() => setViewMode("admin")}
              className={`px-3 py-1.5 rounded-full transition-all ${
                viewMode === "admin" ? "bg-rose-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Painel Manicure
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-4xl mx-auto px-4 pt-6">
        {viewMode === "client" ? (
          /* ============================================================ */
          /* MÓDULO 1: VISÃO DA CLIENTE (AGENDAMENTO RÁPIDO)              */
          /* ============================================================ */
          <div className="space-y-6">
            {!bookingConfirmed ? (
              <>
                <div className="bg-linear-to-r from-rose-500 to-pink-500 rounded-3xl p-6 text-white shadow-lg shadow-rose-500/20">
                  <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium mb-3">
                    Horários em Tempo Real
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight">Agende seu horário com carinho</h2>
                  <p className="text-rose-100 text-sm mt-1">
                    Escolha os procedimentos desejados abaixo e selecione a melhor data para suas unhas.
                  </p>
                </div>

                <form onSubmit={handleBooking} className="space-y-6">
                  {/* Passo 1: Escolha dos Procedimentos */}
                  <section className="bg-white rounded-2xl p-5 border border-rose-100/80 shadow-xs">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                      <Scissors className="w-5 h-5 text-rose-500" />
                      1. Selecione o(s) Procedimento(s)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {INITIAL_SERVICES.map((service) => {
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
                            <div className="space-y-1">
                              <h4 className="font-semibold text-sm text-slate-900">{service.title}</h4>
                              <p className="text-xs text-slate-500">{service.description}</p>
                              <div className="flex items-center gap-2 text-xs text-rose-600 font-medium pt-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{service.durationMinutes} min</span>
                              </div>
                            </div>
                            <div className="text-right">
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

                    {/* Resumo Dinâmico do Procedimento */}
                    <div className="mt-4 p-3 bg-rose-50/70 rounded-xl flex items-center justify-between text-xs text-rose-950 font-medium">
                      <span>
                        Duração total estimada: <strong>{totalDuration} minutos</strong>
                      </span>
                      <span>
                        Valor total: <strong className="text-sm text-rose-600">{formatCurrency(totalPrice)}</strong>
                      </span>
                    </div>
                  </section>

                  {/* Passo 2: Data e Horário */}
                  <section className="bg-white rounded-2xl p-5 border border-rose-100/80 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-rose-500" />
                      2. Escolha o Dia e Horário
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data do Atendimento</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Horários Disponíveis (compatíveis com {totalDuration} min)
                      </label>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {["09:00", "10:30", "14:00", "15:30", "17:00", "18:30"].map((time) => {
                          const isSelected = selectedTime === time;
                          return (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setSelectedTime(time)}
                              className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                                isSelected
                                  ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-rose-300"
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  {/* Passo 3: Dados de Identificação */}
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
                          placeholder="Ex: (11) 99999-9999"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Botão de Confirmação */}
                  <button
                    type="submit"
                    className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  >
                    Confirmar Agendamento
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </>
            ) : (
              /* Tela de Sucesso */
              <div className="bg-white rounded-3xl p-8 border border-rose-100 shadow-sm text-center max-w-md mx-auto space-y-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Agendamento Realizado!</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Obrigada, <strong>{clientName}</strong>! Seu horário está pré-reservado.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl text-left text-xs space-y-2 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Procedimento:</span>
                    <span className="font-semibold text-slate-800">
                      {activeServices.map((s) => s.title).join(" + ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data e Hora:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedDate} às {selectedTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valor Estimado:</span>
                    <span className="font-semibold text-rose-600">{formatCurrency(totalPrice)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={openWhatsAppConfirmation}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Enviar Confirmação no WhatsApp
                  </button>
                  <button
                    onClick={() => setBookingConfirmed(false)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs transition-all"
                  >
                    Fazer Outro Agendamento
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* MÓDULO 2: PAINEL DE GESTÃO DA MANICURE (ADMIN)               */
          /* ============================================================ */
          <div className="space-y-6">
            {/* Cards de Métricas do Dia */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span>Atendimentos Hoje</span>
                  <CalendarIcon className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900">3 clientes</p>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">1 em atendimento</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span>Previsão de Caixa</span>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(315)}</p>
                <p className="text-[11px] text-slate-500 mt-1">R$ 110 já recebido via PIX</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span>Ciclo de Retorno</span>
                  <RotateCcw className="w-4 h-4 text-pink-500" />
                </div>
                <p className="text-2xl font-bold text-rose-600">2 para avisar</p>
                <p className="text-[11px] text-slate-500 mt-1">Manutenção de 15 a 21 dias</p>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex flex-wrap gap-2">
              <button className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all">
                <Plus className="w-4 h-4" /> Encaixe Manual
              </button>
              <button className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all">
                <Ban className="w-4 h-4 text-slate-400" /> Bloquear Horário
              </button>
            </div>

            {/* Agenda do Dia */}
            <section className="bg-white rounded-2xl p-5 border border-rose-100/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-500" />
                  Agenda de Hoje (Timeline)
                </h3>
                <span className="text-xs text-rose-600 font-medium">Tempo real ativo</span>
              </div>

              <div className="space-y-3">
                {INITIAL_APPOINTMENTS.map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-rose-200 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="px-2.5 py-1.5 bg-rose-100/70 text-rose-800 rounded-lg text-xs font-bold text-center min-w-[65px]">
                        {app.startTime}
                        <span className="block text-[10px] font-normal text-slate-500">{app.endTime}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{app.clientName}</h4>
                        <p className="text-xs text-slate-600">{app.serviceTitle}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{formatPhone(app.clientPhone)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900">{formatCurrency(app.totalPrice)}</span>
                        <span
                          className={`block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full mt-0.5 ${
                            app.status === "completed"
                              ? "bg-slate-200 text-slate-700"
                              : app.status === "in_progress"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {app.status === "completed"
                            ? "Concluído"
                            : app.status === "in_progress"
                            ? "Na Bancada"
                            : "Confirmado"}
                        </span>
                      </div>

                      <a
                        href={`https://wa.me/55${app.clientPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-all"
                        title="Chamar no WhatsApp"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Ciclo de Retorno Inteligente (Clientes para Reativar) */}
            <section className="bg-white rounded-2xl p-5 border border-rose-100/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-pink-500" />
                  Alerta de Retorno (15–21 dias)
                </h3>
                <span className="text-xs text-slate-500">Recorrência ativa</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Clientes que realizaram procedimentos em gel/fibra e estão na janela ideal de manutenção para não
                danificar a unha natural.
              </p>

              <div className="space-y-3">
                {INITIAL_RETENTIONS.map((client) => (
                  <div
                    key={client.id}
                    className="p-3.5 rounded-xl border border-pink-100 bg-pink-50/30 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{client.name}</h4>
                      <p className="text-xs text-slate-600">
                        Formato: <span className="font-medium">{client.nailShape}</span> • Última visita:{" "}
                        <span className="font-medium">{client.lastVisitDate}</span>
                      </p>
                      <p className="text-[11px] text-pink-700 font-semibold mt-0.5">
                        {client.nextRecommendedMaintenance}
                      </p>
                    </div>

                    <a
                      href={`https://wa.me/55${client.phone}?text=Olá%20${encodeURIComponent(
                        client.name
                      )}!%20Passando%20para%20lembrar%20que%20está%20na%20hora%20da%20sua%20manutenção%20de%20unhas.%20Quer%20garantir%20seu%20horário?`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Avisar
                    </a>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
