# Documento Completo de Debug: Problema de Tela Preta em Reuniões Públicas 100ms

**Data de Criação:** 12 de Janeiro de 2026  
**Status:** PROBLEMA NÃO RESOLVIDO  
**Prioridade:** CRÍTICA  

---

## 1. RESUMO EXECUTIVO

### 1.1 Descrição do Problema
Usuários externos que acessam links públicos de reuniões via `/reuniao/:id` enfrentam uma **tela preta** após clicarem no botão "Participar agora" no lobby. O loading spinner desaparece, mas a sala de reunião não é renderizada corretamente.

### 1.2 Fluxo Esperado
1. Usuário acessa `/reuniao/{meeting-id}`
2. Lobby é exibido com preview de câmera e campo de nome
3. Usuário digita nome e clica "Participar agora"
4. Loading spinner aparece "Conectando à reunião..."
5. Token é gerado via API
6. `hmsActions.join()` é chamado
7. Conexão é estabelecida
8. Sala de reunião com vídeos dos participantes é exibida

### 1.3 Fluxo Atual (Com Bug)
Passos 1-6 funcionam corretamente. No passo 7, algo falha silenciosamente e a tela fica preta ou o loading permanece indefinidamente até timeout.

---

## 2. STACK TÉCNICA

### 2.1 Versões dos Pacotes
```json
{
  "@100mslive/react-sdk": "^0.11.0",
  "@100mslive/hms-video-store": "^0.13.0",
  "react": "^18.x",
  "vite": "^5.x",
  "typescript": "^5.x"
}
```

### 2.2 Arquitetura dos Componentes

```
src/App.tsx
└── HMSRoomProvider (wrapper global)
    └── BrowserRouter
        └── AuthProvider
            └── Routes
                └── /reuniao/:id → ReuniaoPublica.tsx
                    └── MeetingLobby.tsx (estado: lobby)
                    └── Meeting100ms.tsx (estado: meeting)
```

### 2.3 Fluxo de Dados

```
1. ReuniaoPublica.tsx
   ├── Carrega dados da reunião via GET /api/public/reunioes/:id/public
   ├── Carrega design config via GET /api/public/reunioes/:id/room-design-public
   ├── Renderiza MeetingLobby (quando step === "lobby")
   └── Ao clicar "Participar":
       ├── POST /api/public/reunioes/:id/token-public
       ├── Recebe JWT token do 100ms
       ├── setStep("meeting")
       └── Renderiza Meeting100ms com token

2. Meeting100ms.tsx
   ├── useHMSActions() para controlar SDK
   ├── useHMSStore(selectIsConnectedToRoom) para estado de conexão
   ├── useEffect para chamar hmsActions.join()
   └── Renderiza PeerVideo para cada participante
```

---

## 3. ARQUIVOS PRINCIPAIS

### 3.1 src/App.tsx
```tsx
import { HMSRoomProvider } from "@100mslive/react-sdk";

const App = () => (
  <HMSRoomProvider>
    <QueryClientProvider client={queryClient}>
      {/* ... resto do app */}
    </QueryClientProvider>
  </HMSRoomProvider>
);
```

**Observação:** O `HMSRoomProvider` está no nível mais alto da aplicação, envolvendo todos os componentes. Isso é necessário para que os hooks do SDK funcionem.

### 3.2 src/pages/ReuniaoPublica.tsx (Completo)

**Responsabilidades:**
- Gerencia o estado do fluxo (lobby → meeting → ended)
- Busca dados da reunião e configuração de design
- Gera token do 100ms via API
- Passa props para Meeting100ms

**Estados:**
- `step`: "lobby" | "meeting" | "ended"
- `token100ms`: string | null
- `tokenLoading`: boolean
- `tokenError`: string | null
- `userName`: string
- `mediaSettings`: { audioEnabled, videoEnabled }

