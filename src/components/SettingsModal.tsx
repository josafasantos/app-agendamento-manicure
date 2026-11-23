import { useState } from "react";
import { Settings, X, Save, Clock, MapPin, Phone, User, Sparkles, Loader2 } from "lucide-react";
import type { StudioSettings } from "../types";
import { updateSettings } from "../services/firestoreService";

interface SettingsModalProps {
  settings: StudioSettings;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SettingsModal({ settings, isOpen, onClose, onSuccess }: SettingsModalProps) {
  const [studioName, setStudioName] = useState(settings.studioName);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [dayStartTime, setDayStartTime] = useState(settings.dayStartTime);
  const [dayEndTime, setDayEndTime] = useState(settings.dayEndTime);
  const [lunchStart, setLunchStart] = useState(settings.lunchStart || "12:00");
  const [lunchEnd, setLunchEnd] = useState(settings.lunchEnd || "13:00");
  const [bufferMinutes, setBufferMinutes] = useState(String(settings.bufferMinutes));
  const [maintenanceCycleDays, setMaintenanceCycleDays] = useState(String(settings.maintenanceCycleDays));
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateSettings({
        ...settings,
        studioName,
        ownerName,
        phone: phone.replace(/\D/g, ""),
        address,
        dayStartTime,
        dayEndTime,
        lunchStart,
        lunchEnd,
        bufferMinutes: Number(bufferMinutes),
        maintenanceCycleDays: Number(maintenanceCycleDays)
      });
      setIsSaving(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-rose-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Configurações do Estúdio</h3>
              <p className="text-xs text-slate-500">Expediente, WhatsApp e regras da agenda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                Nome do Estúdio
              </label>
              <input
                type="text"
                required
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-rose-500" />
                Seu Nome (Manicure)
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-rose-500" />
                WhatsApp do Estúdio (com DDD)
              </label>
              <input
                type="tel"
                required
                placeholder="11999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Endereço de Atendimento
              </label>
              <input
                type="text"
                required
                placeholder="Rua, número, sala ou bairro"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Expediente */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              Horário de Atendimento Diário
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Abertura</label>
                <input
                  type="time"
                  required
                  value={dayStartTime}
                  onChange={(e) => setDayStartTime(e.target.value)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Encerramento</label>
                <input
                  type="time"
                  required
                  value={dayEndTime}
                  onChange={(e) => setDayEndTime(e.target.value)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Início do Almoço</label>
                <input
                  type="time"
                  value={lunchStart}
                  onChange={(e) => setLunchStart(e.target.value)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Fim do Almoço</label>
                <input
                  type="time"
                  value={lunchEnd}
                  onChange={(e) => setLunchEnd(e.target.value)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Intervalo e Ciclo de Retorno */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Intervalo entre Clientes (Minutos)
              </label>
              <input
                type="number"
                step="5"
                min="0"
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Tempo para esterilizar materiais</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ciclo de Manutenção (Dias)
              </label>
              <input
                type="number"
                min="10"
                max="35"
                value={maintenanceCycleDays}
                onChange={(e) => setMaintenanceCycleDays(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Janela padrão de retorno (15 a 21d)</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2 text-xs"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Configurações
          </button>
        </form>
      </div>
    </div>
  );
}
