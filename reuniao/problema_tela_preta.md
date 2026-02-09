# Relatório Técnico: Problema de Tela Preta nas Gravações (MeetFlow + 100ms)

## 1. Descrição do Problema
As reuniões realizadas na plataforma MeetFlow estão sendo gravadas, mas o arquivo de vídeo resultante (MP4) apresenta apenas uma tela preta durante toda a duração, embora o áudio seja capturado corretamente.

## 2. Diagnóstico Atual
O problema parece estar relacionado ao **100ms Beam** (o bot de gravação baseado em navegador). O Beam entra na sala de reunião como um participante invisível, renderiza a página e grava o que "vê". A tela preta ocorre quando:
- O bot não consegue autenticar ou carregar os fluxos de vídeo.
- A interface (UI) do frontend bloqueia ou sobrepõe o vídeo para o bot.
- Há uma falha na negociação de codecs ou permissões de mídia especificamente para o ambiente Headless do bot.

## 3. Ações Já Realizadas (Sem Sucesso)
- **Parâmetros de URL:** Tentamos forçar a entrada do bot com `auto_join=true`, `recording_bot=true`, `skip_preview=true` e `quality=high`.
- **Limpeza de UI:** Implementamos lógica para detectar o bot via User-Agent ou URL e remover todos os elementos de interface (botões, headers, overlays) deixando apenas o vídeo.
- **Forçamento de Mídia:** Adicionamos chamadas explícitas a `hmsActions.setLocalVideoEnabled(true)` para o bot.
- **CSS:** Tentamos forçar a opacidade e o z-index dos elementos de vídeo.

## 4. Pontos de Investigação para a Solução
- **Token de Autenticação:** Verificar se o token gerado para o bot de gravação tem a role correta (geralmente uma role de 'beam' ou 'bot' que não requer permissões de interação, mas tem permissão de 'subscribe' em todos os tracks).
- **Layout de Renderização:** O 100ms Beam utiliza uma resolução específica (configurada como HD 720p). É necessário garantir que o layout React não quebre ou oculte elementos nessa resolução.
- **Lifecycle de Join:** Garantir que o bot não tente gravar antes dos tracks de vídeo estarem totalmente "warm up" (aquecidos).
- **Service Side vs Client Side:** Avaliar se o problema está na forma como o `server/services/hms100ms.ts` dispara o comando de gravação ou se é puramente um erro de renderização no `client/src/components/Meeting100ms.tsx`.

## 5. Arquivos Relevantes
- `client/src/components/Meeting100ms.tsx`: Gerenciamento da visualização e tracks.
- `server/services/hms100ms.ts`: Lógica de disparo da gravação via API do 100ms.
- `server/routes.ts`: Endpoints de geração de tokens.
