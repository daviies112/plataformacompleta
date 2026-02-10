import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log("🚀 Starting server setup...");
    const isProduction = process.env.NODE_ENV === "production";
    console.log(`📦 Environment: ${isProduction ? 'production' : 'development'}`);
    
    console.log("🔌 Registering routes...");
    registerRoutes(app);
    console.log("✓ Routes registered");
    
    if (isProduction) {
      console.log("📦 Setting up static serving...");
      serveStatic(app);
    } else {
      console.log("⚡ Setting up Vite...");
      await setupVite(app, app);
      console.log("✓ Vite setup complete");
    }

    const PORT = 5000;
    console.log(`🌐 Starting server on 0.0.0.0:${PORT}...`);
    app.listen(PORT, "0.0.0.0", async () => {
      log(`Server running on port ${PORT}`);
      console.log("✅ Server is ready!");
      
      try {
        const { db } = await import("./db");
        const { whatsappLabels, appSettings } = await import("../../shared/db-schema.js");
        
        const existingLabels = await db.select().from(whatsappLabels).limit(1);
        
        if (existingLabels.length === 0) {
          console.log("🏷️  Auto-inicializando etiquetas WhatsApp padrão...");
          
          const defaultLabels = [
            {
              nome: "Formulário não enviado",
              cor: "hsl(210, 40%, 50%)",
              formStatus: "not_sent",
              qualificationStatus: null,
              ordem: 1,
              ativo: true,
            },
            {
              nome: "Formulário incompleto",
              cor: "hsl(39, 100%, 50%)",
              formStatus: "incomplete",
              qualificationStatus: null,
              ordem: 2,
              ativo: true,
            },
            {
              nome: "Formulário aprovado",
              cor: "hsl(142, 71%, 45%)",
              formStatus: "completed",
              qualificationStatus: "approved",
              ordem: 3,
              ativo: true,
            },
            {
              nome: "Formulário reprovado",
              cor: "hsl(0, 84%, 60%)",
              formStatus: "completed",
              qualificationStatus: "rejected",
              ordem: 4,
              ativo: true,
            },
          ];
          
          await db.insert(whatsappLabels).values(defaultLabels);
          console.log("✅ 4 etiquetas WhatsApp criadas automaticamente!");
        } else {
          console.log("✓ Etiquetas WhatsApp já existem");
        }

        console.log("🔄 Verificando sincronização automática do Supabase...");
        
        // PRIORIDADE 1: Banco de dados (app_settings) - Melhor prática
        let supabaseUrl: string | null | undefined = null;
        let supabaseKey: string | null | undefined = null;
        let source = 'não configurado';
        
        try {
          const settingsResult = await db.select().from(appSettings).limit(1);
          const settings = settingsResult[0];
          if (settings?.supabaseUrl && settings?.supabaseAnonKey) {
            supabaseUrl = settings.supabaseUrl;
            supabaseKey = settings.supabaseAnonKey;
            source = 'banco de dados (app_settings)';
            console.log('✅ Usando credenciais do banco de dados (app_settings)');
          }
        } catch (error) {
          console.warn('⚠️ Erro ao buscar credenciais do banco:', error);
        }
        
        // PRIORIDADE 2: Variáveis de ambiente (Secrets) - Fallback portátil
        if (!supabaseUrl || !supabaseKey) {
          supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
          supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
          if (supabaseUrl && supabaseKey) {
            source = 'Secrets (fallback)';
            console.log('✅ Usando credenciais dos Secrets (fallback)');
          }
        }
        
        if (supabaseUrl && supabaseKey) {
          console.log(`📡 Supabase configurado via ${source} - executando sincronização automática...`);
          
          try {
            const response = await fetch(`http://localhost:${PORT}/api/leads/sync-from-supabase`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
              console.log(`✅ Sincronização automática concluída: ${result.synced} leads sincronizados`);
            } else {
              console.log(`⚠️  Sincronização automática falhou: ${result.message}`);
            }
          } catch (syncError: any) {
            console.log(`⚠️  Erro na sincronização automática: ${syncError.message}`);
          }
        } else {
          console.log("ℹ️  Supabase não configurado - sincronização automática desabilitada");
          console.log("   💡 Configure em Tools → Secrets:");
          console.log("      SUPABASE_URL=https://seu-projeto.supabase.co");
          console.log("      SUPABASE_ANON_KEY=sua-chave-anon");
          console.log("   Ou configure em /configuracoes no frontend");
        }
      } catch (error) {
        console.error("⚠️  Erro ao verificar/criar etiquetas:", error);
      }
    });
  } catch (error) {
    console.error("❌ Fatal error during server startup:", error);
    process.exit(1);
  }
})();
