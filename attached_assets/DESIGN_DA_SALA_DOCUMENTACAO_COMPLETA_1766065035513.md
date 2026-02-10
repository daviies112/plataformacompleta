# Documentação Completa - Página "Design da Sala"

## 📋 Visão Geral

A página **"Design da Sala"** (`/room-design`) é um painel de configuração avançado que permite personalizar completamente a experiência visual e funcional das salas de videoconferência para cada tenant (empresa) no MeetFlow.

Através desta página, você pode customizar:
- **Marca da empresa** (logo, nome, posicionamento)
- **Esquema de cores** (background, controles, botões, avatares)
- **Lobby** (tela de espera antes de entrar)
- **Reunião** (interface durante a videoconferência)
- **Tela de encerramento** (o que aparece quando a reunião termina)

---

## 🏗️ Arquitetura da Solução

### Localização dos Arquivos

```
projeto/
├── client/
│   └── src/
│       ├── pages/
│       │   └── RoomDesignSettings.tsx       # Página principal
│       ├── components/
│       │   └── Sidebar.tsx                  # Menu com link para Design
│       ├── types/
│       │   └── reuniao.ts                   # Tipos TypeScript
│       └── hooks/
│           └── use-toast.ts                 # Notificações
├── server/
│   └── routes.ts                             # APIs do backend
├── shared/
│   └── schema.ts                             # Schema do banco de dados
```

---

## 📦 Tipos TypeScript

### RoomDesignConfig

Localização: `client/src/types/reuniao.ts`

```typescript
export interface RoomDesignConfig {
  branding: {
    logo?: string | null;                    // URL da imagem do logo
    logoSize?: number;                        // Tamanho do logo em pixels (padrão: 40)
    logoPosition?: 'left' | 'center' | 'right'; // Posição do logo
    companyName?: string;                     // Nome da empresa
    showCompanyName?: boolean;                 // Exibir nome ao lado do logo
    showLogoInLobby?: boolean;                 // Mostrar logo na tela de lobby
    showLogoInMeeting?: boolean;               // Mostrar logo durante a reunião
  };
  
  colors: {
    background: string;                       // Cor de fundo principal (#0f172a)
    controlsBackground: string;               // Fundo dos controles (#18181b)
    controlsText: string;                     // Cor do texto dos controles (#ffffff)
    primaryButton: string;                    // Cor do botão principal (#3b82f6)
    dangerButton: string;                     // Cor do botão de perigo (#ef4444)
    avatarBackground: string;                 // Fundo do avatar (#3b82f6)
    avatarText: string;                       // Cor do texto no avatar (#ffffff)
    participantNameBackground: string;        // Fundo do nome do participante
    participantNameText: string;              // Cor do nome do participante
  };
  
  lobby: {
    title?: string;                           // "Pronto para participar?"
    subtitle?: string;                        // Subtítulo opcional
    buttonText?: string;                      // "Participar agora"
    showDeviceSelectors?: boolean;             // Permitir escolher dispositivos
    showCameraPreview?: boolean;               // Mostrar preview da câmera
    backgroundImage?: string | null;          // URL da imagem de fundo
  };
  
  meeting: {
    showParticipantCount?: boolean;            // Mostrar contador de participantes
    showMeetingCode?: boolean;                 // Mostrar código da reunião
    showRecordingIndicator?: boolean;          // Mostrar indicador de gravação
    enableReactions?: boolean;                 // Ativar reações com emojis
    enableChat?: boolean;                      // Ativar chat
    enableScreenShare?: boolean;               // Ativar compartilhamento de tela
    enableRaiseHand?: boolean;                 // Ativar função "levantar mão"
  };
  
  endScreen: {
    title?: string;                           // "Reunião Encerrada"
    message?: string;                         // "Obrigado por participar!"
    showFeedback?: boolean;                   // Coletar feedback
    redirectUrl?: string | null;              // URL para redirecionar após reunião
  };
}
```

### Configuração Padrão

