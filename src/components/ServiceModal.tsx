import { useState } from "react";
import { Scissors, X, Trash2, Loader2 } from "lucide-react";
import type { Service } from "../types";
import { saveService, deleteService } from "../services/firestoreService";

interface ServiceModalProps {
  service?: Service | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ServiceModal({ service, isOpen, onClose, onSuccess }: ServiceModalProps) {
  const [title, setTitle] = useState(service?.title || "");
  const [description, setDescription] = useState(service?.description || "");
  const [price, setPrice] = useState(service ? String(service.price) : "");
  const [durationMinutes, setDurationMinutes] = useState(service ? String(service.durationMinutes) : "60");
  const [category, setCategory] = useState<Service["category"]>(service?.category || "alongamento");
  const [active, setActive] = useState(service ? service.active : true);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !durationMinutes) return;
    setIsLoading(true);

    try {
      await saveService({
        id: service?.id,
        title,
        description,
        price: Number(price),
        durationMinutes: Number(durationMinutes),
        category,
        active
      });
      setIsLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao salvar serviço:", err);
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!service?.id) return;
    if (!confirm("Deseja realmente excluir este serviço do catálogo?")) return;
    setIsLoading(true);
    try {
      await deleteService(service.id);
      setIsLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao excluir serviço:", err);
      setIsLoading(false);
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
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {service ? "Editar Procedimento" : "Novo Procedimento"}
              </h3>
              <p className="text-xs text-slate-500">Catálogo de serviços e valores</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Serviço</label>
            <input
              type="text"
              required
              placeholder="Ex: Alongamento em Gel, Esmaltação em Gel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição Curta</label>
            <input
              type="text"
              placeholder="Ex: Nivelamento, cutilagem e acabamento perfeito"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="100.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duração (Minutos)</label>
              <input
                type="number"
                step="5"
                required
                placeholder="90"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Service["category"])}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="alongamento">Alongamento</option>
                <option value="manutencao">Manutenção</option>
                <option value="natural">Unhas Naturais</option>
                <option value="adicional">Adicional / Arte</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status no Catálogo</label>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  active
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {active ? "Disponível para Clientes" : "Pausado (Oculto)"}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {service?.id && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="p-3 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all"
                title="Excluir serviço"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2 text-xs"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar no Catálogo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