**Função crítica - fetchTokenAndJoin:**
```tsx
const fetchTokenAndJoin = useCallback(async () => {
  if (!meetingId || !meeting) return;
  if (!meeting.roomId100ms) {
    setTokenError("Esta reunião não possui uma sala 100ms configurada.");
    return;
  }

  setTokenLoading(true);
  setTokenError(null);

  try {
    const response = await api.post(`/api/public/reunioes/${meetingId}/token-public`, {
      userName: userName || "Participante",
      role: isRecordingBot ? "recorder" : "guest"
    });
    
    if (response.data.token) {
      setToken100ms(response.data.token);
      setStep("meeting");  // <- Trigger para renderizar Meeting100ms
    } else {
      setTokenError("Token não retornado pela API.");
    }
  } catch (err: any) {
    setTokenError(err.response?.data?.error || err.message);
  } finally {
    setTokenLoading(false);
  }
}, [meetingId, meeting, userName, isRecordingBot]);
```

**Renderização condicional:**
```tsx
if (step === "meeting" && token100ms && meeting.roomId100ms) {
  return (
    <Meeting100ms
      authToken={token100ms}
      roomId={meeting.roomId100ms}
      userName={userName || "Participante"}
      onLeave={handleLeave}
      config={roomConfig}
    />
  );
}
```

### 3.3 src/components/Meeting100ms.tsx (Seção Crítica de Join)

**Imports do SDK:**
```tsx
import {
  useHMSStore,
  useHMSActions,
  useVideo,
  selectPeers,
  selectIsConnectedToRoom,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectIsLocalScreenShared,
  selectRoom,
  HMSPeer,
} from "@100mslive/react-sdk";
```

**Hooks de estado:**
```tsx
const hmsActions = useHMSActions();
const isConnected = useHMSStore(selectIsConnectedToRoom);
const peers = useHMSStore(selectPeers);
const isAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
const isVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);

const [error, setError] = useState<string | null>(null);
const [isJoining, setIsJoining] = useState(true);
const hasAttemptedJoin = useRef(false);
const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

**useEffect de Join (CÓDIGO ATUAL COM FIX):**
```tsx
useEffect(() => {
  if (hasAttemptedJoin.current) return;
  hasAttemptedJoin.current = true;
  
  let isMounted = true;
  
  const joinRoom = async (attempt: number = 0) => {
    if (!isMounted) return;
    
    try {
      console.log(`[Meeting100ms] Tentativa ${attempt + 1} de entrar na sala...`);
      console.log("[Meeting100ms] Token:", authToken.substring(0, 20) + "...");
      console.log("[Meeting100ms] userName:", userName);
      console.log("[Meeting100ms] roomId:", roomId);
      
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
      }
      
      // Timeout de 30 segundos
      joinTimeoutRef.current = setTimeout(() => {
        if (isMounted && attempt < 2) {
          console.warn(`[Meeting100ms] Timeout de conexão (30s) - tentativa ${attempt + 2}...`);
          joinRoom(attempt + 1);
        } else if (isMounted) {
          setError("Timeout ao conectar à reunião.");
          setIsJoining(false);
        }
      }, 30000);
      
      await hmsActions.join({
        userName,
        authToken,
        settings: { isAudioMuted: false, isVideoMuted: false },
        rememberDeviceSelection: true
      });
      
      console.log("[Meeting100ms] join() resolveu - aguardando confirmação de conexão...");
      // NOTA: Não setamos isJoining = false aqui!
      // Aguardamos o useEffect abaixo confirmar isConnected
      
    } catch (err: any) {
      console.error("[Meeting100ms] Erro ao entrar na sala:", err);
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
      if (isMounted) {
        setError(err.message || "Erro ao conectar");
        setIsJoining(false);
      }
    }
  };
  
  joinRoom(0);
  
  return () => { 
    isMounted = false; 
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }
  };
}, [hmsActions, authToken, userName, roomId]);

// useEffect para confirmar conexão
useEffect(() => {
  if (isConnected && isJoining) {
    console.log("[Meeting100ms] Conexão confirmada! isConnected:", isConnected);
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }
    setIsJoining(false);  // Só agora removemos o loading
  }
}, [isConnected, isJoining]);
```

**Renderização condicional:**
```tsx
// Se está entrando, mostra loading
if (isJoining) {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span>Conectando à reunião...</span>
    </div>
  );
}

