import { useState } from "react";
import { Plus, Ban, X, Calendar, Clock, User, Phone, Loader2 } from "lucide-react";
import type { Service } from "../types";
import { createAppointment } from "../services/firestoreService";

interface ManualModalProps {
  services: Service[];
  defaultDate: string;
  isOpen: boolean;
  initialMode?: "appointment" | "block";
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualAppointmentModal({
  services,
  defaultDate,
  isOpen,
  initialMode = "appointment",
  onClose,
  onSuccess
}: ManualModalProps) {
  const [mode, setMode] = useState<"appointment" | "block">(initialMode);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || "");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:30");
  const [blockReason, setBlockReason] = useState("Horário de Almoço");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (mode === "appointment") {
        const s = services.find((serv) => serv.id === selectedServiceId) || services[0];
        // Calcula horário final baseado na duração
        const [h, m] = startTime.split(":").map(Number);
        const totalMinutes = h * 60 + m + (s ? s.durationMinutes : 60);
        const endH = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
        const endM = String(totalMinutes % 60).padStart(2, "0");

        await createAppointment({
          clientName,
          clientPhone,
          serviceId: s ? s.id : "manual",
          serviceTitle: s ? s.title : "Atendimento Manual",
          totalPrice: s ? s.price : 100,
          totalDurationMinutes: s ? s.durationMinutes : 60,
          date,
          startTime,
          endTime: `${endH}:${endM}`,
          notes: "Agendamento manual / encaixe"
        });
      } else {
        // Bloqueio de Horário
        await createAppointment({
          clientName: `Bloqueio: ${blockReason}`,
          clientPhone: "00000000000",
          serviceId: "bloqueio",
          serviceTitle: `Indisponível (${blockReason})`,
          totalPrice: 0,
          totalDurationMinutes: 60,
          date,
          startTime,
          endTime,
          notes: "Horário bloqueado pela manicure"
        });
      }

      setIsLoading(false);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setIsLoading(false);
      const e = err as { message?: string };
      setError(e.message || "Erro ao salvar na agenda.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-rose-100 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex bg-slate-100 p-1 rounded-full text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode("appointment")}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                mode === "appointment" ? "bg-white text-rose-600 shadow-xs" : "text-slate-600"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Encaixe Manual</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("block")}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                mode === "block" ? "bg-rose-500 text-white shadow-xs" : "text-slate-600"
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Bloquear Horário</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "appointment" ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome da Cliente</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ana Paula"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp da Cliente</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 11999999999"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Procedimento</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.durationMinutes} min - R$ {s.price})
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo do Bloqueio</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Horário de Almoço, Consulta Médica, Folga"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Início do Bloqueio</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fim do Bloqueio</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            {mode === "appointment" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Horário de Início</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2 text-xs"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === "appointment" ? (
              "Confirmar Encaixe na Agenda"
            ) : (
              "Confirmar Bloqueio"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
