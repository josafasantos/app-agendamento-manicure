import { useState } from "react";
import { User, Heart, AlertCircle, X, MessageSquare, Save, Loader2 } from "lucide-react";
import { formatPhone } from "../lib/utils";
import type { ClientProfile } from "../types";
import { updateClientProfile } from "../services/firestoreService";

interface ClientModalProps {
  client: ClientProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClientDetailModal({ client, isOpen, onClose, onSuccess }: ClientModalProps) {
  const [nailShape, setNailShape] = useState<ClientProfile["nailShape"]>(client.nailShape || "quadrada");
  const [favoriteColors, setFavoriteColors] = useState(client.favoriteColors || "");
  const [allergies, setAllergies] = useState(client.allergies || "");
  const [notes, setNotes] = useState(client.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateClientProfile(client.id, {
        nailShape,
        favoriteColors,
        allergies,
        notes
      });
      setIsSaving(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao salvar perfil da cliente:", err);
      setIsSaving(false);
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
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">{client.name}</h3>
              <p className="text-xs text-slate-500">{formatPhone(client.phone)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Histórico Resumido */}
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block text-[10px]">Visitas Concluídas</span>
            <strong className="text-sm text-slate-900">{client.totalVisits || 1} vezes</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block text-[10px]">Último Atendimento</span>
            <strong className="text-sm text-rose-600">{client.lastVisitDate || "Recente"}</strong>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Formato de Unha Preferido
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["quadrada", "amendoada", "bailarina", "stiletto", "redonda"] as const).map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => setNailShape(shape)}
                  className={`py-2 px-1 text-xs rounded-lg border font-medium capitalize transition-all ${
                    nailShape === shape
                      ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-rose-200"
                  }`}
                >
                  {shape}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Cores e Esmaltes Favoritos
            </label>
            <input
              type="text"
              placeholder="Ex: Vermelho cereja, Francesinha branca, Tons nude"
              value={favoriteColors}
              onChange={(e) => setFavoriteColors(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              Histórico de Alergias ou Sensibilidades
            </label>
            <input
              type="text"
              placeholder="Ex: Alergia a componentes de esmalte comum, pele sensível"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações Particulares
            </label>
            <textarea
              rows={2}
              placeholder="Anotações para lembrar nos próximos atendimentos..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <a
              href={`https://wa.me/55${client.phone}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </a>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Ficha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