// Se deu erro, mostra erro
if (error) {
  return (
    <div className="flex items-center justify-center h-screen">
      <span className="text-destructive">{error}</span>
    </div>
  );
}

// Se não está conectado e não está entrando, algo deu errado
if (!isConnected) {
  return (
    <div className="flex items-center justify-center h-screen">
      <span>Aguardando conexão...</span>
    </div>
  );
}

// Sala conectada - renderiza participantes
return (
  <div className="meeting-room">
    {peers.map((peer) => (
      <PeerVideo key={peer.id} peer={peer} />
    ))}
  </div>
);
```

### 3.4 src/components/MeetingLobby.tsx

**Responsabilidades:**
- Captura preview de câmera/microfone local
- Coleta nome do participante
- Dispara callback `onJoin` ao clicar "Participar agora"

**Importante:** Ao clicar "Participar", para as tracks de mídia antes:
```tsx
const handleJoin = () => {
  if (!participantName.trim()) {
    setError("Por favor, insira seu nome");
    return;
  }

  // Para as tracks do preview antes de entrar
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setStream(null);
  }

  onJoin({ audioEnabled: isAudioEnabled, videoEnabled: isVideoEnabled });
};
```

### 3.5 server/routes/meetings.ts - Endpoint de Token Público

```typescript
// POST /api/public/reunioes/:id/token-public
publicRoomDesignRouter.post('/reunioes/:id/token-public', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName } = req.body;

    const [meeting] = await db.select().from(reunioes)
      .where(eq(reunioes.id, id))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }

    if (!meeting.roomId100ms) {
      return res.status(400).json({ error: 'Reunião não possui sala 100ms configurada' });
    }

    const credentials = await get100msCredentialsForTenant(meeting.tenantId);
    if (!credentials) {
      return res.status(400).json({ error: 'Credenciais do 100ms não configuradas' });
    }

    const participantRole = 'guest';  // Sempre guest para links públicos
    const participantName = userName || 'Visitante';

    const token = gerarTokenParticipante(
      meeting.roomId100ms,
      participantName,
      participantRole,
      credentials.appAccessKey,
      credentials.appSecret
    );

    res.json({ token });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao gerar token' });
  }
});
```

### 3.6 server/services/hms100ms.ts - Geração de Token

```typescript
export function gerarTokenParticipante(
  roomId: string,
  userId: string,
  role: string,
  appAccessKey: string,
  appSecret: string
): string {
  const payload = {
    access_key: appAccessKey,
    room_id: roomId,
    user_id: userId,
    role: role,
    type: 'app',
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, appSecret, {
    algorithm: 'HS256',
    expiresIn: '24h',
    jwtid: crypto.randomUUID(),
  });
}
```

---

## 4. TENTATIVAS DE CORREÇÃO JÁ REALIZADAS

### 4.1 Tentativa 1: useHMSNotifications para capturar erros
**Descrição:** Tentamos usar o hook `useHMSNotifications` com `HMSNotificationTypes.ERROR` para capturar erros do SDK.

**Resultado:** FALHOU - O hook não existe ou tem assinatura diferente no SDK v0.11.0. Causou erro de runtime.

**Código tentado:**
```tsx
// NÃO FUNCIONA NO SDK v0.11.0
import { useHMSNotifications, HMSNotificationTypes } from "@100mslive/react-sdk";

