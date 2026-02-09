# Componentes Mobile

## Componentes Específicos Mobile

Esta pasta contém componentes otimizados exclusivamente para mobile (telas < 768px).

## Diretrizes de Design

### Tamanhos e Espaçamentos (Touch-Friendly)
- Botões: `min-h-[44px]` (mínimo 44px para touch)
- Áreas toque: Mínimo 44x44px
- Cards: Padding reduzido `p-4`
- Listas: Single column ou horizontal scroll

### Interações Touch
- `touch-manipulation` para melhor resposta
- `active:scale-95` para feedback tátil
- Gestures: swipe, pull-to-refresh
- Sem hover states (não funciona em touch)

### Layout Mobile
- Full width com `px-4` lateral
- Scroll vertical preferencial
- Bottom navigation para navegação principal
- Safe areas para notch: `pb-[env(safe-area-inset-bottom)]`

## Componentes Disponíveis

### Navigation
- `MobileHeader` (importado de @/components)
  - Header compacto fixo no topo
  - Logo + User info + Logout
  - Altura: 40px

- `BottomNav` (importado de @/components)
  - Navegação inferior fixa
  - Ícones grandes + labels
  - Safe area support

### Layout
- `MobileLayout` (em ../layouts/)
  - Layout base para todas páginas mobile
  - Inclui MobileHeader e BottomNav
  - Safe areas configuradas

### Buttons
- `MobileButton` (importado de @/components/mobile)
  - Botões otimizados para toque
  - Tamanhos: default (44px), lg (52px), xl (60px)
  - Active feedback

### Cards
- `MobileOptimizedCard` (importado de @/components/mobile)
  - Cards otimizados para mobile
  - Horizontal scroll quando necessário
  - Touch gestures

## Criando Novos Componentes

Ao criar componentes mobile, sempre considere:
1. **Tamanho mínimo de 44x44px** para áreas de toque
2. **Sem hover states** - use active states
3. **Feedback tátil** - active:scale-95, vibração
4. **Scroll horizontal** para listas longas
5. **Safe areas** para dispositivos com notch
6. **Performance** - componentes leves e rápidos

Exemplo:
```typescript
// MobileList.tsx
import { useIsMobile } from '@/platforms/shared/hooks/usePlatform';

export const MobileList = ({ items }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col gap-2">
      {items.map(item => (
        <button
          key={item.id}
          className="min-h-[44px] touch-manipulation active:scale-95 transition-transform"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
```

## Otimizações Mobile

### Performance
- Lazy loading agressivo
- Virtual scrolling para listas longas
- Imagens otimizadas (WebP, lazy loading)
- Bundle size reduzido

### UX Mobile
- Pull-to-refresh
- Infinite scroll
- Touch gestures (swipe, long press)
- Haptic feedback
- Loading states otimizados

### PWA
- Installable
- Offline support
- Push notifications
- Add to home screen
