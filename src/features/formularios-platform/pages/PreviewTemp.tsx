import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { FormPreview } from "../components/FormPreview";
import { FormConfig } from "../types/form";
import { Button } from "../components/ui/button";
import { X } from "lucide-react";

export default function PreviewTemp() {
  const [, navigate] = useLocation();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[PreviewTemp] Iniciando...');
    console.log('[PreviewTemp] URL completa:', window.location.href);
    
    const params = new URLSearchParams(window.location.search);
    
    // Tentar buscar do localStorage primeiro (sessionStorage não funciona entre abas)
    const previewId = params.get('previewId');
    if (previewId) {
      console.log('[PreviewTemp] Buscando do localStorage com ID:', previewId);
      try {
        const storedData = localStorage.getItem(previewId);
        if (!storedData) {
          console.error('[PreviewTemp] Dados não encontrados no localStorage para ID:', previewId);
          setError('Preview expirado ou não encontrado. Por favor, abra novamente.');
          return;
        }
        
        const config = JSON.parse(storedData);
        console.log('[PreviewTemp] Config carregado do localStorage:', config);
        setFormConfig(config);
        
        // Limpar localStorage após carregar para economizar espaço
        localStorage.removeItem(previewId);
        return;
      } catch (error) {
        console.error('[PreviewTemp] Erro ao carregar do localStorage:', error);
        setError('Erro ao processar dados do preview: ' + (error as Error).message);
        return;
      }
    }
    
    // Fallback: tentar método antigo (URL com formData)
    const formData = params.get('formData');
    console.log('[PreviewTemp] formData na URL:', formData ? 'SIM' : 'NÃO');
    
    if (!formData) {
      console.error('[PreviewTemp] Nenhum parâmetro encontrado (previewId ou formData)');
      setError('Dados do formulário não encontrados. Por favor, abra o preview novamente.');
      return;
    }
    
    try {
      const decodedData = decodeURIComponent(formData);
      console.log('[PreviewTemp] Dados decodificados (primeiros 100 chars):', decodedData.substring(0, 100));
      
      const config = JSON.parse(decodedData);
      console.log('[PreviewTemp] Config parseado da URL:', config);
      setFormConfig(config);
    } catch (error) {
      console.error('[PreviewTemp] Erro ao carregar configuração do formulário:', error);
      setError('Erro ao processar dados do formulário: ' + (error as Error).message);
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-destructive">Erro ao carregar preview</h1>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button onClick={() => window.close()} className="mt-4">
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Carregando preview...</h1>
          <p className="text-muted-foreground mt-2">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Preview do Formulário</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Esta é uma visualização de como o formulário aparecerá para os usuários
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.close()}
            className="shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="border-2 border-border rounded-lg bg-card shadow-lg p-8">
          <FormPreview
            config={formConfig}
            onBack={() => window.close()}
            isLivePreview={true}
          />
        </div>
      </div>
    </div>
  );
}