const notification = useHMSNotifications(HMSNotificationTypes.ERROR);
useEffect(() => {
  if (notification) {
    setError(notification.data.message);
  }
}, [notification]);
```

### 4.2 Tentativa 2: Setar isJoining = false imediatamente após join()
**Descrição:** Removemos o loading spinner assim que `hmsActions.join()` resolvia.

**Resultado:** FALHOU - O `join()` resolve ANTES da conexão real ser estabelecida. O loading desaparecia mas a sala ainda não estava pronta, causando tela preta.

**Código problemático:**
```tsx
await hmsActions.join({ ... });
setIsJoining(false);  // <- Muito cedo!
```

### 4.3 Tentativa 3: Aguardar isConnected via useEffect
**Descrição:** Criamos um useEffect separado que observa `isConnected` e só remove o loading quando confirma conexão.

**Resultado:** IMPLEMENTADO - Mas o problema persiste. Suspeitamos que `isConnected` nunca se torna `true` ou há outro problema.

**Código atual:**
```tsx
useEffect(() => {
  if (isConnected && isJoining) {
    console.log("[Meeting100ms] Conexão confirmada!");
    setIsJoining(false);
  }
}, [isConnected, isJoining]);
```

---

## 5. LOGS DE CONSOLE RELEVANTES

### 5.1 Logs do Servidor (Funcionando)
```
[Token Public] Gerando token para TestUser (guest) na sala 696533e7809415176eaa820c
POST /api/public/reunioes/d83c0a2b-33fd-477c-b1ee-7c4ee2f5031e/token-public 200 in 18ms
```

### 5.2 Logs do Cliente (Comportamento Esperado)
```
[Meeting100ms] Tentativa 1 de entrar na sala...
[Meeting100ms] Token: eyJhbGciOiJIUzI1NiIs...
[Meeting100ms] userName: TestUser
[Meeting100ms] roomId: 696533e7809415176eaa820c
[Meeting100ms] join() resolveu - aguardando confirmação de conexão...
[Meeting100ms] Conexão confirmada! isConnected: true  <- ESTE LOG NÃO APARECE
```

### 5.3 Erros de Console (Se houver)
Verificar se aparece:
- `WebSocket connection failed`
- `ICE connection failed`
- `Permission denied`
- `Token invalid`
- Qualquer erro do SDK 100ms

---

## 6. HIPÓTESES DE CAUSA RAIZ

### 6.1 Problema no Token
- Token pode estar expirado antes de ser usado
- Role "guest" pode não ter permissões adequadas no template 100ms
- Room ID pode estar incorreto ou sala desativada

**Verificação:**
```bash
# Decodificar token JWT para verificar claims
echo "TOKEN_AQUI" | cut -d'.' -f2 | base64 -d
```

### 6.2 Problema de Conexão WebRTC
- Firewall bloqueando conexões WebRTC
- NAT traversal falhando
- STUN/TURN servers não acessíveis

**Verificação:** Checar se há erros de ICE no console do navegador.

### 6.3 Problema de Inicialização do SDK
- `HMSRoomProvider` pode não estar inicializando corretamente
- Store do HMS pode estar em estado inválido
- Múltiplas instâncias do provider causando conflito

**Verificação:** Adicionar logs nos hooks do SDK:
```tsx
console.log("HMS Store State:", useHMSStore());
console.log("HMS Actions:", hmsActions);
```

### 6.4 Problema de Race Condition
- Track do lobby pode não estar sendo liberada corretamente
- SDK pode estar tentando usar device já em uso
- Estado pode estar sendo modificado durante renderização

### 6.5 Problema no Template 100ms
- Template pode não ter role "guest" configurada
- Permissões de publish/subscribe podem estar incorretas
- Sala pode ter expirado ou estar desativada

### 6.6 Problema de CORS/Proxy
- Ambiente Replit usa proxy que pode interferir
- Headers de CORS podem estar bloqueando WebSocket

---

## 7. PRÓXIMOS PASSOS SUGERIDOS

### 7.1 Debug Detalhado do SDK
Adicionar logs extensivos para entender o estado do SDK:

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    console.log("[DEBUG] HMS State:", {
      isConnected,
      isJoining,
      peersCount: peers.length,
      roomId: room?.id,
      roomState: room,
      localPeer: localPeer
    });
  }, 2000);
  
  return () => clearInterval(interval);
}, [isConnected, isJoining, peers, room, localPeer]);
```

### 7.2 Verificar Estado da Sala no 100ms Dashboard
1. Acessar dashboard.100ms.live
2. Verificar se a sala está ativa
3. Verificar se o template tem role "guest" com permissões corretas
4. Verificar logs de sessão da sala

