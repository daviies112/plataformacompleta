# Arquitetura de Plataforma - Desktop e Mobile Separados

## 📋 Visão Geral

Esta aplicação utiliza uma arquitetura profissional com **separação completa** entre Desktop e Mobile, garantindo que cada plataforma tenha design, navegação e otimizações específicas.

## 🏗️ Estrutura de Diretórios

```
src/platforms/
├── shared/              # Código compartilhado entre plataformas
│   ├── hooks/           # Hooks compartilhados (usePlatform, etc)
│   ├── components/      # Componentes reutilizáveis
│   ├── layouts/         # Layouts compartilhados
│   └── styles/          # Estilos compartilhados
│
├── desktop/             # Aplicação Desktop
│   ├── DesktopApp.tsx   # App principal Desktop
│   ├── pages/           # Páginas específicas Desktop
│   ├── components/      # Componentes específicos Desktop
│   ├── layouts/         # Layouts Desktop (DesktopLayout)
│   └── hooks/           # Hooks específicos Desktop
│
├── mobile/              # Aplicação Mobile
│   ├── MobileApp.tsx    # App principal Mobile
│   ├── pages/           # Páginas específicas Mobile
│   ├── components/      # Componentes específicos Mobile
│   ├── layouts/         # Layouts Mobile (MobileLayout)
│   └── hooks/           # Hooks específicos Mobile
│
└── PlatformRouter.tsx   # Roteador que detecta e renderiza a plataforma correta
```

## 🎯 Fluxo de Renderização

1. **App.tsx** → Inicializa providers e contextos globais
2. **PlatformRouter.tsx** → Detecta plataforma (desktop vs mobile)
3. **DesktopApp.tsx** ou **MobileApp.tsx** → Renderiza app específico
4. **Layout específico** → DesktopLayout ou MobileLayout
5. **Páginas específicas** → Páginas otimizadas para cada plataforma

## 🔍 Detecção de Plataforma

### usePlatform Hook
```typescript
const { platform, isMobile, isDesktop, screenWidth } = usePlatform();
```

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🖥️ Desktop (> 768px)

### Características:
- Header fixo horizontal com navegação completa
- Navegação superior com todos os itens visíveis
- Layout otimizado para mouse e teclado
- Espaçamento maior entre elementos
- Componentes de data tables completos
- Modais e popovers padrão

### Componentes Principais:
- `HeaderNavigation` - Header desktop com nav horizontal
- `DesktopLayout` - Layout principal desktop
- Todas as páginas em `desktop/pages/`

## 📱 Mobile (< 768px)

### Características:
- Header compacto e minimalista
- Bottom Navigation (navegação inferior)
- Design touch-first
- Elementos grandes e espaçados para toque
- Safe area para notch/ilha dinâmica
- Scrolling otimizado
- Componentes mobile otimizados

### Componentes Principais:
- `MobileHeader` - Header compacto mobile
- `BottomNav` - Navegação inferior com ícones
- `MobileLayout` - Layout mobile com safe areas
- Todas as páginas em `mobile/pages/`

## 🎨 Design Guidelines

### Desktop
- Container máximo: `container-luxury` class
- Padding horizontal: Normal (px-4 a px-8)
- Font sizes: Base (text-base, text-lg)
- Botões: Tamanho padrão (h-10)
- Cards: Grid layouts (2-4 colunas)

### Mobile
- Container: Full width com px-4
- Padding horizontal: Reduzido (px-2 a px-4)
- Font sizes: Reduzido (text-sm, text-base)
- Botões: Maiores para toque (min-h-[44px])
- Cards: Single column ou scroll horizontal
- Safe areas: pb-[env(safe-area-inset-bottom)]

## 🚀 Otimizações por Plataforma

### Desktop
✅ Code splitting por rota
✅ Lazy loading de imagens
✅ Prefetch de rotas principais
✅ Cache otimizado para navegação rápida

### Mobile
✅ Bundle size reduzido
✅ Lazy loading agressivo
✅ Touch gestures otimizados
✅ Offline first com Service Worker
✅ PWA installable

## 📦 Como Adicionar Nova Funcionalidade

### 1. Criar componente compartilhado (se aplicável)
```typescript
// src/platforms/shared/components/MyComponent.tsx
export const MyComponent = () => { ... }
```

### 2. Criar versão Desktop (se necessário)
```typescript
// src/platforms/desktop/components/MyDesktopComponent.tsx
export const MyDesktopComponent = () => { ... }
```

### 3. Criar versão Mobile (se necessário)
```typescript
// src/platforms/mobile/components/MyMobileComponent.tsx
export const MyMobileComponent = () => { ... }
```

### 4. Adicionar página em ambas plataformas
```typescript
// src/platforms/desktop/pages/NewPage.tsx
// src/platforms/mobile/pages/NewPage.tsx
```

### 5. Adicionar rota em ambos apps
```typescript
// src/platforms/desktop/DesktopApp.tsx
// src/platforms/mobile/MobileApp.tsx
<Route path="/new" element={<NewPage />} />
```

## ✅ Benefícios da Arquitetura

1. **Separação Clara**: Desktop e Mobile completamente independentes
2. **Manutenibilidade**: Fácil encontrar e modificar código específico
3. **Performance**: Bundles otimizados por plataforma
4. **Escalabilidade**: Fácil adicionar novas features
5. **Testabilidade**: Testes separados por plataforma
6. **Profissionalismo**: Experiência de usuário otimizada para cada dispositivo

## 🧪 Testes

### Desktop
```bash
npm run test:desktop
```

### Mobile
```bash
npm run test:mobile
```

### Todos
```bash
npm run test
```

## 📚 Recursos Adicionais

- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
