import { useState } from "react";
import { Lock, Mail, Key, X, AlertCircle, Loader2 } from "lucide-react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (isRegisterMode) {
        // Criar primeiro acesso da manicure
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        // Login com e-mail e senha
        await signInWithEmailAndPassword(auth, email, password);
      }
      setIsLoading(false);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setIsLoading(false);
      const error = err as { code?: string; message?: string };
      console.error("Auth error:", error);

      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        setErrorMessage("E-mail ou senha incorretos.");
      } else if (error.code === "auth/user-not-found") {
        setErrorMessage("Usuário não encontrado. Se é seu primeiro acesso, clique em 'Primeiro acesso'.");
      } else if (error.code === "auth/weak-password") {
        setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
      } else if (error.code === "auth/email-already-in-use") {
        setErrorMessage("Este e-mail já está cadastrado. Alterne para Entrar.");
      } else if (error.code === "auth/operation-not-allowed") {
        setErrorMessage("Provedor de E-mail/Senha precisa ser ativado no console do Firebase.");
      } else {
        setErrorMessage("Erro ao autenticar. Verifique seus dados.");
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-5 border border-rose-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-200">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {isRegisterMode ? "Criar Acesso da Manicure" : "Área Restrita da Manicure"}
              </h3>
              <p className="text-[11px] text-slate-500">Acesso exclusivo para gestão do estúdio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Profissional</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Senha</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando...</span>
              </>
            ) : isRegisterMode ? (
              "Cadastrar e Acessar"
            ) : (
              "Entrar no Painel"
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setErrorMessage("");
            }}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium"
          >
            {isRegisterMode ? "Já possui conta? Clique para Entrar" : "Primeiro acesso? Criar senha da manicure"}
          </button>
        </div>
      </div>
    </div>
  );
}