```typescript
export const DEFAULT_ROOM_DESIGN_CONFIG: RoomDesignConfig = {
  branding: {
    logo: null,
    logoSize: 40,
    logoPosition: 'left',
    companyName: '',
    showCompanyName: true,
    showLogoInLobby: true,
    showLogoInMeeting: true,
  },
  colors: {
    background: '#0f172a',
    controlsBackground: '#18181b',
    controlsText: '#ffffff',
    primaryButton: '#3b82f6',
    dangerButton: '#ef4444',
    avatarBackground: '#3b82f6',
    avatarText: '#ffffff',
    participantNameBackground: 'rgba(0, 0, 0, 0.6)',
    participantNameText: '#ffffff',
  },
  lobby: {
    title: 'Pronto para participar?',
    subtitle: '',
    buttonText: 'Participar agora',
    showDeviceSelectors: true,
    showCameraPreview: true,
    backgroundImage: null,
  },
  meeting: {
    showParticipantCount: true,
    showMeetingCode: true,
    showRecordingIndicator: true,
    enableReactions: true,
    enableChat: true,
    enableScreenShare: true,
    enableRaiseHand: true,
  },
  endScreen: {
    title: 'Reunião Encerrada',
    message: 'Obrigado por participar!',
    showFeedback: false,
    redirectUrl: null,
  },
};
```

---

## 🗄️ Schema do Banco de Dados

### Tabela: tenants

Localização: `shared/schema.ts`

```typescript
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  slug: text("slug").unique().notNull(),
  email: text("email"),
  telefone: text("telefone"),
  logoUrl: text("logo_url"),
  
  // Configuração de design da sala - JSONB
  roomDesignConfig: jsonb("room_design_config").default({
    branding: {
      logo: null,
      logoSize: 40,
      companyName: '',
      showCompanyName: true
    },
    colors: {
      background: '#0f172a',
      controlsBackground: '#18181b',
      controlsText: '#ffffff',
      primaryButton: '#3b82f6',
      dangerButton: '#ef4444',
      avatarBackground: '#3b82f6',
      avatarText: '#ffffff',
      participantNameBackground: 'rgba(0, 0, 0, 0.6)',
      participantNameText: '#ffffff'
    },
    lobby: {
      title: 'Pronto para participar?',
      subtitle: '',
      buttonText: 'Participar agora',
      showDeviceSelectors: true,
      showCameraPreview: true,
      backgroundImage: null
    },
    meeting: {
      showParticipantCount: true,
      showMeetingCode: true,
      showRecordingIndicator: true,
      enableReactions: true,
      enableChat: true,
      enableScreenShare: true,
      enableRaiseHand: true
    },
    endScreen: {
      title: 'Reunião Encerrada',
      message: 'Obrigado por participar!',
      showFeedback: false,
      redirectUrl: null
    }
  }),
  
  configuracoes: jsonb("configuracoes"),
  token100ms: text("token_100ms"),
  appAccessKey: text("app_access_key"),
  appSecret: text("app_secret"),
  templateId100ms: text("template_id_100ms"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => [
  index("tenants_slug_idx").on(table.slug),
]);
```

---

## 🔌 APIs do Backend

### 1. GET /api/tenant
Obter configuração atual do tenant

**Localização:** `server/routes.ts`

```typescript
app.get("/api/tenant", requireAuth, requireTenant, async (req: Request, res: Response) => {
  try {
    const tenant = req.tenant;
    return res.json(tenant);
  } catch (error) {
    console.error("[Tenant] Get tenant error:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});
```

**Resposta:**
```json
{
  "id": "e5de43e4-8345-4dcf-87c8-c1b1aa352f69",
  "nome": "MeetFlow",
  "slug": "meetflow",
  "email": "admin@meetflow.local",
  "logoUrl": "/uploads/logo-1234567890.png",
  "roomDesignConfig": {
    "branding": { ... },
    "colors": { ... },
    "lobby": { ... },
    "meeting": { ... },
    "endScreen": { ... }
  }
}
```

---

### 2. PATCH /api/tenant/room-design
Atualizar configuração de design

**Localização:** `server/routes.ts`

```typescript
app.patch("/api/tenant/room-design", requireAuth, requireTenant, async (req: Request, res: Response) => {
  try {
    const { roomDesignConfig } = req.body;

    if (!roomDesignConfig) {
      return res.status(400).json({ message: "roomDesignConfig é obrigatório" });
    }

    const [updatedTenant] = await db
      .update(tenants)
      .set({ roomDesignConfig, updatedAt: new Date() })
      .where(eq(tenants.id, req.tenant!.id))
      .returning();

    return res.json(updatedTenant);
  } catch (error) {
    console.error("[Tenant] Update room design error:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});
```

**Requisição:**
```json
{
  "roomDesignConfig": {
    "branding": { ... },
    "colors": { ... },
    "lobby": { ... },
    "meeting": { ... },
    "endScreen": { ... }
  }
}
```

