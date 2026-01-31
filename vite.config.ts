import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  root: '.',
  publicDir: 'public',
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
    'import.meta.env.REACT_APP_SUPABASE_URL': JSON.stringify(
      process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || ''
    ),
    'import.meta.env.REACT_APP_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || ''
    ),
  },
  optimizeDeps: {
    exclude: ['whatsapp'],
    // ✅ OTIMIZAÇÃO CRÍTICA: Pré-otimiza dependências usadas em rotas públicas
    // Isso evita compilação on-demand que causa delay de 15s
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      'next-themes',
      'sonner',
      'lucide-react',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-toast',
      '@radix-ui/react-dialog',
      '@radix-ui/react-slot',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'zod',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'date-fns',
      'date-fns/locale/pt-BR',
      '@supabase/supabase-js',
      'zustand',
      'axios',
    ],
    // Força pré-bundling na inicialização
    force: true,
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || '5000', 10),
    strictPort: false,
    allowedHosts: true,
    hmr: process.env.REPLIT_DEV_DOMAIN ? {
      protocol: 'wss',
      host: process.env.REPLIT_DEV_DOMAIN,
      clientPort: 443,
      timeout: 120000,
    } : true,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: mode === 'development',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('face-api') || id.includes('@tensorflow') || id.includes('tfjs')) {
              return 'face-detection';
            }
            if (id.includes('fabric')) {
              return 'label-designer';
            }
            if (id.includes('framer-motion') || id.includes('motion-dom')) {
              return 'animations';
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts';
            }
            if (id.includes('@100mslive') || id.includes('hms')) {
              return 'video-meeting';
            }
            if (id.includes('html2pdf') || id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf-generator';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('xlsx') || id.includes('exceljs')) {
              return 'spreadsheet';
            }
            if (id.includes('@sentry')) {
              return 'monitoring';
            }
            if (id.includes('qrcode') || id.includes('jsbarcode')) {
              return 'barcode';
            }
            if (id.includes('date-fns')) {
              return 'date-utils';
            }
            if (id.includes('zod')) {
              return 'validation';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }
            if (id.includes('axios')) {
              return 'http';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-core';
            }
            if (id.includes('react-router') || id.includes('wouter')) {
              return 'router';
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  plugins: [tsconfigPaths(), react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
    },
  },
}));
