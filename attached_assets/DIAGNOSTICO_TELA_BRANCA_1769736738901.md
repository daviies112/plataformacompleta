# 🔍 DIAGNÓSTICO: Tela Branca em Páginas Públicas

## Problema Atual
- Tela branca aparece por 10+ segundos
- Nada aparece no console F12 durante o carregamento
- Depois mostra logs de carregamento do formulário

## 🎯 CAUSAS PROVÁVEIS

### 1. **Bundle JavaScript Muito Grande** (MAIS PROVÁVEL)
O React precisa baixar e parsear todo o JavaScript antes de renderizar qualquer coisa.

**Como verificar:**
```bash
# No terminal do Replit, rode:
npm run build

# Depois verifique o tamanho dos bundles:
ls -lh dist/assets/*.js
```

**O que procurar:**
- Arquivos `.js` maiores que 500KB são suspeitos
- Arquivos maiores que 1MB são CRÍTICOS

---

### 2. **Imports Síncronos Bloqueando Renderização**
Mesmo com lazy loading, se houver imports pesados no topo, eles bloqueiam.

**Arquivos para verificar:**
```
src/components/FormularioPublicoWrapper.tsx
src/components/FormularioPublico.tsx
src/components/ReuniaoPetWrapper.tsx
src/components/AssinaturaPublicaWrapper.tsx
```

**O que procurar:**
- Imports de bibliotecas grandes no topo (ex: `import * from 'xxx'`)
- Imports diretos em vez de React.lazy()
- CSS imports grandes

---

### 3. **HTML Inicial Sem Fallback Visível**
O HTML base pode não ter um loader visível enquanto o JS carrega.

**Arquivo para verificar:**
```
index.html
```

**O que deve ter:**
```html
<body>
  <div id="root">
    <!-- DEVE TER UM LOADER AQUI -->
    <div style="...">Carregando...</div>
  </div>
  <script src="..."></script>
</body>
```

---

### 4. **Vite/Build Configuration Incorreta**
Configuração do Vite pode estar criando chunks enormes.

**Arquivo para verificar:**
```
vite.config.ts
```

**O que procurar:**
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Verificar se está separando vendors corretamente
        }
      }
    }
  }
})
```

---

## 🛠️ FERRAMENTAS DE DIAGNÓSTICO

### Ferramenta 1: Medidor de Performance Real
Adicione isso no `index.html` ANTES de qualquer script:

```html
<script>
  // Marca início absoluto
  window.PERF_START = performance.now();
  
  // Intercepta console.log para capturar TUDO
  const originalLog = console.log;
  const logs = [];
  console.log = function(...args) {
    const timestamp = (performance.now() - window.PERF_START).toFixed(0);
    logs.push(`[${timestamp}ms] ${args.join(' ')}`);
    originalLog.apply(console, [`[${timestamp}ms]`, ...args]);
  };
  
  // Mostra quanto tempo até primeiro pixel
  window.addEventListener('DOMContentLoaded', () => {
    console.log('🎨 DOMContentLoaded:', performance.now() - window.PERF_START, 'ms');
  });
  
  window.addEventListener('load', () => {
    console.log('✅ Window Load:', performance.now() - window.PERF_START, 'ms');
  });
  
  // Detecta quando React renderiza
  const observer = new MutationObserver(() => {
    if (document.querySelector('[data-formulario], [data-reuniao], [data-assinatura]')) {
      console.log('⚛️ React Renderizou:', performance.now() - window.PERF_START, 'ms');
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
</script>
```

### Ferramenta 2: Skeleton HTML Puro (Fallback Instantâneo)
Adicione isso dentro do `<div id="root">` no `index.html`:

```html
<div id="root">
  <!-- SKELETON INSTANTÂNEO -->
  <div id="instant-skeleton" style="
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  ">
    <div style="
      background: white;
      border-radius: 16px;
      padding: 48px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    ">
      <div style="
        width: 60px;
        height: 60px;
        border: 4px solid #667eea;
        border-top-color: transparent;
        border-radius: 50%;
        margin: 0 auto 24px;
        animation: spin 1s linear infinite;
      "></div>
      <h2 style="
        color: #1a202c;
        font-size: 20px;
        margin-bottom: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">Carregando...</h2>
      <p style="
        color: #718096;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">Preparando seu conteúdo</p>
    </div>
  </div>
  
  <style>
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
  
  <script>
    // Remove skeleton quando React renderizar
    const removeSkeleton = () => {
      const skeleton = document.getElementById('instant-skeleton');
      if (skeleton) {
        skeleton.style.opacity = '0';
        skeleton.style.transition = 'opacity 0.3s';
        setTimeout(() => skeleton.remove(), 300);
      }
    };
    
    // Observa quando React adiciona conteúdo
    const observer = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          // Se adicionou algo além do skeleton
          if (document.querySelector('[data-formulario], [data-reuniao], [data-assinatura], .ant-')) {
            removeSkeleton();
            observer.disconnect();
          }
        }
      }
    });
    
    observer.observe(document.getElementById('root'), {
      childList: true,
      subtree: true
    });
    
    // Timeout de segurança (remove após 30s mesmo se não detectar)
    setTimeout(removeSkeleton, 30000);
  </script>
