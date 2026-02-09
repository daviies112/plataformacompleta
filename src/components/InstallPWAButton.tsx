import { Button } from "@/components/ui/button";
import { Download, Apple, Chrome as ChromeIcon, Monitor, Share2, PlusSquare, MoreVertical, Lightbulb } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function InstallPWAButton() {
  const { install, canInstall, isInstalled, deviceInfo } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;
  
  // Normalize pathname by removing /formulario prefix if present (with or without trailing slash)
  let normalizedPath = pathname;
  if (normalizedPath.startsWith('/formulario/')) {
    normalizedPath = normalizedPath.substring('/formulario'.length);
  } else if (normalizedPath === '/formulario') {
    normalizedPath = '/';
  }
  
  // Check if it's a public form page (with or without company slug)
  const isPublicFormPage = 
    normalizedPath.startsWith('/form/') ||           // /form/:id or /formulario/form/:id
    /^\/[^/]+\/form\//.test(normalizedPath) ||       // /:companySlug/form/:id or /formulario/:companySlug/form/:id
    normalizedPath.startsWith('/f/');                // /f/:token or /formulario/f/:token

  const handleInstallClick = async () => {
    console.log('🎯 [PWA] Botão de instalação clicado', { 
      platform: deviceInfo.platform, 
      browser: deviceInfo.browser,
      isMobile: deviceInfo.isMobile,
      isDesktop: deviceInfo.isDesktop
    });
    
    const result = await install();
    
    if (result === 'success') {
      toast.success('App instalado com sucesso!', {
        description: 'O Nexus Intelligence foi adicionado à sua tela inicial.',
      });
    } else if (result === 'dismissed') {
      toast.info('Instalação cancelada', {
        description: 'Você pode instalar o app a qualquer momento.',
      });
    } else if (result === 'manual') {
      console.log('📖 [PWA] Abrindo instruções manuais para', deviceInfo.platform);
      setShowInstructions(true);
    } else if (result === 'error') {
      console.error('❌ [PWA] Erro na instalação - mostrando instruções');
      setShowInstructions(true);
    }
  };

  if (isInstalled || !canInstall) {
    return null;
  }
  
  if (deviceInfo.isMobile || deviceInfo.isTablet) {
    return null;
  }
  
  if (isPublicFormPage) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleInstallClick}
        size="default"
        className="fixed bottom-6 right-6 z-50 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 
          font-semibold transition-all duration-200 active:scale-95
          shadow-[0_0_12px_rgba(212,175,55,0.2)] hover:shadow-[0_0_16px_rgba(212,175,55,0.4)]
          whitespace-nowrap"
        aria-label="Instalar App"
      >
        <Download className="w-4 h-4 mr-2" />
        <span>Instalar App</span>
      </Button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="bg-gray-900 border-primary/20 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2 text-xl">
              <Download className="w-6 h-6" />
              Instalar Nexus Intelligence
            </DialogTitle>
            <DialogDescription className="text-gray-300 mt-4">
              {deviceInfo.isIOS ? 'Siga os passos abaixo no Safari:' : 
               deviceInfo.isAndroid ? 'Siga os passos abaixo no Chrome:' :
               'Siga os passos abaixo:'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Instruções iOS */}
            {deviceInfo.isIOS && (
              <div className="bg-gradient-to-br from-gray-800/70 to-gray-800/50 p-5 rounded-xl border-2 border-primary/30 shadow-lg">
                <h4 className="font-bold text-primary mb-3 flex items-center gap-2 text-lg">
                  <Apple className="w-5 h-5" />
                  iPhone / iPad (Safari)
                </h4>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-gray-900 flex items-center justify-center font-bold text-sm">1</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Share2 className="w-4 h-4 text-blue-400" />
                        <p className="text-gray-200 font-medium">Toque no botão <strong>Compartilhar</strong></p>
                      </div>
                      <p className="text-xs text-gray-400">Ícone de seta para cima na barra inferior do Safari</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-gray-900 flex items-center justify-center font-bold text-sm">2</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <PlusSquare className="w-4 h-4 text-primary" />
                        <p className="text-gray-200 font-medium">Role para baixo e toque em</p>
                      </div>
                      <p className="text-gray-200 font-bold">"Adicionar à Tela de Início"</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-gray-900 flex items-center justify-center font-bold text-sm">3</div>
                    <div className="flex-1">
                      <p className="text-gray-200 font-medium">Toque em <strong>"Adicionar"</strong></p>
                      <p className="text-xs text-gray-400 mt-1">Pronto! O app aparecerá na sua tela inicial</p>
                    </div>
                  </div>
                </div>
                
                {/* Aviso importante para iOS */}
                <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex gap-2 items-start">
                    <Lightbulb className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-200">
                      <strong>Importante:</strong> Use o Safari! Outros navegadores no iOS não suportam instalação de PWA.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Instruções Android */}
            {deviceInfo.isAndroid && (
              <div className="bg-gradient-to-br from-gray-800/70 to-gray-800/50 p-5 rounded-xl border-2 border-primary/30 shadow-lg">
                <h4 className="font-bold text-primary mb-3 flex items-center gap-2 text-lg">
                  <ChromeIcon className="w-5 h-5" />
                  Android (Chrome)
                </h4>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-gray-900 flex items-center justify-center font-bold text-sm">1</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MoreVertical className="w-4 h-4 text-primary" />
                        <p className="text-gray-200 font-medium">Toque nos <strong>3 pontos (⋮)</strong></p>
                      </div>
                      <p className="text-xs text-gray-400">No canto superior direito do Chrome</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-gray-900 flex items-center justify-center font-bold text-sm">2</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Download className="w-4 h-4 text-primary" />
                        <p className="text-gray-200 font-medium">Selecione</p>
                      </div>
                      <p className="text-gray-200 font-bold">"Instalar app"</p>
                      <p className="text-xs text-gray-400 mt-1">ou "Adicionar à tela inicial"</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-gray-900 flex items-center justify-center font-bold text-sm">3</div>
                    <div className="flex-1">
                      <p className="text-gray-200 font-medium">Confirme tocando em <strong>"Instalar"</strong></p>
                      <p className="text-xs text-gray-400 mt-1">Pronto! O app aparecerá na sua tela inicial</p>
                    </div>
                  </div>
                </div>
                
                {/* Dica para Android */}
                <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <div className="flex gap-2 items-start">
                    <Lightbulb className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-green-200">
                      <strong>Dica:</strong> Alguns dispositivos mostram automaticamente um banner de instalação. Basta tocar em "Instalar" quando aparecer!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Instruções Desktop */}
            {deviceInfo.isDesktop && (
              <div className="bg-gradient-to-br from-gray-800/70 to-gray-800/50 p-5 rounded-xl border-2 border-primary/30 shadow-lg">
                <h4 className="font-bold text-primary mb-3 flex items-center gap-2 text-lg">
                  <Monitor className="w-5 h-5" />
                  Desktop (Chrome/Edge)
                </h4>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-gray-900 flex items-center justify-center font-bold text-sm">1</div>
                    <div className="flex-1">
                      <p className="text-gray-200 font-medium">Clique no <strong>ícone de instalação</strong> (⊕) na barra de endereços</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-gray-900 flex items-center justify-center font-bold text-sm">2</div>
                    <div className="flex-1">
                      <p className="text-gray-200 font-medium">Ou vá em <strong>Menu (⋮)</strong> → "Instalar Nexus Intelligence"</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-gray-900 flex items-center justify-center font-bold text-sm">3</div>
                    <div className="flex-1">
                      <p className="text-gray-200 font-medium">Clique em <strong>"Instalar"</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <Button
            onClick={() => setShowInstructions(false)}
            className="w-full bg-primary hover:bg-primary/90 text-gray-900 font-bold mt-4"
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