**Resposta:** Retorna o tenant atualizado com a nova configuração.

---

### 3. POST /api/upload/logo
Upload do logo da empresa

**Localização:** `server/routes.ts`

```typescript
app.post("/api/upload/logo", requireAuth, upload.single('logo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Arquivo não foi enviado" });
    }

    const filename = `logo-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const mimeType = req.file.mimetype;
    const extension = mimeType.split('/')[1];
    const finalFilename = `${filename}.${extension}`;

    // Salvar arquivo em ./uploads
    const uploadsDir = path.join(import.meta.dirname, '..', 'uploads');
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    
    const filepath = path.join(uploadsDir, finalFilename);
    await fs.promises.writeFile(filepath, req.file.buffer);

    const url = `/uploads/${finalFilename}`;
    return res.json({ url });
  } catch (error) {
    console.error("[Upload] Logo upload error:", error);
    return res.status(500).json({ message: "Erro ao fazer upload do logo" });
  }
});
```

**Requisição (FormData):**
```
POST /api/upload/logo
Content-Type: multipart/form-data

logo: <arquivo>
```

**Resposta:**
```json
{
  "url": "/uploads/logo-1765378945170-166738835.png"
}
```

---

## 🎨 Componente Principal: RoomDesignSettings

Localização: `client/src/pages/RoomDesignSettings.tsx`

### Estrutura da Página

```
┌─────────────────────────────────────────────────────────┐
│  Design da Sala de Reunião        [Restaurar] [Salvar]  │
└─────────────────────────────────────────────────────────┘
│
├─ Left Panel (Configurações em Abas)
│  ├─ Marca
│  │  ├─ Upload Logo
│  │  ├─ Tamanho do Logo
│  │  ├─ Posição do Logo
│  │  ├─ Mostrar na Lobby
│  │  ├─ Mostrar na Reunião
│  │  ├─ Nome da Empresa
│  │  └─ Mostrar Nome da Empresa
│  │
│  ├─ Cores
│  │  ├─ Temas Predefinidos (5 presets)
│  │  ├─ Fundo
│  │  ├─ Fundo dos Controles
│  │  ├─ Texto dos Controles
│  │  ├─ Botão Principal
│  │  ├─ Botão de Perigo
│  │  ├─ Avatar (Fundo)
│  │  └─ Avatar (Texto)
│  │
│  ├─ Lobby
│  │  ├─ Título
│  │  ├─ Subtítulo
│  │  ├─ Texto do Botão
│  │  ├─ Preview da Câmera
│  │  ├─ Seletores de Dispositivos
│  │  └─ Imagem de Fundo
│  │
│  ├─ Reunião
│  │  ├─ Contador de Participantes
│  │  ├─ Código da Reunião
│  │  ├─ Indicador de Gravação
│  │  ├─ Reações com Emojis
│  │  ├─ Levantar Mão
│  │  ├─ Compartilhar Tela
│  │  └─ Chat
│  │
│  └─ Fim
│     ├─ Título
│     ├─ Mensagem
│     ├─ Coletar Feedback
│     └─ URL de Redirecionamento
│
└─ Right Panel (Preview)
   ├─ Desktop / Mobile Toggle
   ├─ Lobby / Reunião / Fim Tabs
   └─ Live Preview
