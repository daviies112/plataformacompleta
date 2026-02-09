# 📋 Relatório Técnico: Falhas na Integração 100ms (Gravação e Compartilhamento)

## 🔍 Visão Geral do Problema
O sistema **MeetFlow** apresenta instabilidades em duas funcionalidades críticas: a gravação de reuniões e o compartilhamento de tela. Embora a interface responda aos comandos, o resultado final (gravação salva ou vídeo compartilhado) não está sendo alcançado com sucesso.

---

## 🛠️ Detalhamento dos Erros

### 1. Gravação de Reunião (Recording)
- **Sintoma**: O botão de gravação alterna para o estado "Gravando", mas não há evidência de que o bot do 100ms (Beam) tenha entrado na sala ou que o arquivo esteja sendo gerado.
- **Causa Provável**: 
    - **Acessibilidade da URL**: O 100ms Beam requer uma URL pública acessível. No ambiente de desenvolvimento do Replit, a URL pode estar protegida ou o bot pode não conseguir resolver o proxy corretamente.
    - **Parâmetros da API**: Estamos enviando `window.location.href`, mas para ambientes Replit, pode ser necessário passar o domínio específico do `webview`.
- **Diagnóstico Técnico**: O seletor `browserRecordingState` não existe na tipagem do SDK v0.11.0, exigindo acesso via `(room as any)`, o que dificulta o debug estável.

### 2. Compartilhamento de Tela (Screen Share)
- **Sintoma**: O navegador solicita a permissão de tela, o usuário seleciona, mas o vídeo não é renderizado no grid para os outros participantes.
- **Causa Provável**:
    - **Auxiliary Track Mapping**: O compartilhamento de tela no 100ms é um track auxiliar. O componente atual tenta mapear via `peers.find(p => p.auxiliaryTracks.length > 0)`, mas se houver múltiplos tracks ou atraso na publicação, a referência falha.
    - **Auto-play Policy**: O vídeo do compartilhamento pode estar sendo bloqueado pelo navegador por falta de uma interação explícita ou política de `muted`.
- **Diagnóstico Técnico**: Erros de hot-reload do Vite indicam que o componente `Meeting100ms.tsx` está ficando pesado ou com dependências instáveis durante a alternância de tracks.

---

## 📄 Arquivos de Referência para Correção
- `client/src/components/Meeting100ms.tsx`: Contém toda a lógica de UI e interação com o SDK.
- `server/services/hms100ms.ts`: Gerencia tokens e criação de salas no backend.

---

## 🎯 Instruções para Claude (Briefing de Correção)
Para resolver estes problemas, Claude deve:
1.  **Habilitar Logs de Debug**: Inserir listeners para `onTrackUpdate` e `onRoomUpdate` para capturar o exato momento em que o track de tela é publicado.
2.  **Refatorar Grid de Vídeo**: Garantir que o `ScreenShare` seja renderizado com prioridade e que use `hmsActions.attachVideo` de forma resiliente.
3.  **Validar Permissões de Role**: Verificar se o token gerado no backend para o usuário (`role: 'admin'` ou `'host'`) possui permissões explícitas de `screenShare` e `recording` habilitadas no template do 100ms.
4.  **Ajustar URL de Gravação**: Experimentar passar uma URL simplificada ou validar se o domínio do Replit precisa de bypass de autenticação para o bot do 100ms.
