# Documentação Técnica: Sistema de Gravação e Listagem de Reuniões - MeetFlow

Este documento detalha o funcionamento técnico do sistema de gravação de reuniões integrado com a plataforma 100ms e a listagem automática no dashboard do MeetFlow.

## 1. Arquitetura Geral

O sistema utiliza a API v2 da **100ms.live** para gerenciar sessões de vídeo e gravações. O fluxo consiste em:
1.  **Backend (Express + Drizzle ORM):** Gerencia credenciais, cria salas, inicia/para gravações e consulta o status dos assets.
2.  **Frontend (React + 100ms SDK):** Interface de controle para o usuário iniciar a gravação durante a reunião.
3.  **Banco de Dados (PostgreSQL):** Armazena metadados das gravações para listagem instantânea.

---

## 2. Configuração de Credenciais

As credenciais são armazenadas na tabela `tenants` e priorizadas via variáveis de ambiente (Secrets) para segurança:

- `HMS_APP_ACCESS_KEY`: Chave de acesso da API 100ms.
- `HMS_APP_SECRET`: Segredo da API para geração de tokens JWT.
- `HMS_TEMPLATE_ID`: ID do template configurado no painel da 100ms (deve ter a opção "Recording" habilitada).

---

## 3. Implementação do Backend (Node.js)

### Serviço 100ms (`server/services/hms100ms.ts`)

Este serviço lida com a comunicação direta com a 100ms.

```typescript
// Geração de Token de Gerenciamento (Management Token)
export function generateManagementToken(appAccessKey: string, appSecret: string): string {
  const payload = {
    access_key: appAccessKey,
    type: 'management',
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
  };
  return jwt.sign(payload, appSecret, { algorithm: 'HS256', expiresIn: '24h' });
}

// Iniciar Gravação
export async function iniciarGravacao(roomId: string, appAccessKey: string, appSecret: string, meetingUrl: string) {
  const token = generateManagementToken(appAccessKey, appSecret);
  const response = await axios.post(`${HMS_API_URL}/recordings/room/${roomId}/start`, {
    meeting_url: meetingUrl,
    resolution: { width: 1280, height: 720 },
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}
```

### Rotas de API (`server/routes.ts`)

Endpoint para disparar a gravação:

```typescript
app.post("/api/reunioes/:id/gravacao/iniciar", async (req, res) => {
  const { id } = req.params;
  const reuniao = await db.query.reunioes.findFirst({ where: eq(reunioes.id, id) });
  
  const hmsAccessKey = process.env.HMS_APP_ACCESS_KEY;
  const hmsAppSecret = process.env.HMS_APP_SECRET;
  
  const recording = await iniciarGravacao(reuniao.roomId100ms, hmsAccessKey, hmsAppSecret, reuniao.linkReuniao);
  
  // Salva no banco para aparecer na listagem
  await db.insert(gravacoes).values({
    reuniaoId: id,
    tenantId: req.tenant.id,
    recordingId100ms: recording.id,
    status: 'recording'
  });
  
  res.json({ success: true });
});
```

---

## 4. Implementação do Frontend (React)

### Componente de Reunião (`client/src/components/Meeting100ms.tsx`)

O controle de gravação é um botão simples que chama a API do MeetFlow:

```tsx
const toggleRecording = async () => {
  setIsRecordingLoading(true);
  try {
    if (isRecording) {
      await api.post(`/api/reunioes/${meetingId}/gravacao/parar`);
      setIsRecording(false);
    } else {
      await api.post(`/api/reunioes/${meetingId}/gravacao/iniciar`);
      setIsRecording(true);
    }
  } catch (error) {
    toast({ variant: "destructive", title: "Erro na gravação" });
  } finally {
    setIsRecordingLoading(false);
  }
};
```

---

## 5. Exibição na Página de Gravações

Para que o usuário veja o vídeo, o sistema realiza os seguintes passos:
1.  **Listagem:** Busca todos os registros na tabela `gravacoes` vinculados ao `tenantId` do usuário logado.
2.  **Sincronização de URL:** Como as URLs da 100ms expiram, o backend gera uma URL pré-assinada (Presigned URL) sob demanda quando o usuário clica para assistir.

### Endpoint de URL Dinâmica:
```typescript
app.get("/api/gravacoes/:id/url", async (req, res) => {
  const gravacao = await db.query.gravacoes.findFirst({ where: eq(gravacoes.id, req.params.id) });
  
  // Busca URL temporária na 100ms
  const presigned = await obterUrlPresignadaAsset(gravacao.assetId, key, secret);
  res.json({ url: presigned.url });
});
```

---

## 6. Esquema do Banco de Dados (Drizzle)

```typescript
export const gravacoes = pgTable("gravacoes", {
  id: uuid("id").primaryKey().defaultNow(),
  reuniaoId: uuid("reuniao_id").references(() => reunioes.id),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  recordingId100ms: text("recording_id_100ms"),
  status: text("status").default("recording"), // recording, completed, failed
  fileUrl: text("file_url"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## 7. Resumo do Fluxo de Sucesso
1. Usuário entra na sala e clica em **"Gravar"**.
2. O sistema solicita que o **HMS Beam** (bot de gravação) entre na sala.
3. Ao finalizar, o bot processa o vídeo e gera um **Asset ID**.
4. O MeetFlow recebe o status de finalização e atualiza o registro no banco.
5. O usuário acessa a aba **"Gravações"**, onde o vídeo aparece pronto para ser assistido ou baixado.
