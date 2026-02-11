# Documentação Técnica: Sistema de Branding (Logos e Cores) - ExecutiveAI Pro

Este documento detalha a implementação do sistema de personalização visual (Branding) para o formulário e reuniões, permitindo a sincronização de logos e cores em tempo real.

## 1. Sistema de Cores do Formulário (Form Preview)

O sistema de cores do formulário foi projetado para permitir que o usuário veja as alterações instantaneamente enquanto edita.

### Mapeamento de Cores
As cores são gerenciadas no objeto `designConfig.colors`. Utilizamos uma função `migrateColors` no componente `FormPreview.tsx` para garantir que temas antigos continuem funcionando enquanto novos campos são adicionados.

**Convenção de Nomes:**
- `titleColor`: Cor dos títulos.
- `textColor`: Cor dos textos e labels.
- `pageBackground`: Fundo da página (gradiente ou cor).
- `containerBackground`: Fundo do card central.
- `buttonColor`: Cor do botão de ação.
- `buttonTextColor`: Cor do texto do botão.
- `progressBarColor`: Cor da barra de progresso.
- `inputBackground`: Fundo dos inputs.
- `borderColor`: Cor das bordas.

### Sincronização em Tempo Real (Live Preview)
A visualização em tempo real funciona através de **Variáveis CSS** injetadas dinamicamente via JavaScript:

1. **Injeção:** No `FormPreview.tsx`, usamos um `useEffect` que observa o objeto de cores.
2. **Atribuição:** Quando o modo `isLivePreview` está ativo, as cores são injetadas no `document.documentElement`.
3. **Aplicação:** Os componentes utilizam essas variáveis ou estilos inline diretos para refletir a mudança sem recarregar a página.

```typescript
// Exemplo de injeção no FormPreview.tsx
useEffect(() => {
  const root = document.documentElement;
  if (isLivePreview) {
    root.style.setProperty('--form-title-color', colors.titleColor);
    root.style.setProperty('--form-page-bg', colors.pageBackground);
    // ...
  }
}, [colors, isLivePreview]);
```

---

## 2. Implementação de Logos

### No Formulário
O logo é exibido no topo do formulário com as seguintes capacidades:
- **Alinhamento:** Suporta esquerda, centro e direita via `logoAlign`.
- **Dimensionamento:** O tamanho é controlado dinamicamente via `logoSize`.
- **Renderização:** O componente `FormPreview` aplica essas propriedades via estilos inline para garantir que o preview seja idêntico ao resultado final.

### Na Reunião (Video Conferencing)
O sistema de reuniões (`RoomDesignSettings.tsx`) possui uma integração avançada com logos:
1. **Extração de Cores:** Ao fazer upload de uma imagem, o sistema extrai automaticamente as cores predominantes para sugerir uma paleta de cores que combine com a marca.
2. **Branding da Sala:** O logo é aplicado no lobby e dentro da sala de reunião, seguindo as configurações de tamanho e posição definidas pelo administrador.

---

## 3. Branding Global (CompanyContext)

Para garantir que a identidade visual seja consistente em toda a plataforma NEXUS, utilizamos o `CompanyContext.tsx`:
- **Persistência:** As cores e o logo da empresa são salvos no Supabase (tabela `companies`).
- **Distribuição:** O contexto disponibiliza o `branding` para todos os componentes autenticados.
- **Variáveis CSS:** As cores globais da empresa são aplicadas ao root (`--brand-primary`, etc.), permitindo que qualquer parte do sistema consuma a identidade da marca do locatário (tenant).

---

## Como Replicar
1. **Defina o Objeto de Design:** Crie um estado no seu componente de builder que armazene o objeto de cores.
2. **Use Estilos Inline no Preview:** No componente de preview, aplique o objeto de cores diretamente na prop `style` dos elementos.
3. **Injete Variáveis CSS:** Para componentes que dependem de classes globais, use o método `root.style.setProperty` dentro de um `useEffect`.
4. **Trate o Logo:** Armazene a URL do logo e aplique `justify-content` dinâmico com base na preferência de alinhamento.