### 7.3 Testar com Preview do SDK
Usar o `preview` antes do `join`:
```tsx
await hmsActions.preview({
  userName,
  authToken,
});
// Aguardar preview funcionar
await hmsActions.join();
```

### 7.4 Adicionar Error Boundaries
```tsx
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary fallback={<div>Erro no componente de reunião</div>}>
  <Meeting100ms {...props} />
</ErrorBoundary>
```

### 7.5 Verificar Compatibilidade do SDK
- SDK v0.11.0 pode ter bugs conhecidos
- Considerar atualizar para versão mais recente
- Verificar changelog do SDK

### 7.6 Testar em Modo Isolado
Criar um componente mínimo para testar o join:
```tsx
function MinimalMeeting({ token, roomId, userName }) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  
  useEffect(() => {
    hmsActions.join({ userName, authToken: token })
      .then(() => console.log("Join promise resolved"))
      .catch(err => console.error("Join error:", err));
  }, []);
  
  return <div>Connected: {String(isConnected)}</div>;
}
```

---

## 8. INFORMAÇÕES ADICIONAIS

### 8.1 Credenciais 100ms
- As credenciais são armazenadas criptografadas na tabela `hms100msConfig`
- Cada tenant tem suas próprias credenciais
- As credenciais incluem: `appAccessKey`, `appSecret`, `templateId`

### 8.2 Estrutura do Banco de Dados
```sql
-- Tabela de reuniões
CREATE TABLE reunioes (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  titulo TEXT,
  room_id_100ms TEXT,  -- ID da sala no 100ms
  status TEXT,
  data_hora TIMESTAMP
);

-- Tabela de configuração 100ms
CREATE TABLE hms_100ms_config (
  tenant_id TEXT PRIMARY KEY,
  app_access_key TEXT,  -- Criptografado
  app_secret TEXT,      -- Criptografado
  template_id TEXT,
  room_design_config JSONB
);
```

### 8.3 URLs Relevantes
- Página pública: `/reuniao/:id`
- Endpoint de token: `POST /api/public/reunioes/:id/token-public`
- Endpoint de dados: `GET /api/public/reunioes/:id/public`
- Endpoint de design: `GET /api/public/reunioes/:id/room-design-public`

### 8.4 Variáveis de Ambiente
- Não há variáveis de ambiente específicas do 100ms
- Credenciais são armazenadas no banco de dados por tenant

---

## 9. REPRODUÇÃO DO PROBLEMA

### 9.1 Pré-requisitos
1. Ter uma reunião criada com `roomId100ms` válido
2. Ter credenciais 100ms configuradas para o tenant

### 9.2 Passos para Reproduzir
1. Acessar `/reuniao/{meeting-id}` em uma aba anônima (sem login)
2. Aguardar lobby carregar
3. Digitar um nome no campo
4. Clicar em "Participar agora"
5. Observar: tela fica preta ou loading infinito

### 9.3 Comportamento Esperado
- Após clicar "Participar", usuário deve ver a sala de reunião com seu vídeo

### 9.4 Comportamento Atual
- Tela preta ou loading infinito após 30 segundos de timeout

---

## 10. CONTATO E RECURSOS

### 10.1 Documentação do 100ms
- React SDK: https://www.100ms.live/docs/javascript/v2/how-to-guides/install-the-sdk/integration
- API Reference: https://www.100ms.live/docs/javascript/v2/api-reference

### 10.2 Arquivos para Análise
- `src/components/Meeting100ms.tsx` (718 linhas)
- `src/pages/ReuniaoPublica.tsx` (260 linhas)
- `src/components/MeetingLobby.tsx` (291 linhas)
- `src/App.tsx` (60 linhas)
- `server/routes/meetings.ts` (1263 linhas)
- `server/services/hms100ms.ts` (242 linhas)

---

**FIM DO DOCUMENTO**

*Este documento foi gerado para auxiliar na investigação e resolução do problema de tela preta em reuniões públicas usando o SDK 100ms v0.11.0.*