```

---

## 🎯 Componentes Internos

### ColorInput

Componente para editar cores com picker visual:

```typescript
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith("rgba") ? "#000000" : value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-zinc-600"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 h-8 text-xs bg-zinc-700 border-zinc-600"
        />
      </div>
    </div>
  );
}
```

---

### RoomPreview

Componente que renderiza preview ao vivo das mudanças:

```typescript
function RoomPreview({
  config,
  previewMode,
}: {
  config: RoomDesignConfig;
  previewMode: "lobby" | "meeting" | "end";
})
```

#### Preview de Lobby

Exibe:
- Logo com posicionamento configurável
- Título e subtítulo
- Preview do avatar
- Botão de participação

```typescript
if (previewMode === "lobby") {
  return (
    <div style={{
      backgroundColor: config.colors.background,
      backgroundImage: config.lobby.backgroundImage
        ? `url(${config.lobby.backgroundImage})`
        : undefined,
    }}>
      {/* Logo */}
      {config.branding.showLogoInLobby !== false && config.branding.logo && (
        <div className={`flex items-center gap-2 p-3 ${getLogoJustify()}`}>
          <img src={config.branding.logo} alt="" />
          {config.branding.showCompanyName && (
            <span>{config.branding.companyName}</span>
          )}
        </div>
      )}
      
      {/* Preview da Reunião */}
      <div className="grid grid-cols-2 gap-4 p-4">
        {/* Avatar e Botão */}
      </div>
    </div>
  );
}
```

#### Preview de Reunião

Exibe:
- Header com logo/nome
- Grid 2x2 com avatares dos participantes
- Controles (mic, vídeo, compartilhar tela, etc)
- Indicador de participantes

```typescript
if (previewMode === "meeting") {
  return (
    <div style={{ backgroundColor: config.colors.background }}>
      {/* Header */}
      <div style={{
        backgroundColor: config.colors.controlsBackground,
        justifyContent: logoPosition === "center" ? "center" : "space-between",
      }}>
        {/* Logo e Nome */}
      </div>
      
      {/* Grid de Participantes */}
      <div className="flex-1 grid grid-cols-2 gap-2 p-2">
        {[1, 2].map((i) => (
          <div key={i}>
            {/* Avatar com Nome */}
          </div>
        ))}
      </div>
      
      {/* Controles */}
      <div style={{ backgroundColor: config.colors.controlsBackground }}>
        <Button><Mic /></Button>
        <Button><VideoIcon /></Button>
        {config.meeting.enableScreenShare && <Button><MonitorUp /></Button>}
        {/* ... mais botões */}
      </div>
    </div>
  );
}
```

#### Preview de Tela de Encerramento

Exibe:
- Título customizado
- Mensagem de encerramento
- Botão de fechamento

---

## 🎨 Temas Predefinidos

A página inclui 5 temas de cores pré-configurados:

```typescript
const COLOR_PRESETS = [
  {
    name: "Escuro Padrão",
    colors: {
      background: "#0f172a",
      controlsBackground: "#18181b",
      controlsText: "#ffffff",
      primaryButton: "#3b82f6",
      dangerButton: "#ef4444",
      // ...
    },
  },
  {
    name: "Azul Profissional",
    colors: {
      background: "#1e3a5f",
      controlsBackground: "#0f2744",
      // ...
    },
  },
  {
    name: "Verde Natureza",
    colors: {
      background: "#1a2e1a",
      // ...
    },
  },
  {
    name: "Roxo Elegante",
    colors: {
      background: "#2e1a4a",
      // ...
    },
  },
  {
    name: "Cinza Neutro",
    colors: {
      background: "#27272a",
      // ...
    },
  },
];
```

---

## 💾 Fluxo de Dados

### Carregamento Inicial

```
1. Usuário acessa /room-design
   ↓
2. useQuery("/api/tenant") é executado
   ↓
3. Backend retorna dados do tenant com roomDesignConfig
   ↓
4. useEffect carrega config no estado local
   ↓
5. RoomPreview atualiza em tempo real
```

### Salvamento de Alterações

```
1. Usuário clica "Salvar Alterações"
   ↓
2. handleSave() é chamado
   ↓
3. saveMutation executa PATCH /api/tenant/room-design
   ↓
4. Backend atualiza roomDesignConfig no banco
   ↓
5. onSuccess dispara toast notification
   ↓
6. queryClient.invalidateQueries atualiza cache
```

---

## 📱 Integração com a Sala de Reunião

### Como as Configurações são Usadas

As configurações de `roomDesignConfig` são utilizadas nos seguintes componentes:

#### 1. MeetingLobby
```typescript
<div style={{
  backgroundColor: config.colors.background,
  backgroundImage: config.lobby.backgroundImage
}}>
  {config.lobby.title}
  {config.lobby.subtitle}
  {/* ... */}
</div>
```

#### 2. Meeting100ms
```typescript
<div style={{
  backgroundColor: config.colors.background,
  color: config.colors.controlsText
}}>
  {/* Renderiza video com cores customizadas */}
