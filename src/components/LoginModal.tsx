import { useState } from "react";
import { Lock, Mail, Key, X, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../lib/firebase";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AuthMode = "login" | "first_access" | "reset_password";

// E-mail da manicure proprietária autorizada a criar o primeiro acesso
const OWNER_EMAIL = "josafaalvesdossantos@gmail.com";

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (mode === "reset_password") {
        // Redefinição de senha por e-mail
        await sendPasswordResetEmail(auth, email.trim());
        setIsLoading(false);
        setSuccessMessage("Link enviado com sucesso! Verifique a sua caixa de entrada e spam para definir sua senha.");
        return;
      }

      if (mode === "first_access") {
        // Validação: apenas a manicure proprietária pode criar o primeiro acesso pela tela pública
        if (email.trim().toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
          setIsLoading(false);
          setErrorMessage(
            "Apenas o e-mail da manicure proprietária pode realizar o primeiro acesso. Novos membros devem ser cadastrados pela manicure dentro do painel."
          );
          return;
        }

        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        // Modo Login normal
        await signInWithEmailAndPassword(auth, email.trim(), password);
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
        setErrorMessage("Usuário não encontrado. Se for seu primeiro acesso, selecione 'Primeiro acesso'.");
      } else if (error.code === "auth/weak-password") {
        setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
      } else if (error.code === "auth/email-already-in-use") {
        setErrorMessage("Este e-mail já está cadastrado. Alterne para Entrar ou use Redefinir Senha.");
      } else if (
        error.code === "auth/operation-not-allowed" ||
        error.code === "auth/configuration-not-found"
      ) {
        setErrorMessage(
          "O provedor de E-mail/Senha precisa ser ativado no Firebase Console (Authentication > Primeiros passos > E-mail/senha > Ativar)."
        );
      } else {
        setErrorMessage(error.message || "Erro ao processar solicitação. Verifique os dados digitados.");
      }
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "first_access":
        return "Primeiro Acesso da Manicure";
      case "reset_password":
        return "Redefinir Senha";
      default:
        return "Área Restrita da Manicure";
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case "first_access":
        return "Defina sua senha de administradora do estúdio";
      case "reset_password":
        return "Receba um link seguro para cadastrar ou trocar sua senha";
      default:
        return "Acesso exclusivo para gestão do estúdio";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-5 border border-rose-100 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-200">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">{getTitle()}</h3>
              <p className="text-[11px] text-slate-500">{getSubtitle()}</p>
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

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
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

          {mode !== "reset_password" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Senha</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset_password");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-medium"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
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
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : mode === "reset_password" ? (
              "Enviar Link de Redefinição"
            ) : mode === "first_access" ? (
              "Criar Senha e Acessar"
            ) : (
              "Entrar no Painel"
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
          {mode === "login" ? (
            <button
              type="button"
              onClick={() => {
                setMode("first_access");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium"
            >
              Primeiro acesso da Manicure? Configurar senha
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="text-xs text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
