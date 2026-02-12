# Documentação Técnica: Sistema de Branding e Preview NEXUS

Este documento detalha a implementação técnica do sistema de branding que permite a personalização em tempo real de logos, cores e fontes no preview dos formulários e reuniões.

## 1. Mapeamento e Normalização de Cores (FormPreview.tsx)

Para suportar temas antigos e novos, utilizamos a função `migrateColors`. Ela traduz as cores do banco de dados (que podem estar no formato legado) para o novo sistema de tokens:

```typescript
const migrateColors = (designColors: any) => {
  return {
    titleColor: designColors.titleColor || designColors.primary || '#000000',
    textColor: designColors.textColor || designColors.text || '#374151',
    pageBackground: designColors.pageBackground || designColors.background || '#ffffff',
    containerBackground: designColors.containerBackground || designColors.background || '#ffffff',
    buttonColor: designColors.buttonColor || designColors.primary || '#000000',
    buttonTextColor: designColors.buttonTextColor || designColors.buttonText || '#ffffff',
    progressBarColor: designColors.progressBarColor || designColors.primary || '#000000',
    inputBackground: designColors.inputBackground || '#ffffff',
    borderColor: designColors.borderColor || (designColors.primary ? `${designColors.primary}33` : '#e5e7eb'),
  };
};
```

## 2. Injeção de Variáveis CSS para Preview em Tempo Real

No builder de formulários, as alterações de cor são refletidas instantaneamente através de variáveis CSS injetadas no container do preview:

```typescript
useEffect(() => {
  if (isLivePreview && colors) {
    const root = document.documentElement;
    root.style.setProperty('--form-title-color', colors.titleColor);
    root.style.setProperty('--form-text-color', colors.textColor);
    // ... outras propriedades
  }
}, [isLivePreview, colors]);
```

## 3. Estilização Dinâmica dos Componentes

Aplicamos estilos inline diretamente nos componentes do Shadcn para garantir que o preview ignore o tema global da aplicação e use o tema do cliente:

- **Cards:** `<Card style={{ backgroundColor: colors.containerBackground, borderColor: colors.borderColor }}>`
- **Títulos:** `<h1 style={{ color: colors.titleColor }}>`
- **Botões:** `<Button style={{ backgroundColor: colors.buttonColor, color: colors.buttonTextColor }}>`

## 4. Sistema de Logos e Alinhamento

O logo é renderizado dinamicamente com suporte a alinhamento flexível:

```tsx
{design.logo && (
  <div className={`mb-8 flex ${
    design.logoAlign === 'center' ? 'justify-center' : 
    design.logoAlign === 'right' ? 'justify-end' : 'justify-start'
  }`}>
    <img
      src={design.logo}
      alt="Logo"
      style={{ height: `${design.logoSize || 120}px` }}
      className="rounded-lg object-contain"
    />
  </div>
)}
```

## 5. Extração Automática de Cores (Reuniões/Meetings)

Para o sistema de reuniões (`RoomDesignSettings.tsx`), implementamos um extrator que analisa o logo enviado:

1. **Canvas Analysis:** O logo é desenhado em um canvas oculto.
2. **Dominant Color:** O sistema identifica a cor mais presente.
3. **Palette Generation:** Gera variações de tons para botões, bordas e fundos automaticamente, garantindo harmonia visual sem que o usuário precise configurar cada detalhe.

## 6. Sincronização e Persistência

- **Supabase Sync:** Todas as alterações são salvas na tabela `companies` do Supabase para persistência global.
- **Cache Local:** O backend mantém um cache de 60 segundos para as rotas públicas de branding para garantir performance ultra-rápida no checkout e páginas de login.
- **CompanyContext:** Centraliza o estado de branding no frontend, injetando as variáveis CSS no `:root` no momento do login.