</div>
```

#### 3. PublicMeetingRoom
Usa `roomDesignConfig` para renderizar a experiência visual de clientes externos

---

## 🔄 Funções Principais do RoomDesignSettings

### updateConfig

Atualiza um valor no estado local de forma imutável:

```typescript
const updateConfig = (path: string, value: any) => {
  setConfig((prev) => {
    const newConfig = { ...prev };
    const keys = path.split(".");
    let current: any = newConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    return newConfig;
  });
};
```

**Uso:**
```typescript
updateConfig("colors.background", "#000000")
updateConfig("lobby.title", "Novo título")
updateConfig("meeting.enableChat", false)
```

---

### applyPreset

Aplica um tema predefinido:

```typescript
const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
  setConfig((prev) => ({
    ...prev,
    colors: { ...preset.colors },
  }));
};
```

---

### handleSave

Dispara a mutação para salvar no backend:

```typescript
const handleSave = () => {
  saveMutation.mutate(config);
};
```

---

### handleReset

Restaura as configurações padrão:

```typescript
const handleReset = () => {
  setConfig({
    ...DEFAULT_ROOM_DESIGN_CONFIG,
    branding: {
      ...DEFAULT_ROOM_DESIGN_CONFIG.branding,
      logo: tenant?.logoUrl,
      companyName: tenant?.nome,
    },
  });
};
```

---

### handleFileUpload

Faz upload do logo e salva a URL:

```typescript
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setIsUploading(true);
  try {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await api.post('/api/upload/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (response.data.url) {
      updateConfig("branding.logo", response.data.url);
      toast({ title: "Logo enviado!", description: "O logo foi carregado com sucesso." });
    }
  } catch (error: any) {
    toast({ 
      variant: "destructive", 
      title: "Erro", 
      description: error.response?.data?.message || "Não foi possível enviar o logo." 
    });
  } finally {
    setIsUploading(false);
  }
};
```

---

## 🧩 Integração com o Sidebar

### Localização: client/src/components/Sidebar.tsx

```typescript
const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Calendar, label: "Calendário", href: "/calendario" },
  { icon: Video, label: "Gravações", href: "/gravacoes" },
  { icon: Palette, label: "Design da Sala", href: "/room-design" },  // ← Aqui
  { icon: Settings, label: "Configurações", href: "/configuracoes" },
];
```

---

## 🚀 Exemplo de Uso Completo

### 1. Carregar Configuração Atual

```typescript
const { data: tenant } = useQuery({
  queryKey: ["/api/tenant"],
  queryFn: async () => {
    const response = await api.get("/api/tenant");
    return response.data;
  },
});
```

### 2. Modificar Configuração Localmente

```typescript
// Mudar background
updateConfig("colors.background", "#1a2e1a");

// Mudar título do lobby
updateConfig("lobby.title", "Bem-vindo à nossa reunião!");

// Ativar/desativar recurso
updateConfig("meeting.enableChat", false);

// Mudar logo
updateConfig("branding.logo", "/uploads/novo-logo.png");
```

### 3. Salvar no Backend

```typescript
const saveMutation = useMutation({
  mutationFn: async (newConfig: RoomDesignConfig) => {
    const response = await api.patch("/api/tenant/room-design", { 
      roomDesignConfig: newConfig 
    });
    return response.data;
  },
  onSuccess: () => {
    toast({ title: "Configurações salvas!" });
    queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
  },
});

