import { useState, useEffect } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { testSupabaseConnection } from "../lib/supabase-helpers";
import { Settings, Save, Trash2, ArrowLeft, CheckCircle2, Database, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";

const Configuracoes = () => {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Buscar configurações do servidor E localStorage
    const loadSettings = async () => {
      try {
        // Primeiro tentar do localStorage (mais rápido)
        const localUrl = localStorage.getItem('supabase_url');
        const localKey = localStorage.getItem('supabase_anon_key');
        const localCompanyName = localStorage.getItem('company_name');
        
        if (localUrl && localKey) {
          console.log('✅ Carregando credenciais do localStorage');
          setUrl(localUrl);
          setAnonKey(localKey);
          setCompanyName(localCompanyName || '');
          setLoading(false);
          return;
        }
        
        // Se não tem no localStorage, buscar do servidor
        console.log('📡 Carregando credenciais do servidor...');
        const settings = await api.getSettings();
        if (settings.supabaseUrl && settings.supabaseAnonKey) {
          setUrl(settings.supabaseUrl);
          setAnonKey(settings.supabaseAnonKey);
          setCompanyName(settings.companyName || '');
          
          // Salvar no localStorage para próxima vez
          localStorage.setItem('supabase_url', settings.supabaseUrl);
          localStorage.setItem('supabase_anon_key', settings.supabaseAnonKey);
          if (settings.companyName) {
            localStorage.setItem('company_name', settings.companyName);
          }
          console.log('✅ Credenciais sincronizadas do servidor para localStorage');
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const handleTest = async () => {
    if (!url || !anonKey) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (!url.startsWith("http")) {
      toast.error("URL deve começar com http:// ou https://");
      return;
    }

    setTesting(true);
    try {
      const result = await testSupabaseConnection(url, anonKey);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(`Erro: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(`Erro ao testar: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!url || !anonKey) {
      toast.error("Por favor, preencha os campos de Supabase");
      return;
    }

    if (!url.startsWith("http")) {
      toast.error("URL deve começar com http:// ou https://");
      return;
    }

    setSaving(true);
    try {
      await api.saveSettings({
        supabaseUrl: url,
        supabaseAnonKey: anonKey,
        companyName: companyName || null
      });
      
      // ✅ CORREÇÃO CRÍTICA: Salvar no localStorage para que o frontend envie nos headers
      localStorage.setItem('supabase_url', url);
      localStorage.setItem('supabase_anon_key', anonKey);
      if (companyName) {
        localStorage.setItem('company_name', companyName);
      } else {
        localStorage.removeItem('company_name');
      }
      console.log('✅ Credenciais salvas no localStorage');
      
      // ✅ CORREÇÃO CRÍTICA: Invalidar queries de formulários para recarregar dados do Supabase
      console.log('🔄 Invalidando queries de formulários para recarregar do Supabase...');
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/formularios/ativo"] });
      console.log('✅ Queries invalidadas - formulários serão recarregados');
      
      toast.success("Configurações salvas! O sistema agora usará seu Supabase.");
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await api.saveSettings({
        supabaseUrl: "",
        supabaseAnonKey: "",
        companyName: ""
      });
      
      // ✅ CORREÇÃO CRÍTICA: Limpar do localStorage também
      localStorage.removeItem('supabase_url');
      localStorage.removeItem('supabase_anon_key');
      localStorage.removeItem('company_name');
      console.log('✅ Credenciais removidas do localStorage');
      
      // ✅ CORREÇÃO CRÍTICA: Invalidar queries de formulários para recarregar do PostgreSQL local
      console.log('🔄 Invalidando queries de formulários para recarregar do PostgreSQL local...');
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/formularios/ativo"] });
      console.log('✅ Queries invalidadas - formulários serão recarregados do PostgreSQL local');
      
      setUrl("");
      setAnonKey("");
      setCompanyName("");
      toast.success("Configurações removidas. Usando PostgreSQL local.");
    } catch (error: any) {
      toast.error(`Erro ao limpar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Button
          onClick={() => navigate("/")}
          variant="outline"
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <Settings className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Configurações</span>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
            Conexão Supabase
          </h1>
          <p className="text-lg text-muted-foreground">
            Configure suas credenciais do Supabase para salvar os dados
          </p>
        </header>

        {!loading && url && anonKey && (
          <Card className="p-4 mb-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Conexão configurada</p>
                <p className="text-sm text-muted-foreground">
                  Seus dados serão salvos no Supabase configurado
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Credenciais do Supabase</h2>
              <p className="text-sm text-muted-foreground">
                Encontre essas informações no painel do seu projeto Supabase
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                placeholder="Sua Empresa"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                O slug será gerado automaticamente para as URLs dos formulários (ex: "Sua Empresa" → "/suaempresa/form/...")
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL do Projeto</Label>
              <Input
                id="url"
                placeholder="https://seu-projeto.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: https://xyzcompany.supabase.co
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anonKey">Chave Anônima (anon key)</Label>
              <Input
                id="anonKey"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                A chave pública anônima do seu projeto
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleTest}
                disabled={testing || !url || !anonKey}
                variant="outline"
                className="gap-2"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Testar Conexão
                  </>
                )}
              </Button>

              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Configurações
                  </>
                )}
              </Button>
              
              {url && anonKey && (
                <Button
                  onClick={handleClear}
                  disabled={saving || loading}
                  variant="outline"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 mt-6 bg-accent/5 border-accent/20">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-accent">ℹ️</span>
            Como encontrar suas credenciais?
          </h3>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Acesse seu projeto no Supabase Dashboard</li>
            <li>Vá em Settings → API</li>
            <li>Copie a "Project URL" e a "anon public" key</li>
            <li>Cole aqui, teste a conexão e salve</li>
          </ol>
        </Card>

        <Card className="p-6 mt-6 bg-primary/5 border-primary/20">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-primary">⚠️</span>
            Importante: Configure seu banco de dados
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Seu projeto Supabase precisa ter as tabelas necessárias criadas. Execute este SQL no SQL Editor do Supabase:
          </p>
          <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`-- Criar tabela de formulários
CREATE TABLE IF NOT EXISTS public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  passing_score INTEGER NOT NULL DEFAULT 0,
  design_config JSONB,
  score_tiers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de submissões
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL,
  answers JSONB NOT NULL,
  total_score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de templates
CREATE TABLE IF NOT EXISTS public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  design_config JSONB NOT NULL,
  thumbnail_url TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

-- Criar políticas públicas (ajuste conforme necessário)
CREATE POLICY "forms_public_access" ON public.forms FOR ALL USING (true);
CREATE POLICY "submissions_public_access" ON public.form_submissions FOR ALL USING (true);
CREATE POLICY "templates_public_access" ON public.form_templates FOR ALL USING (true);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_forms_created_at ON public.forms (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON public.form_submissions (form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.form_submissions (created_at DESC);`}
          </pre>
        </Card>
      </div>
    </div>
  );
};

export default Configuracoes;
