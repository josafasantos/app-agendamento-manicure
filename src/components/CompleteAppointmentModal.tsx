import { useState } from "react";
import { CheckCircle2, DollarSign, RotateCcw, X, MessageSquare, Loader2 } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import type { Appointment } from "../types";
import { completeAppointmentWithPayment, createAppointment } from "../services/firestoreService";

interface CompleteModalProps {
  appointment: Appointment;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CompleteAppointmentModal({ appointment, isOpen, onClose, onSuccess }: CompleteModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "cartao" | "dinheiro">("pix");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompletedStep, setIsCompletedStep] = useState(false);

  // Calcula a data sugerida para o retorno (20 dias a partir da data do agendamento)
  const appDate = new Date(appointment.date + "T12:00:00");
  const returnDate = new Date(appDate);
  returnDate.setDate(returnDate.getDate() + 20);
  const suggestedReturnDateStr = returnDate.toISOString().split("T")[0];

  const [returnDateInput, setReturnDateInput] = useState(suggestedReturnDateStr);
  const [returnTimeInput, setReturnTimeInput] = useState(appointment.startTime);
  const [isBookingReturn, setIsBookingReturn] = useState(false);
  const [returnBookedSuccess, setReturnBookedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await completeAppointmentWithPayment(appointment, paymentMethod);
      setIsSubmitting(false);
      setIsCompletedStep(true);
    } catch (err) {
      console.error("Erro ao concluir atendimento:", err);
      setIsSubmitting(false);
    }
  };

  const handleScheduleReturn = async () => {
    setIsBookingReturn(true);
    try {
      await createAppointment({
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone,
        serviceId: appointment.serviceId,
        serviceTitle: "Manutenção de Alongamento",
        totalPrice: appointment.totalPrice,
        totalDurationMinutes: appointment.totalDurationMinutes,
        date: returnDateInput,
        startTime: returnTimeInput,
        endTime: appointment.endTime,
        notes: "Retorno agendado na mesa de atendimento"
      });
      setIsBookingReturn(false);
      setReturnBookedSuccess(true);
    } catch (err) {
      console.error("Erro ao agendar retorno:", err);
      setIsBookingReturn(false);
    }
  };

  const openWhatsAppReturnInvite = () => {
    const text = encodeURIComponent(
      `Olá ${appointment.clientName}! Passando para lembrar que sua próxima manutenção de unhas está prevista para ${returnDateInput} às ${returnTimeInput}. Já deixei seu horário reservado, confirma para mim? 😊`
    );
    window.open(`https://wa.me/55${appointment.clientPhone}?text=${text}`, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-rose-100"
        onClick={(e) => e.stopPropagation()}
      >
        {!isCompletedStep ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Finalizar Atendimento</h3>
                  <p className="text-xs text-slate-500">{appointment.clientName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Atendimento */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Procedimento:</span>
                <span className="font-semibold text-slate-900">{appointment.serviceTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Horário:</span>
                <span className="font-semibold text-slate-900">
                  {appointment.startTime} às {appointment.endTime}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-700">Valor a Receber:</span>
                <span className="font-bold text-rose-600">{formatCurrency(appointment.totalPrice)}</span>
              </div>
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Forma de Pagamento</label>
              <div className="grid grid-cols-3 gap-2">
                {(["pix", "cartao", "dinheiro"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-3 rounded-xl border text-xs font-bold uppercase transition-all ${
                      paymentMethod === method
                        ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-rose-200"
                    }`}
                  >
                    {method === "cartao" ? "Cartão" : method}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 text-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando no Caixa...</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  <span>Confirmar Recebimento e Concluir</span>
                </>
              )}
            </button>
          </>
        ) : (
          /* ============================================================ */
          /* ETAPA 2: RETORNO INTELIGENTE (CICLO DE 15 A 21 DIAS)        */
          /* ============================================================ */
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-bold text-lg text-slate-900">Atendimento Concluído!</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Valor de {formatCurrency(appointment.totalPrice)} lançado no caixa diário.
              </p>
            </div>

            {/* Card de Retorno da Manutenção */}
            <div className="bg-pink-50/70 p-4 rounded-2xl border border-pink-100 text-left space-y-3">
              <div className="flex items-center gap-2 text-pink-900 font-bold text-xs">
                <RotateCcw className="w-4 h-4 text-pink-600" />
                <span>Agendar Retorno de Manutenção (20 dias)</span>
              </div>
              <p className="text-[11px] text-slate-600">
                A cliente está na mesa. Garanta a recorrência reservando a próxima manutenção agora:
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Data Prevista</label>
                  <input
                    type="date"
                    value={returnDateInput}
                    onChange={(e) => setReturnDateInput(e.target.value)}
                    className="w-full p-2 bg-white rounded-lg border border-pink-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Horário</label>
                  <input
                    type="time"
                    value={returnTimeInput}
                    onChange={(e) => setReturnTimeInput(e.target.value)}
                    className="w-full p-2 bg-white rounded-lg border border-pink-200 text-xs"
                  />
                </div>
              </div>

              {!returnBookedSuccess ? (
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleScheduleReturn}
                    disabled={isBookingReturn}
                    className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    {isBookingReturn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>Confirmar Pré-Agendamento de Retorno</span>
                  </button>
                  <button
                    onClick={openWhatsAppReturnInvite}
                    className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Mandar Mensagem de Retorno no Zap</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl text-center">
                  ✅ Retorno pré-agendado com sucesso para {returnDateInput} às {returnTimeInput}!
                </div>
              )}
            </div>

            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