// Disparar salvamento
handleSave(); // ou saveMutation.mutate(config);
```

---

## 🎯 Recursos e Funcionalidades

### 1. Upload de Logo
- Formatos aceitos: JPG, PNG, GIF, SVG, WebP
- Tamanho máximo: 5MB
- Logo salvo em `/uploads/`
- URL armazenada em `branding.logo`

### 2. Gerenciador de Cores
- Color picker visual
- Input de texto para códigos hex/rgba
- Suporte a cores RGBA
- 5 temas pré-configurados

### 3. Preview em Tempo Real
- Atualiza conforme você muda as configurações
- 3 visualizações: Lobby, Reunião, Fim
- Toggle Desktop/Mobile
- Renderização de elementos reais da interface

### 4. Armazenamento
- Todas as configurações armazenadas em JSONB no banco
- Fácil recuperação e comparação
- Suporta rollback a versões anteriores

### 5. Validação
- Backend valida presença de `roomDesignConfig`
- Tipos TypeScript garantem estrutura correta
- Input de cores validado

---

## 🔐 Segurança

### Autenticação
- Endpoint protegido por `requireAuth`
- Apenas usuários autenticados podem acessar

### Autorização
- Middleware `requireTenant` garante isolamento de dados
- Cada usuário só pode editar seu próprio tenant

### Validação
- Validação no backend do objeto `roomDesignConfig`
- Tipagem TypeScript no frontend

---

## 📊 Exemplo de Payload Completo

### Requisição PATCH /api/tenant/room-design

```json
{
  "roomDesignConfig": {
    "branding": {
      "logo": "/uploads/logo-1765378945170-166738835.png",
      "logoSize": 50,
      "logoPosition": "center",
      "companyName": "Acme Corp",
      "showCompanyName": true,
      "showLogoInLobby": true,
      "showLogoInMeeting": true
    },
    "colors": {
      "background": "#1e3a5f",
      "controlsBackground": "#0f2744",
      "controlsText": "#ffffff",
      "primaryButton": "#2563eb",
      "dangerButton": "#dc2626",
      "avatarBackground": "#2563eb",
      "avatarText": "#ffffff",
      "participantNameBackground": "rgba(0, 0, 0, 0.7)",
      "participantNameText": "#ffffff"
    },
    "lobby": {
      "title": "Bem-vindo!",
      "subtitle": "Clique para participar da reunião",
      "buttonText": "Entrar Agora",
      "showDeviceSelectors": true,
      "showCameraPreview": true,
      "backgroundImage": "https://example.com/bg.jpg"
    },
    "meeting": {
      "showParticipantCount": true,
      "showMeetingCode": false,
      "showRecordingIndicator": true,
      "enableReactions": true,
      "enableChat": true,
      "enableScreenShare": true,
      "enableRaiseHand": true
    },
    "endScreen": {
      "title": "Obrigado!",
      "message": "Sua reunião foi encerrada com sucesso",
      "showFeedback": true,
      "redirectUrl": "https://example.com/feedback"
    }
  }
}
```

### Resposta (Tenant Atualizado)

```json
{
  "id": "e5de43e4-8345-4dcf-87c8-c1b1aa352f69",
  "nome": "Acme Corp",
  "slug": "acme-corp",
  "email": "admin@acme.com",
  "logoUrl": "/uploads/logo-1765378945170-166738835.png",
  "roomDesignConfig": { ... },
  "createdAt": "2025-12-10T10:30:00Z",
  "updatedAt": "2025-12-18T13:30:00Z"
}
```

---

## 🎬 Fluxo Visual Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. Página Carregada                          │
│  • Query /api/tenant retorna config                             │
│  • Config carregada em estado local                             │
│  • Preview renderiza com cores padrão                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 2. Usuário Edita Configurações                  │
│  • Muda cor do background                                       │
│  • Preview atualiza em tempo real                               │
│  • Estado local reflete mudança                                 │
│  • Banco NÃO foi alterado ainda                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│             3. Usuário Clica "Salvar Alterações"                │
│  • saveMutation.mutate(config) é disparado                      │
│  • Botão fica em estado loading                                 │
│  • Requisição PATCH enviada para backend                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            4. Backend Processa Atualização                      │
│  • Valida roomDesignConfig                                      │
│  • Atualiza registro no banco                                   │
│  • Retorna tenant atualizado                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              5. Frontend Processa Resposta                       │
│  • Toast notification mostra sucesso                            │
│  • Cache invalidado com queryClient                             │
│  • Novo query disparado se necessário                           │
│  • Configuração salva com sucesso!                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🐛 Debugging e Troubleshooting

### Problema: Preview não atualiza
**Solução:** Verificar se `updateConfig` está sendo chamado corretamente
```typescript
// ✓ Correto
updateConfig("colors.background", "#000000");

// ✗ Incorreto
config.colors.background = "#000000"; // Mutação direta
```

### Problema: Upload de logo falha
**Solução:** Verificar:
- Formato do arquivo (JPG, PNG, GIF, SVG, WebP)
- Tamanho < 5MB
- Diretório `/uploads/` tem permissão de escrita

### Problema: Mudanças não são salvadas
**Solução:** Verificar:
- Usuário está autenticado
- Backend retornou sucesso (status 200)
- Console do browser não mostra erros

---

## 📚 Dependências e Imports

```typescript
// Página Principal
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { RoomDesignConfig, DEFAULT_ROOM_DESIGN_CONFIG } from "@/types/reuniao";
```

---

## 🎓 Conclusão

A página **"Design da Sala"** oferece um sistema completo e flexível para personalização de salas de videoconferência. Com interface intuitiva, preview em tempo real e armazenamento seguro, permite que cada empresa customize completamente a experiência de seus clientes mantendo a marca corporativa.

### Pontos-chave:
✅ Configuração completa e flexível
✅ Preview em tempo real
✅ Suporte a temas predefinidos
✅ Upload de logo
✅ Armazenamento seguro em banco de dados
✅ APIs bem estruturadas
✅ Tipagem TypeScript completa
✅ Isolamento por tenant (multi-tenant)

