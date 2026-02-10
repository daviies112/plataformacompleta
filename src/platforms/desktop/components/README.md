# Componentes Desktop

## Componentes Específicos Desktop

Esta pasta contém componentes otimizados exclusivamente para desktop (telas > 768px).

## Diretrizes de Design

### Tamanhos e Espaçamentos
- Botões: `h-10` (40px altura mínima)
- Inputs: `h-10` padrão
- Cards: Padding `p-6`
- Grid: 2-4 colunas dependendo do conteúdo

### Interações
- Otimizado para mouse e teclado
- Hover states em todos elementos interativos
- Tooltips informativos
- Atalhos de teclado quando apropriado

### Layout
- Use `container-luxury` para contenção
- Grid layouts para cards e listas
- Modais centralizados
- Sidebars quando necessário

## Componentes Disponíveis

### Navigation
- `HeaderNavigation` (importado de @/components)
  - Header horizontal fixo no topo
  - Navegação completa com todos os itens
  - Botão de logout e user info

### Layout
- `DesktopLayout` (em ../layouts/)
  - Layout base para todas páginas desktop
  - Inclui HeaderNavigation
  - Container adequado

## Criando Novos Componentes

Ao criar componentes desktop, sempre considere:
1. Tamanho adequado para mouse (não precisa ser touch-friendly)
2. Hover states e feedback visual
3. Uso de espaço horizontal (telas largas)
4. Tooltips e ajuda contextual
5. Atalhos de teclado quando aplicável

Exemplo:
```typescript
// DesktopDataTable.tsx
import { useState } from 'react';

export const DesktopDataTable = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        {/* Desktop optimized table */}
      </table>
    </div>
  );
};
```
