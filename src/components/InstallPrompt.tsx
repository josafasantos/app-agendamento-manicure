import { useState, useEffect } from "react";
import { Download, Share, PlusSquare, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Verifica se já está instalado e rodando em modo standalone
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error - navigator.standalone específico do Safari
      window.navigator.standalone === true;

    if (standaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 2. Detecta se é iOS (iPhone, iPad)
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    if (isAppleDevice) {
      setIsIOS(true);
    }

    // 3. Captura o evento nativo de instalação do Chromium / Android
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  // Se já está aberto como PWA instalado, não precisa exibir o botão
  if (isStandalone) return null;

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      // Caso o navegador não tenha disparado o prompt nativo (ex: Chrome desktop), exibe as instruções
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {/* Botão de Instalação no Header ou Barra de Ação */}
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full shadow-sm transition-all active:scale-95 animate-pulse"
        title="Instalar Studio Nails na tela inicial"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>

      {/* Modal com Instruções para iOS / Navegadores Desktop */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-rose-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Instalar o Studio Nails</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Instale o aplicativo na tela inicial do seu celular para agendar com 1 toque e acessar sua agenda sem
              precisar abrir o navegador!
            </p>

            {isIOS ? (
              /* Instruções específicas para iPhone / iPad */
              <div className="bg-rose-50/60 p-4 rounded-2xl space-y-3 text-xs text-slate-800 border border-rose-100">
                <p className="font-semibold text-rose-950">No seu iPhone ou iPad:</p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Toque no botão <strong>Compartilhar</strong> (ícone <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> na barra inferior do Safari).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Role as opções e toque em <strong>Adicionar à Tela de Início</strong> (ícone <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" />).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Toque em <strong>Adicionar</strong> no canto superior direito. Pronto!
                  </span>
                </div>
              </div>
            ) : (
              /* Instruções gerais / Android / Chrome */
              <div className="bg-slate-50 p-4 rounded-2xl space-y-3 text-xs text-slate-800 border border-slate-100">
                <p className="font-semibold text-slate-900">Como adicionar:</p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Clique no ícone de <strong>3 pontinhos</strong> do navegador (no canto superior direito).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
