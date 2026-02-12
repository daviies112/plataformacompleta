// vite.config.ts
import { defineConfig } from "file:///C:/Users/davie/Downloads/plataforma/plataformacompleta%20(11)/plataformacompleta/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/davie/Downloads/plataforma/plataformacompleta%20(11)/plataformacompleta/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/davie/Downloads/plataforma/plataformacompleta%20(11)/plataformacompleta/node_modules/lovable-tagger/dist/index.js";
import tsconfigPaths from "file:///C:/Users/davie/Downloads/plataforma/plataformacompleta%20(11)/plataformacompleta/node_modules/vite-tsconfig-paths/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\davie\\Downloads\\plataforma\\plataformacompleta (11)\\plataformacompleta";
var vite_config_default = defineConfig(({ mode }) => ({
  root: ".",
  publicDir: "public",
  define: {
    // ===== SUPABASE CONFIGURATION (RUNTIME, NÃO BUILD-TIME) =====
    // 
    // IMPORTANTE: Estas variáveis PODEM estar vazias propositalmente!
    // 
    // O frontend agora busca credenciais Supabase via API em RUNTIME:
    // - GET /api/config/supabase (não-autenticado, rate-limited)
    // - Credenciais armazenadas em PostgreSQL (tabela app_settings)
    // - Elimina dependência de Secrets durante build
    // 
    // Prioridades (ver src/lib/supabase.ts):
    // 1. API backend (runtime) - PostgreSQL app_settings
    // 2. Variáveis de ambiente (fallback durante migração)
    // 3. localStorage (fallback legado)
    // 
    // É SEGURO deixar vazio - aplicação funciona com graceful degradation
    "import.meta.env.REACT_APP_SUPABASE_URL": JSON.stringify(
      process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || ""
    ),
    "import.meta.env.REACT_APP_SUPABASE_ANON_KEY": JSON.stringify(
      process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || ""
    )
  },
  optimizeDeps: {
    exclude: ["whatsapp"],
    // ✅ OTIMIZAÇÃO CRÍTICA: Pré-otimiza dependências usadas em rotas públicas
    // Isso evita compilação on-demand que causa delay de 15s
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react-router-dom",
      "@tanstack/react-query",
      "next-themes",
      "sonner",
      "lucide-react",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-toast",
      "@radix-ui/react-dialog",
      "@radix-ui/react-slot",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
      "zod",
      "react-hook-form",
      "@hookform/resolvers/zod",
      "date-fns",
      "date-fns/locale/pt-BR",
      "@supabase/supabase-js",
      "zustand",
      "axios",
      "react/jsx-dev-runtime"
    ],
    // Força pré-bundling na inicialização
    force: true
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "5000", 10),
    strictPort: false,
    allowedHosts: true,
    hmr: process.env.REPLIT_DEV_DOMAIN ? {
      protocol: "wss",
      host: process.env.REPLIT_DEV_DOMAIN,
      clientPort: 443,
      timeout: 12e4
    } : true
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: mode === "development",
    rollupOptions: {
      input: {
        main: path.resolve(__vite_injected_original_dirname, "index.html")
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("face-api") || id.includes("@tensorflow") || id.includes("tfjs")) {
              return "face-detection";
            }
            if (id.includes("fabric")) {
              return "label-designer";
            }
            if (id.includes("framer-motion") || id.includes("motion-dom")) {
              return "animations";
            }
            if (id.includes("recharts") || id.includes("d3-")) {
              return "charts";
            }
            if (id.includes("@100mslive") || id.includes("hms")) {
              return "video-meeting";
            }
            if (id.includes("html2pdf") || id.includes("jspdf") || id.includes("html2canvas")) {
              return "pdf-generator";
            }
            if (id.includes("@supabase")) {
              return "supabase";
            }
            if (id.includes("xlsx") || id.includes("exceljs")) {
              return "spreadsheet";
            }
            if (id.includes("@sentry")) {
              return "monitoring";
            }
            if (id.includes("qrcode") || id.includes("jsbarcode")) {
              return "barcode";
            }
            if (id.includes("date-fns")) {
              return "date-utils";
            }
            if (id.includes("zod")) {
              return "validation";
            }
            if (id.includes("@tanstack/react-query")) {
              return "query";
            }
            if (id.includes("axios")) {
              return "http";
            }
            if (id.includes("react") || id.includes("react-dom")) {
              return "react-core";
            }
            if (id.includes("react-router") || id.includes("wouter")) {
              return "router";
            }
            if (id.includes("@radix-ui")) {
              return "ui-vendor";
            }
            if (id.includes("lucide-react")) {
              return "icons";
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 500
  },
  plugins: [tsconfigPaths(), react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "@assets": path.resolve(__vite_injected_original_dirname, "./attached_assets")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYXZpZVxcXFxEb3dubG9hZHNcXFxccGxhdGFmb3JtYVxcXFxwbGF0YWZvcm1hY29tcGxldGEgKDExKVxcXFxwbGF0YWZvcm1hY29tcGxldGFcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGRhdmllXFxcXERvd25sb2Fkc1xcXFxwbGF0YWZvcm1hXFxcXHBsYXRhZm9ybWFjb21wbGV0YSAoMTEpXFxcXHBsYXRhZm9ybWFjb21wbGV0YVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvZGF2aWUvRG93bmxvYWRzL3BsYXRhZm9ybWEvcGxhdGFmb3JtYWNvbXBsZXRhJTIwKDExKS9wbGF0YWZvcm1hY29tcGxldGEvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gJ3ZpdGUtdHNjb25maWctcGF0aHMnO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgcm9vdDogJy4nLFxuICBwdWJsaWNEaXI6ICdwdWJsaWMnLFxuICBkZWZpbmU6IHtcbiAgICAvLyA9PT09PSBTVVBBQkFTRSBDT05GSUdVUkFUSU9OIChSVU5USU1FLCBOXHUwMEMzTyBCVUlMRC1USU1FKSA9PT09PVxuICAgIC8vIFxuICAgIC8vIElNUE9SVEFOVEU6IEVzdGFzIHZhcmlcdTAwRTF2ZWlzIFBPREVNIGVzdGFyIHZhemlhcyBwcm9wb3NpdGFsbWVudGUhXG4gICAgLy8gXG4gICAgLy8gTyBmcm9udGVuZCBhZ29yYSBidXNjYSBjcmVkZW5jaWFpcyBTdXBhYmFzZSB2aWEgQVBJIGVtIFJVTlRJTUU6XG4gICAgLy8gLSBHRVQgL2FwaS9jb25maWcvc3VwYWJhc2UgKG5cdTAwRTNvLWF1dGVudGljYWRvLCByYXRlLWxpbWl0ZWQpXG4gICAgLy8gLSBDcmVkZW5jaWFpcyBhcm1hemVuYWRhcyBlbSBQb3N0Z3JlU1FMICh0YWJlbGEgYXBwX3NldHRpbmdzKVxuICAgIC8vIC0gRWxpbWluYSBkZXBlbmRcdTAwRUFuY2lhIGRlIFNlY3JldHMgZHVyYW50ZSBidWlsZFxuICAgIC8vIFxuICAgIC8vIFByaW9yaWRhZGVzICh2ZXIgc3JjL2xpYi9zdXBhYmFzZS50cyk6XG4gICAgLy8gMS4gQVBJIGJhY2tlbmQgKHJ1bnRpbWUpIC0gUG9zdGdyZVNRTCBhcHBfc2V0dGluZ3NcbiAgICAvLyAyLiBWYXJpXHUwMEUxdmVpcyBkZSBhbWJpZW50ZSAoZmFsbGJhY2sgZHVyYW50ZSBtaWdyYVx1MDBFN1x1MDBFM28pXG4gICAgLy8gMy4gbG9jYWxTdG9yYWdlIChmYWxsYmFjayBsZWdhZG8pXG4gICAgLy8gXG4gICAgLy8gXHUwMEM5IFNFR1VSTyBkZWl4YXIgdmF6aW8gLSBhcGxpY2FcdTAwRTdcdTAwRTNvIGZ1bmNpb25hIGNvbSBncmFjZWZ1bCBkZWdyYWRhdGlvblxuICAgICdpbXBvcnQubWV0YS5lbnYuUkVBQ1RfQVBQX1NVUEFCQVNFX1VSTCc6IEpTT04uc3RyaW5naWZ5KFxuICAgICAgcHJvY2Vzcy5lbnYuU1VQQUJBU0VfVVJMIHx8IHByb2Nlc3MuZW52LlJFQUNUX0FQUF9TVVBBQkFTRV9VUkwgfHwgJydcbiAgICApLFxuICAgICdpbXBvcnQubWV0YS5lbnYuUkVBQ1RfQVBQX1NVUEFCQVNFX0FOT05fS0VZJzogSlNPTi5zdHJpbmdpZnkoXG4gICAgICBwcm9jZXNzLmVudi5TVVBBQkFTRV9BTk9OX0tFWSB8fCBwcm9jZXNzLmVudi5SRUFDVF9BUFBfU1VQQUJBU0VfQU5PTl9LRVkgfHwgJydcbiAgICApLFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ3doYXRzYXBwJ10sXG4gICAgLy8gXHUyNzA1IE9USU1JWkFcdTAwQzdcdTAwQzNPIENSXHUwMENEVElDQTogUHJcdTAwRTktb3RpbWl6YSBkZXBlbmRcdTAwRUFuY2lhcyB1c2FkYXMgZW0gcm90YXMgcFx1MDBGQWJsaWNhc1xuICAgIC8vIElzc28gZXZpdGEgY29tcGlsYVx1MDBFN1x1MDBFM28gb24tZGVtYW5kIHF1ZSBjYXVzYSBkZWxheSBkZSAxNXNcbiAgICBpbmNsdWRlOiBbXG4gICAgICAncmVhY3QnLFxuICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAncmVhY3QtZG9tL2NsaWVudCcsXG4gICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JyxcbiAgICAgICduZXh0LXRoZW1lcycsXG4gICAgICAnc29ubmVyJyxcbiAgICAgICdsdWNpZGUtcmVhY3QnLFxuICAgICAgJ0ByYWRpeC11aS9yZWFjdC10b29sdGlwJyxcbiAgICAgICdAcmFkaXgtdWkvcmVhY3QtdG9hc3QnLFxuICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kaWFsb2cnLFxuICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zbG90JyxcbiAgICAgICdjbGFzcy12YXJpYW5jZS1hdXRob3JpdHknLFxuICAgICAgJ2Nsc3gnLFxuICAgICAgJ3RhaWx3aW5kLW1lcmdlJyxcbiAgICAgICd6b2QnLFxuICAgICAgJ3JlYWN0LWhvb2stZm9ybScsXG4gICAgICAnQGhvb2tmb3JtL3Jlc29sdmVycy96b2QnLFxuICAgICAgJ2RhdGUtZm5zJyxcbiAgICAgICdkYXRlLWZucy9sb2NhbGUvcHQtQlInLFxuICAgICAgJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcycsXG4gICAgICAnenVzdGFuZCcsXG4gICAgICAnYXhpb3MnLFxuICAgICAgJ3JlYWN0L2pzeC1kZXYtcnVudGltZScsXG4gICAgXSxcbiAgICAvLyBGb3JcdTAwRTdhIHByXHUwMEU5LWJ1bmRsaW5nIG5hIGluaWNpYWxpemFcdTAwRTdcdTAwRTNvXG4gICAgZm9yY2U6IHRydWUsXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiMC4wLjAuMFwiLFxuICAgIHBvcnQ6IHBhcnNlSW50KHByb2Nlc3MuZW52LlBPUlQgfHwgJzUwMDAnLCAxMCksXG4gICAgc3RyaWN0UG9ydDogZmFsc2UsXG4gICAgYWxsb3dlZEhvc3RzOiB0cnVlLFxuICAgIGhtcjogcHJvY2Vzcy5lbnYuUkVQTElUX0RFVl9ET01BSU4gPyB7XG4gICAgICBwcm90b2NvbDogJ3dzcycsXG4gICAgICBob3N0OiBwcm9jZXNzLmVudi5SRVBMSVRfREVWX0RPTUFJTixcbiAgICAgIGNsaWVudFBvcnQ6IDQ0MyxcbiAgICAgIHRpbWVvdXQ6IDEyMDAwMCxcbiAgICB9IDogdHJ1ZSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICB0YXJnZXQ6ICdlc25leHQnLFxuICAgIG1pbmlmeTogJ2VzYnVpbGQnLFxuICAgIHNvdXJjZW1hcDogbW9kZSA9PT0gJ2RldmVsb3BtZW50JyxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBpbnB1dDoge1xuICAgICAgICBtYWluOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnaW5kZXguaHRtbCcpLFxuICAgICAgfSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2ZhY2UtYXBpJykgfHwgaWQuaW5jbHVkZXMoJ0B0ZW5zb3JmbG93JykgfHwgaWQuaW5jbHVkZXMoJ3RmanMnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2ZhY2UtZGV0ZWN0aW9uJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZmFicmljJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdsYWJlbC1kZXNpZ25lcic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2ZyYW1lci1tb3Rpb24nKSB8fCBpZC5pbmNsdWRlcygnbW90aW9uLWRvbScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnYW5pbWF0aW9ucyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlY2hhcnRzJykgfHwgaWQuaW5jbHVkZXMoJ2QzLScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnY2hhcnRzJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQDEwMG1zbGl2ZScpIHx8IGlkLmluY2x1ZGVzKCdobXMnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZpZGVvLW1lZXRpbmcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdodG1sMnBkZicpIHx8IGlkLmluY2x1ZGVzKCdqc3BkZicpIHx8IGlkLmluY2x1ZGVzKCdodG1sMmNhbnZhcycpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAncGRmLWdlbmVyYXRvcic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0BzdXBhYmFzZScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnc3VwYWJhc2UnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCd4bHN4JykgfHwgaWQuaW5jbHVkZXMoJ2V4Y2VsanMnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3NwcmVhZHNoZWV0JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQHNlbnRyeScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnbW9uaXRvcmluZyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3FyY29kZScpIHx8IGlkLmluY2x1ZGVzKCdqc2JhcmNvZGUnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2JhcmNvZGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdkYXRlLWZucycpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnZGF0ZS11dGlscyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3pvZCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAndmFsaWRhdGlvbic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0B0YW5zdGFjay9yZWFjdC1xdWVyeScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAncXVlcnknO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdheGlvcycpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnaHR0cCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlYWN0JykgfHwgaWQuaW5jbHVkZXMoJ3JlYWN0LWRvbScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAncmVhY3QtY29yZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlYWN0LXJvdXRlcicpIHx8IGlkLmluY2x1ZGVzKCd3b3V0ZXInKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3JvdXRlcic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0ByYWRpeC11aScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAndWktdmVuZG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbHVjaWRlLXJlYWN0JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdpY29ucyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNTAwLFxuICB9LFxuICBwbHVnaW5zOiBbdHNjb25maWdQYXRocygpLCByZWFjdCgpLCBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCldLmZpbHRlcihCb29sZWFuKSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICAgIFwiQGFzc2V0c1wiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vYXR0YWNoZWRfYXNzZXRzXCIpLFxuICAgIH0sXG4gIH0sXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRhLFNBQVMsb0JBQW9CO0FBQ3pjLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFDaEMsT0FBTyxtQkFBbUI7QUFKMUIsSUFBTSxtQ0FBbUM7QUFPekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxNQUFNO0FBQUEsRUFDTixXQUFXO0FBQUEsRUFDWCxRQUFRO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFnQk4sMENBQTBDLEtBQUs7QUFBQSxNQUM3QyxRQUFRLElBQUksZ0JBQWdCLFFBQVEsSUFBSSwwQkFBMEI7QUFBQSxJQUNwRTtBQUFBLElBQ0EsK0NBQStDLEtBQUs7QUFBQSxNQUNsRCxRQUFRLElBQUkscUJB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