</div>
```

### Ferramenta 3: Análise de Rede no Console
Cole isso no Console do navegador (F12) ANTES de recarregar a página:

```javascript
// Monitora todos os recursos carregados
const resources = [];
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const start = performance.now();
  const url = args[0];
  try {
    const response = await originalFetch(...args);
    const duration = performance.now() - start;
    console.log(`📡 FETCH [${duration.toFixed(0)}ms]: ${url}`);
    resources.push({ type: 'fetch', url, duration });
    return response;
  } catch (error) {
    console.error(`❌ FETCH ERROR: ${url}`, error);
    throw error;
  }
};

// Monitora scripts carregados
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.initiatorType === 'script' || entry.initiatorType === 'link') {
      console.log(`📦 ${entry.initiatorType.toUpperCase()} [${entry.duration.toFixed(0)}ms]: ${entry.name}`);
      resources.push({ type: entry.initiatorType, url: entry.name, duration: entry.duration });
    }
  }
});
observer.observe({ entryTypes: ['resource'] });

// Após 15 segundos, mostra relatório
setTimeout(() => {
  console.log('\n📊 RELATÓRIO DE RECURSOS:\n');
  const sorted = resources.sort((a, b) => b.duration - a.duration);
  sorted.slice(0, 10).forEach((r, i) => {
    console.log(`${i + 1}. [${r.duration.toFixed(0)}ms] ${r.type}: ${r.url}`);
  });
  console.log('\n🔝 Top 3 mais lentos são os culpados!\n');
}, 15000);
```

---

## 📋 CHECKLIST DE AÇÕES

Execute nesta ordem:

- [ ] **1. Adicione o medidor de performance no index.html**
  - Isso mostrará QUANDO cada coisa acontece
  - Se "DOMContentLoaded" demora +5s → problema no HTML/JS parsing

- [ ] **2. Adicione o skeleton HTML puro no index.html**
  - Garante que ALGO apareça instantaneamente
  - Se aparecer instantâneo → problema é no React

- [ ] **3. Rode o script de análise de rede no console**
  - Identifica qual recurso está travando
  - Se um .js demora +5s → problema no bundle

- [ ] **4. Verifique o tamanho dos bundles**
  ```bash
  npm run build
  ls -lh dist/assets/
  ```
  - Se index-*.js > 1MB → PROBLEMA CRÍTICO
  - Precisa fazer code splitting

- [ ] **5. Verifique imports no FormularioPublicoWrapper.tsx**
  - Procure por imports grandes ou diretos
  - Todo componente pesado deve ser React.lazy()

---

## 🎯 PRÓXIMOS PASSOS BASEADOS NO RESULTADO

### Se o skeleton HTML aparecer instantaneamente:
✅ Problema é no React/JavaScript
→ Foque em otimizar imports e code splitting

### Se o skeleton HTML NÃO aparecer:
❌ Problema é no servidor/rede/HTML base
→ Foque em otimizar servidor, cache, CDN

### Se console mostrar recurso específico demorando:
🎯 Problema identificado
→ Otimize/remova esse recurso específico

---

## 🚨 SOLUÇÕES RÁPIDAS POR CENÁRIO

### CENÁRIO 1: Bundle muito grande (>1MB)
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['antd', '@ant-design/icons'],
          'vendor-utils': ['axios', 'date-fns', 'lodash'],
        }
      }
    }
  }
})
```

### CENÁRIO 2: Imports pesados bloqueando
```typescript
// ❌ ERRADO
import { FormularioPublico } from './FormularioPublico';

// ✅ CORRETO
const FormularioPublico = React.lazy(() => import('./FormularioPublico'));
```

### CENÁRIO 3: Muitas chamadas API bloqueando
```typescript
// Adicione timeout em TODAS as chamadas
const fetchWithTimeout = (url, timeout = 2000) => {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
};
```

---

## 📞 COMO REPORTAR RESULTADOS

Após rodar os diagnósticos, compartilhe:

1. **Logs do console com timestamps**
   - Quanto tempo até DOMContentLoaded?
   - Quanto tempo até Window Load?
   - Quanto tempo até React renderizar?

2. **Top 3 recursos mais lentos**
   - Qual arquivo .js demorou mais?
   - Qual chamada API demorou mais?

3. **Tamanho dos bundles**
   ```
   ls -lh dist/assets/*.js
   ```

4. **Screenshot da aba Network no F12**
   - Filtro: JS
   - Ordenado por: Size (descendente)

Com essas informações, poderei dar a solução EXATA para o problema!
