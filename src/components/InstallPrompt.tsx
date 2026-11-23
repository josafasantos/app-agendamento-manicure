import { useState, useEffect } from "react";
import { Download, Share, PlusSquare, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return typeof window !== "undefined" ? window.__pwaInstallPrompt || null : null;
  });
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Verifica se já está rodando instalado como App independente
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error - Safari standalone
      window.navigator.standalone === true;

    if (standaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 2. Detecta se é dispositivo Apple (iPhone, iPad) onde prompt nativo não existe
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    if (isAppleDevice) {
      setIsIOS(true);
    }

    // 3. Captura prompt de instalação e atualiza se chegar
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handlePromptReady = () => {
      if (window.__pwaInstallPrompt) {
        setDeferredPrompt(window.__pwaInstallPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      window.__pwaInstallPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("pwa-prompt-ready", handlePromptReady);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Se já havia sido capturado antes do React montar
    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Se já está aberto como PWA instalado, não precisa exibir o botão
  if (isStandalone) return null;

  const handleInstallClick = async () => {
    // Apenas no iOS (onde o Safari não oferece API programática de instalação) abrimos as instruções
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // No Chrome / Android / Edge: SEMPRE tenta instalar diretamente pelo prompt nativo
    const promptEvent = deferredPrompt || window.__pwaInstallPrompt;

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") {
          setDeferredPrompt(null);
          window.__pwaInstallPrompt = null;
          setIsStandalone(true);
        }
      } catch (err) {
        console.warn("Aviso ao abrir prompt de instalação:", err);
      }
    } else {
      // Se ainda não foi capturado (ex: em carregamento inicial ou navegador compatível),
      // aguardamos brevemente e tentamos novamente de forma silenciosa
      setTimeout(async () => {
        const retryPrompt = window.__pwaInstallPrompt;
        if (retryPrompt) {
          try {
            await retryPrompt.prompt();
          } catch (e) {
            console.warn("Retry prompt warning:", e);
          }
        }
      }, 300);
    }
  };

  return (
    <>
      {/* Botão de Instalação no Header */}
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
        title="Instalar Espaço Val Brombini na tela inicial"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </button>

      {/* Modal estritamente para iOS Safari (onde a Apple proíbe instalação automática por botão) */}
      {showIOSModal && isIOS && (
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
                <h3 className="font-bold text-base text-slate-900">Instalar no iPhone</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              No iPhone (Safari), siga estes 3 passos rápidos para adicionar à sua tela inicial:
            </p>

            <div className="bg-rose-50/60 p-4 rounded-2xl space-y-3 text-xs text-slate-800 border border-rose-100">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Toque no botão <strong>Compartilhar</strong> (ícone{" "}
                  <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> na barra inferior do Safari).
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Role a lista e toque em <strong>Adicionar à Tela de Início</strong> (ícone{" "}
                  <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" />).
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
