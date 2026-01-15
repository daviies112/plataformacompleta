# Documentação Completa - Fluxo de Assinatura Digital

**Última atualização:** 15 de Janeiro de 2026  
**Versão:** 2.0  
**Status:** ✅ Funcionando

---

## Índice

1. [Visão Geral do Fluxo](#1-visão-geral-do-fluxo)
2. [Diagrama de Arquitetura](#2-diagrama-de-arquitetura)
3. [Tabelas do Banco de Dados (Supabase)](#3-tabelas-do-banco-de-dados-supabase)
4. [Fluxo Completo Passo a Passo](#4-fluxo-completo-passo-a-passo)
5. [Endpoints da API](#5-endpoints-da-api)
6. [Componentes Frontend](#6-componentes-frontend)
7. [Serviços Backend](#7-serviços-backend)
8. [Integração N8N para WhatsApp](#8-integração-n8n-para-whatsapp)
9. [Busca de Dados da Tabela form_submissions](#9-busca-de-dados-da-tabela-form_submissions)
10. [Problemas Comuns e Soluções](#10-problemas-comuns-e-soluções)
11. [Código Crítico - Referência Rápida](#11-código-crítico---referência-rápida)
12. [Checklist de Debugging](#12-checklist-de-debugging)

---

## 1. Visão Geral do Fluxo

O fluxo de assinatura digital permite que usuários assinem contratos após uma reunião via videoconferência. O fluxo pode ser iniciado de duas formas:

### Opção A: Durante/Após a Reunião
1. Usuário participa da reunião (100ms SDK)
2. Ao clicar em "Sair" ou "Assinar", é redirecionado para a página de assinatura
3. O sistema cria automaticamente um contrato no Supabase
4. Dados do `form_submissions` são buscados para preencher informações automaticamente

### Opção B: Via Link WhatsApp (N8N)
1. Contrato é criado com `whatsapp_enviado = FALSE`
2. N8N faz polling na tabela `contracts` 
3. N8N envia link via WhatsApp
4. Usuário acessa link e assina

---

## 2. Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DE ASSINATURA DIGITAL                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Reunião    │────▶│   Contrato   │────▶│ Verificação  │────▶│  Assinatura  │
│   (100ms)    │     │   Criado     │     │   Facial     │     │   Digital    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       │                    ▼                    │                    ▼
       │           ┌──────────────┐              │           ┌──────────────┐
       │           │   Supabase   │              │           │   Contrato   │
       │           │  (contracts) │◀─────────────┴──────────▶│   Assinado   │
       │           └──────────────┘                          └──────────────┘
       │                    │
       │                    ▼
       │           ┌──────────────┐     ┌──────────────┐
       │           │     N8N      │────▶│   WhatsApp   │
       │           │  (Polling)   │     │    Envio     │
       │           └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│    form_     │  ◀── Busca dados automaticamente por telefone/email
│ submissions  │
└──────────────┘
```

---

## 3. Tabelas do Banco de Dados (Supabase)

### Tabela: `contracts`

```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR,
  client_name VARCHAR NOT NULL,
  client_cpf VARCHAR NOT NULL DEFAULT '',
  client_email VARCHAR NOT NULL DEFAULT '',
  client_phone VARCHAR NOT NULL DEFAULT '',
  status VARCHAR DEFAULT 'pending',  -- 'pending', 'signed', 'cancelled'
  access_token VARCHAR UNIQUE,       -- Token para acesso público (UUID)
  protocol_number VARCHAR,
  contract_html TEXT,
  signed_contract_html TEXT,
  
  -- Campos de verificação facial
  selfie_photo TEXT,                 -- Base64 da selfie
  document_photo TEXT,               -- Base64 do documento (frente)
  document_back_photo TEXT,          -- Base64 do documento (verso)
  
  -- Campos de endereço
  address_street VARCHAR,
  address_number VARCHAR,
  address_complement VARCHAR,
  address_city VARCHAR,
  address_state VARCHAR,
  address_zipcode VARCHAR,
  
  -- Configurações de branding
  logo_url TEXT,
  logo_size VARCHAR,
  logo_position VARCHAR,
  primary_color VARCHAR,
  text_color VARCHAR,
  font_family VARCHAR,
  font_size VARCHAR,
  company_name VARCHAR,
  footer_text TEXT,
  
  -- Configurações de verificação
  verification_primary_color VARCHAR,
  verification_text_color VARCHAR,
  verification_welcome_text TEXT,
  verification_instructions TEXT,
  verification_footer_text TEXT,
  verification_security_text TEXT,
  verification_header_company_name VARCHAR,
  verification_header_background_color VARCHAR,
  
  -- Configurações de progresso
  progress_card_color VARCHAR,
  progress_button_color VARCHAR,
  progress_text_color VARCHAR,
  progress_title VARCHAR,
  progress_subtitle TEXT,
  progress_step1_title VARCHAR,
  progress_step1_description TEXT,
  progress_step2_title VARCHAR,
  progress_step2_description TEXT,
  progress_step3_title VARCHAR,
  progress_step3_description TEXT,
  progress_button_text VARCHAR,
  progress_font_family VARCHAR,
  
  -- Configurações de parabéns
  parabens_title VARCHAR,
  parabens_subtitle TEXT,
  parabens_description TEXT,
  parabens_card_color VARCHAR,
  parabens_background_color VARCHAR,
  parabens_button_color VARCHAR,
  parabens_text_color VARCHAR,
  parabens_font_family VARCHAR,
  parabens_form_title VARCHAR,
  parabens_button_text VARCHAR,
  
  -- URLs de apps
  app_store_url TEXT,
  google_play_url TEXT,
  
  -- Campos para N8N/WhatsApp
  signature_url TEXT,                -- URL completa para assinatura (gerada automaticamente)
  whatsapp_enviado BOOLEAN DEFAULT FALSE,
  whatsapp_enviado_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  signed_at TIMESTAMP
);

-- Índices importantes
CREATE INDEX idx_contracts_access_token ON contracts(access_token);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_whatsapp_enviado ON contracts(whatsapp_enviado);
```

### Tabela: `form_submissions`

```sql
-- Esta tabela armazena dados de formulários preenchidos anteriormente
-- Usada para preencher automaticamente dados do cliente
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY,
  contact_name VARCHAR,
  contact_email VARCHAR,
  contact_phone VARCHAR,      -- Telefone para busca
  contact_cpf VARCHAR,
  instagram_handle VARCHAR,
  birth_date DATE,
  address_cep VARCHAR,
  address_street VARCHAR,
  address_number VARCHAR,
  address_complement VARCHAR,
  address_neighborhood VARCHAR,
  address_city VARCHAR,
  address_state VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para busca por telefone
CREATE INDEX idx_form_submissions_phone ON form_submissions(contact_phone);
CREATE INDEX idx_form_submissions_email ON form_submissions(contact_email);
```

---

## 4. Fluxo Completo Passo a Passo

### FASE 1: Reunião e Criação do Contrato

#### 1.1 Usuário na Reunião (Meeting100ms.tsx)
Localização: `src/components/Meeting100ms.tsx`

```tsx
// Botão de Assinar na barra de controles (linha ~800)
<Button
  variant="ghost"
  size="icon"
  onClick={() => {
    // Redireciona para página de assinatura
    window.location.href = `/assinar/${contractToken}`;
  }}
  className="bg-green-500/20 hover:bg-green-500/30 text-green-400"
>
  <FileSignature className="w-5 h-5" />
</Button>
```

#### 1.2 Ao Sair da Reunião (PublicMeetingRoom.tsx)
Localização: `src/pages/PublicMeetingRoom.tsx`

```tsx
// Função handleLeaveMeeting (linha ~83-138)
const handleLeaveMeeting = async () => {
  setStep("ended");
  
  if (!isRecordingBot && !contractToken) {
    setIsCreatingContract(true);
    try {
      // 1. Busca dados do form_submission
      let participantDataFromForm: any = {};
      
      try {
        const participantResponse = await fetch(
          `/api/public/reunioes/${roomId}/participant-data`,
          { credentials: 'include' }
        );
        if (participantResponse.ok) {
          const result = await participantResponse.json();
          if (result.found && result.participantData) {
            participantDataFromForm = result.participantData;
            console.log("[PublicMeetingRoom] Dados do form_submission encontrados:", participantDataFromForm);
          }
        }
      } catch (e) {
        console.log("[PublicMeetingRoom] Nenhum dado de formulário encontrado");
      }
      
      // 2. Cria contrato com dados pré-preenchidos
      const response = await fetch('/api/assinatura/public/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: participantDataFromForm.nome || participantName || 'Novo Revendedor',
          client_cpf: participantDataFromForm.cpf || '',
          client_email: participantDataFromForm.email || '',
          client_phone: participantDataFromForm.telefone || '',
        }),
      });
      
      if (response.ok) {
        const contract = await response.json();
        setContractToken(contract.access_token);  // Token para redirecionamento
      }
    } catch (err) {
      console.error("[PublicMeetingRoom] Erro ao criar contrato:", err);
    }
  }
};

// Botão para ir para assinatura (linha ~141-145)
const handleGoToSignature = () => {
  if (contractToken) {
    window.location.href = `/assinar/${contractToken}`;
  }
};
```

### FASE 2: Página de Assinatura

#### 2.1 Carregamento Inicial (AssinaturaClientPage.tsx)
Localização: `src/pages/AssinaturaClientPage.tsx`

```tsx
// Estrutura de Steps (0-5):
// Step 0: Loading/Transição
// Step 1: Verificação Facial (VerificationFlow)
// Step 2: Assinatura do Contrato (ContractStep)
// Step 3: Promoção de Apps (AppPromotionStep)
// Step 4: Boas-vindas Revendedor (ResellerWelcomeStep)
// Step 5: Sucesso (SuccessStep)

const AssinaturaClientContent = () => {
  const { token } = useParams<{ token: string }>();
  
  // 1. Busca contrato pelo token
  const { data: contract } = useQuery<ContractData | null>({
    queryKey: ['/api/assinatura/public/contracts', token],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`/api/assinatura/public/contracts/${token}`, {
        credentials: 'include'
      });
      if (!res.ok) return null;
      return await res.json();
    }
  });

  // 2. Busca dados do form_submission para preencher automaticamente
  const { data: participantData } = useQuery<ParticipantData | null>({
    queryKey: ['/api/assinatura/public/contracts', token, 'participant-data'],
    enabled: !!token && !!contract,
    queryFn: async () => {
      const res = await fetch(
        `/api/assinatura/public/contracts/${token}/participant-data`,
        { credentials: 'include' }
      );
      if (!res.ok) return null;
      return await res.json();
    }
  });

  // 3. Ao carregar contrato, avança para Step 1 (verificação)
  useEffect(() => {
    if (contract && currentStep === 0) {
      setGovbrData({
        cpf: contract.client_cpf,
        nome: contract.client_name,
        nivel_conta: 'prata',
        email: contract.client_email,
        authenticated: true
      });
      setCurrentStep(1);  // Avança para verificação facial
    }
  }, [contract, currentStep]);
};
```

### FASE 3: Verificação Facial

#### 3.1 Fluxo de Verificação (VerificationFlow.tsx)
Localização: `src/components/assinatura/verification/VerificationFlow.tsx`

```tsx
export const VerificationFlow = ({ onComplete, ...props }) => {
  const {
    session,
    currentStep,
    startSession,
    saveSelfie,
    saveDocument,
    completeVerification,
    goToStep,
  } = useVerificationSession();

  // Estados - CRÍTICO: Imagens ficam APENAS em React state (não sessionStorage)
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [documentImage, setDocumentImage] = useState<string | null>(null);

  // 1. Captura da Selfie
  const handleSelfieCapture = useCallback((imageData: string) => {
    console.log('[VerificationFlow] Selfie captured');
    setSelfieImage(imageData);  // Mantém em React state
    saveSelfie(imageData);      // Salva metadata (sem imagem) no localStorage
    goToStep('document');       // Avança para documento
  }, [saveSelfie, goToStep]);

  // 2. Captura do Documento
  const handleDocumentCapture = useCallback((imageData: string, documentType: DocumentType) => {
    console.log('[VerificationFlow] Document captured');
    setDocumentImage(imageData);  // Mantém em React state
    saveDocument(imageData, documentType);
    goToStep('processing');       // Avança para processamento
  }, [saveDocument, goToStep]);

  // 3. Processamento e Comparação Facial
  const handleProcessingComplete = useCallback(async (result, error) => {
    if (error) {
      toast.error(error);
      goToStep('document');
      return;
    }

    // Comparação facial usando face-api.js
    const comparisonResult = await compareFacesAdvanced(selfieImage!, documentImage!);
    
    // Salva verificação
    saveVerification({
      selfie: selfieImage!,
      document: documentImage!,
      similarity: comparisonResult.similarity,
      passed: comparisonResult.passed
    });

    // Chama callback com resultado
    onComplete?.({
      success: comparisonResult.passed,
      selfie: selfieImage,
      document: documentImage,
      result: comparisonResult
    });
  }, [selfieImage, documentImage, onComplete]);
};
```

### FASE 4: Assinatura do Contrato

#### 4.1 Etapa de Contrato (ContractStep.tsx)
Localização: `src/components/assinatura/steps/ContractStep.tsx`

```tsx
export const ContractStep = ({ clientData, selfiePhoto, documentPhoto }) => {
  const [agreed, setAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // Gera HTML do contrato assinado
  const generateContractHTML = (signedAt?: Date) => {
    const now = signedAt || new Date();
    const protocol = clientData?.protocol_number || generateProtocolNumber();
    
    // ... HTML com cláusulas, assinatura, etc.
    return { html, protocol };
  };

  // Handler de assinatura
  const handleSign = async () => {
    if (!agreed) {
      toast({ title: 'Erro', description: 'Você precisa concordar com os termos' });
      return;
    }

    setIsSigning(true);
    try {
      const { html, protocol } = generateContractHTML(new Date());

      // CRÍTICO: Chama a API de finalização
      const response = await fetch(
        `/api/assinatura/public/contracts/${clientData.id}/finalize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selfie_photo: selfiePhoto,           // Base64 da selfie
            document_photo: documentPhoto,        // Base64 do documento
            signed_contract_html: html,           // HTML do contrato assinado
            status: 'signed'
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setContractData({
          id: result.id,
          protocol_number: protocol,
          signed_at: new Date().toISOString(),
          contract_html: html
        });
        setCurrentStep(3);  // Avança para próximo step
        toast({ title: 'Contrato assinado com sucesso!' });
      } else {
        throw new Error('Falha ao salvar contrato');
      }
    } catch (error) {
      console.error('[ContractStep] Erro:', error);
      toast({ title: 'Erro', description: 'Falha ao assinar contrato' });
    } finally {
      setIsSigning(false);
    }
  };
};
```

---

## 5. Endpoints da API

### 5.1 Rotas Públicas (sem autenticação)
Localização: `server/routes/assinatura.ts`

#### POST `/api/assinatura/public/contracts`
Cria um novo contrato.

```typescript
router.post('/public/contracts', async (req, res) => {
  const { client_name, client_cpf, client_email, client_phone } = req.body;
  
  // Gera token de acesso (UUID)
  const access_token = crypto.randomUUID();
  
  // Gera URL de assinatura para N8N
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'http://localhost:5000';
  const signature_url = `${baseUrl}/assinar/${access_token}`;
  
  const contract = {
    id: crypto.randomUUID(),
    client_name,
    client_cpf: client_cpf || '',
    client_email: client_email || '',
    client_phone: client_phone || '',
    status: 'pending',
    access_token,
    signature_url,
    whatsapp_enviado: false,  // N8N vai marcar TRUE após enviar
    protocol_number: `CONT-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  // Salva no Supabase
  const result = await assinaturaSupabaseService.createContract(contract);
  
  res.status(201).json(result);
});
```

#### GET `/api/assinatura/public/contracts/:token`
Busca contrato por access_token ou ID.

```typescript
router.get('/public/contracts/:token', async (req, res) => {
  const { token } = req.params;
  
  console.log(`[Assinatura] Buscando contrato por token/id: ${token}`);
  
  // 1. Tenta buscar por access_token no Supabase
  let contract = await assinaturaSupabaseService.getContractByToken(token);
  
  // 2. Se não encontrou, tenta por ID
  if (!contract) {
    contract = await assinaturaSupabaseService.getContractById(token);
  }
  
  // 3. Fallback para store local
  if (!contract) {
    contract = localContractsStore.get(token) || 
               Array.from(localContractsStore.values()).find(c => c.access_token === token);
  }

  if (!contract) {
    return res.status(404).json({ error: 'Contrato não encontrado' });
  }

  res.json(contract);
});
```

#### POST `/api/assinatura/public/contracts/:id/finalize`
**ROTA CRÍTICA** - Finaliza o contrato com todos os dados.

```typescript
router.post('/contracts/:id/finalize', async (req, res) => {
  const { id } = req.params;
  const { 
    address, 
    selfie_photo, 
    document_photo, 
    document_back_photo, 
    signed_contract_html, 
    status 
  } = req.body;

  console.log(`[Assinatura] Finalizando contrato: ${id}`);
  console.log(`[Assinatura] Dados recebidos:`, {
    has_address: !!address,
    has_selfie: !!selfie_photo,
    selfie_length: selfie_photo?.length,
    has_doc: !!document_photo,
    doc_length: document_photo?.length,
    has_signed_html: !!signed_contract_html,
    signed_html_length: signed_contract_html?.length,
    status
  });

  const addressData = address ? {
    address_street: address.street,
    address_number: address.number,
    address_complement: address.complement,
    address_city: address.city,
    address_state: address.state,
    address_zipcode: address.zipcode,
  } : {};

  if (assinaturaSupabaseService.isConnected()) {
    // CRÍTICO: Busca o contrato primeiro para obter o access_token correto
    let supabaseContract = await assinaturaSupabaseService.getContractByToken(id);
    if (!supabaseContract) {
      supabaseContract = await assinaturaSupabaseService.getContractById(id);
    }
    
    const updateData = {
      ...addressData,
      selfie_photo,
      document_photo,
      document_back_photo,
      signed_contract_html,
      status: status || 'signed',
      signed_at: new Date().toISOString(),
      whatsapp_enviado: true  // Marca como enviado após assinatura
    };
    
    let result = null;
    
    // Tenta por access_token primeiro
    if (supabaseContract?.access_token) {
      console.log(`[Assinatura] Tentando finalizar por access_token: ${supabaseContract.access_token}`);
      result = await assinaturaSupabaseService.finalizeContractByToken(
        supabaseContract.access_token, 
        updateData
      );
    }
    
    // Se falhou, tenta por ID
    if (!result && supabaseContract?.id) {
      console.log(`[Assinatura] Tentando finalizar por ID: ${supabaseContract.id}`);
      result = await assinaturaSupabaseService.finalizeContract(supabaseContract.id, updateData);
    }
    
    // Último recurso: usa o parâmetro original
    if (!result) {
      console.log(`[Assinatura] Tentando finalizar diretamente por param ID: ${id}`);
      result = await assinaturaSupabaseService.finalizeContract(id, updateData);
    }
    
    if (result) {
      console.log(`[Assinatura] Contrato finalizado no Supabase com sucesso:`, result.id);
      return res.json(result);
    }
  }

  // Fallback para store local
  // ...
  
  return res.status(404).json({ error: 'Contrato não encontrado' });
});
```

#### GET `/api/assinatura/public/contracts/:token/participant-data`
Busca dados do form_submission para preencher automaticamente.

```typescript
router.get('/contracts/:token/participant-data', async (req, res) => {
  const { token } = req.params;
  
  console.log(`[Assinatura] Buscando participant-data para token ${token}`);
  
  // 1. Busca o contrato para obter telefone/email
  let contract = await assinaturaSupabaseService.getContractByToken(token);
  if (!contract) {
    contract = await assinaturaSupabaseService.getContractById(token);
  }

  if (!contract) {
    return res.status(404).json({ error: 'Contrato não encontrado' });
  }
  
  const contractPhone = contract.client_phone;
  const contractEmail = contract.client_email;
  
  console.log(`[Assinatura] Contrato encontrado: ${contract.id}, telefone: ${contractPhone}`);
  
  let submission = null;
  
  // 2. Busca no Supabase do cliente (form_submissions)
  const normalizePhone = (p) => p?.replace(/@s\.whatsapp\.net/g, '').replace(/\D/g, '') || '';
  const searchPhone = normalizePhone(contractPhone);
  
  if (supabaseClient && searchPhone) {
    console.log(`[Assinatura] Supabase: buscando por telefone: ${searchPhone}`);
    const { data: subs } = await supabaseClient
      .from('form_submissions')
      .select('*')
      .or(`contact_phone.ilike.%${searchPhone}%,contact_phone.ilike.%${searchPhone.slice(-9)}%`)
      .order('created_at', { ascending: false })
      .limit(1);
    if (subs?.length > 0) {
      submission = subs[0];
      console.log(`[Assinatura] Supabase: encontrado por telefone: ${submission.id}`);
    }
  }
  
  // 3. Fallback para banco local
  if (!submission) {
    // Busca no PostgreSQL local
    // ...
  }

  if (!submission) {
    console.log(`[Assinatura] Nenhum form_submission encontrado`);
    return res.json({ 
      found: false,
      contractData: {
        nome: contract.client_name,
        email: contract.client_email,
        telefone: contract.client_phone,
        cpf: contract.client_cpf
      }
    });
  }

  // 4. Retorna dados formatados
  res.json({
    found: true,
    formSubmissionId: submission.id,
    participantData: {
      nome: submission.contact_name,
      email: submission.contact_email,
      telefone: submission.contact_phone,
      cpf: submission.contact_cpf,
      instagram: submission.instagram_handle,
      dataNascimento: submission.birth_date,
      endereco: {
        cep: submission.address_cep,
        rua: submission.address_street,
        numero: submission.address_number,
        complemento: submission.address_complement,
        bairro: submission.address_neighborhood,
        cidade: submission.address_city,
        estado: submission.address_state
      }
    }
  });
});
```

---

## 6. Componentes Frontend

### Árvore de Componentes

```
src/
├── pages/
│   ├── AssinaturaClientPage.tsx       # Página principal de assinatura do cliente
│   ├── AssinaturaPage.tsx             # Página admin para gerenciar contratos
│   └── PublicMeetingRoom.tsx          # Sala de reunião pública
├── components/
│   ├── Meeting100ms.tsx               # Componente da reunião 100ms
│   ├── ErrorBoundary.tsx              # Captura erros de runtime
│   └── assinatura/
│       ├── verification/
│       │   ├── VerificationFlow.tsx   # Fluxo de verificação facial
│       │   ├── SelfieCapture.tsx      # Captura de selfie
│       │   ├── DocumentCapture.tsx    # Captura de documento
│       │   ├── ProcessingScreen.tsx   # Tela de processamento
│       │   └── ResultScreen.tsx       # Tela de resultado
│       └── steps/
│           ├── ContractStep.tsx       # Etapa de assinatura do contrato
│           ├── AppPromotionStep.tsx   # Promoção de apps
│           ├── ResellerWelcomeStep.tsx # Boas-vindas ao revendedor
│           └── SuccessStep.tsx        # Tela de sucesso
├── contexts/
│   └── ContractContext.tsx            # Contexto global do contrato
└── hooks/
    └── assinatura/
        ├── useVerificationSession.ts  # Gerencia sessão de verificação
        ├── useFaceDetection.ts        # Detecção e comparação facial
        └── useVerificationStorage.ts  # Armazenamento de verificação
```

### ContractContext.tsx (Contexto Global)

```tsx
// Localização: src/contexts/ContractContext.tsx

export interface GovBRData {
  cpf: string;
  nome: string;
  nivel_conta: string;
  email?: string;
  authenticated: boolean;
}

export interface ContractData {
  id?: string;
  protocol_number?: string;
  signed_at?: string;
  contract_html?: string;
}

export interface AddressData {
  street: string;
  number: string;
  city: string;
  state: string;
  zipcode: string;
  complement?: string;
}

interface ContractContextType {
  currentStep: number;           // Step atual (0-5)
  setCurrentStep: (step: number) => void;
  govbrData: GovBRData | null;   // Dados do cliente
  setGovbrData: (data: GovBRData | null) => void;
  contractData: ContractData | null;
  setContractData: (data: ContractData | null) => void;
  addressData: AddressData | null;
  setAddressData: (data: AddressData | null) => void;
  resetFlow: () => void;
}

export const ContractProvider = ({ children }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [govbrData, setGovbrData] = useState<GovBRData | null>(null);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [addressData, setAddressData] = useState<AddressData | null>(null);

  const resetFlow = () => {
    setCurrentStep(0);
    setGovbrData(null);
    setContractData(null);
    setAddressData(null);
  };

  return (
    <ContractContext.Provider value={{ /* ... */ }}>
      {children}
    </ContractContext.Provider>
  );
};
```

---

## 7. Serviços Backend

### AssinaturaSupabaseService
Localização: `server/services/assinatura-supabase.ts`

```typescript
class AssinaturaSupabaseService {
  private supabase: SupabaseClient | null = null;
  private initialized = false;
  
  constructor() {
    this.initialize();
  }
  
  private loadConfig(): SupabaseConfig | null {
    // Carrega de data/supabase-config.json ou env vars
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const config = JSON.parse(data);
        return { 
          url: config.url || config.supabaseUrl, 
          anon_key: config.anon_key || config.supabaseAnonKey 
        };
      }
    } catch (error) {
      console.error('[AssinaturaSupabase] Erro ao carregar config:', error);
    }
    return null;
  }
  
  isConnected(): boolean {
    return this.initialized && this.supabase !== null;
  }
  
  // Busca contrato por access_token
  async getContractByToken(token: string): Promise<AssinaturaContract | null> {
    if (!this.supabase) return null;
    
    console.log(`[AssinaturaSupabase] Fetching contract by access_token: ${token}`);
    
    const { data, error } = await this.supabase
      .from('contracts')
      .select('*')
      .eq('access_token', token)
      .single();
    
    if (error?.code === 'PGRST116') return null;  // Não encontrado
    return data;
  }
  
  // Busca contrato por ID
  async getContractById(id: string): Promise<AssinaturaContract | null> {
    if (!this.supabase) return null;
    
    const { data, error } = await this.supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error?.code === 'PGRST116') return null;
    return data;
  }
  
  // Cria novo contrato
  async createContract(contract: AssinaturaContract): Promise<AssinaturaContract | null> {
    if (!this.supabase) return null;
    
    const globalConfig = await this.getGlobalConfig();
    
    const contractData = {
      client_name: contract.client_name,
      client_cpf: contract.client_cpf || '',
      client_email: contract.client_email || '',
      client_phone: contract.client_phone || '',
      status: 'pending',
      access_token: contract.access_token,
      signature_url: contract.signature_url,
      whatsapp_enviado: false,
      // Herda configurações globais de branding
      logo_url: contract.logo_url ?? globalConfig?.logo_url,
      primary_color: contract.primary_color ?? globalConfig?.primary_color,
      // ... outras configurações
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await this.supabase
      .from('contracts')
      .insert(contractData)
      .select()
      .single();
    
    if (error) {
      console.error('[AssinaturaSupabase] Error creating contract:', error);
      return null;
    }
    
    return data;
  }
  
  // Finaliza contrato por access_token
  async finalizeContractByToken(token: string, updates: Partial<AssinaturaContract>): Promise<AssinaturaContract | null> {
    if (!this.supabase) return null;
    
    console.log('[AssinaturaSupabase] Finalizing contract by token:', token, {
      has_selfie: !!updates.selfie_photo,
      has_doc: !!updates.document_photo,
      has_signed_html: !!updates.signed_contract_html,
      status: updates.status
    });
    
    const { data, error } = await this.supabase
      .from('contracts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('access_token', token)
      .select()
      .single();
    
    if (error) {
      console.error('[AssinaturaSupabase] Error finalizing contract:', error);
      return null;
    }
    
    return data;
  }
  
  // Finaliza contrato por ID
  async finalizeContract(id: string, updates: Partial<AssinaturaContract>): Promise<AssinaturaContract | null> {
    if (!this.supabase) return null;
    
    const { data, error } = await this.supabase
      .from('contracts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('[AssinaturaSupabase] Error finalizing contract:', error);
      return null;
    }
    
    return data;
  }
}

export const assinaturaSupabaseService = new AssinaturaSupabaseService();
```

---

## 8. Integração N8N para WhatsApp

### Fluxo N8N

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Polling   │───▶│   Filtra    │───▶│   Envia     │───▶│   Atualiza  │
│  Supabase   │    │  Contratos  │    │  WhatsApp   │    │   Status    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Query de Polling

```sql
-- Query que o N8N deve usar para buscar contratos pendentes de envio
SELECT id, client_name, client_phone, signature_url
FROM contracts
WHERE whatsapp_enviado = FALSE
  AND signature_url IS NOT NULL
  AND status = 'pending'
ORDER BY created_at ASC
LIMIT 10;
```

### Após Envio (N8N deve atualizar)

```sql
-- Query para marcar como enviado após sucesso no WhatsApp
UPDATE contracts
SET whatsapp_enviado = TRUE,
    whatsapp_enviado_at = NOW()
WHERE id = '{contract_id}';
```

### Configuração N8N Completa

```json
{
  "name": "WhatsApp Contract Sender",
  "nodes": [
    {
      "name": "Supabase Polling",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "select",
        "table": "contracts",
        "filters": {
          "whatsapp_enviado": false,
          "signature_url": { "neq": null },
          "status": "pending"
        },
        "limit": 10
      }
    },
    {
      "name": "Send WhatsApp",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.evolution.com/message/send",
        "method": "POST",
        "body": {
          "phone": "={{$json.client_phone}}",
          "message": "Olá {{$json.client_name}}! Seu contrato está pronto para assinatura: {{$json.signature_url}}"
        }
      }
    },
    {
      "name": "Update Status",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "update",
        "table": "contracts",
        "id": "={{$json.id}}",
        "data": {
          "whatsapp_enviado": true,
          "whatsapp_enviado_at": "={{new Date().toISOString()}}"
        }
      }
    }
  ]
}
```

---

## 9. Busca de Dados da Tabela form_submissions

### Lógica de Busca (3 níveis de fallback)

```typescript
// 1. Busca no Supabase do Cliente
const { data: subs } = await supabaseClient
  .from('form_submissions')
  .select('*')
  .or(`contact_phone.ilike.%${searchPhone}%,contact_phone.ilike.%${searchPhone.slice(-9)}%`)
  .order('created_at', { ascending: false })
  .limit(1);

// 2. Se não encontrou, busca por email
if (!submission && searchEmail) {
  const { data: subs } = await supabaseClient
    .from('form_submissions')
    .select('*')
    .ilike('contact_email', searchEmail)
    .limit(1);
  if (subs?.length > 0) submission = subs[0];
}

// 3. Fallback para PostgreSQL local
if (!submission) {
  const [sub] = await db.select().from(formSubmissions)
    .where(sql`REPLACE(REPLACE(${formSubmissions.contactPhone}, '-', ''), ' ', '') LIKE '%' || ${searchPhone} || '%'`)
    .limit(1);
  if (sub) submission = sub;
}
```

### Normalização de Telefone

```typescript
// Remove formatação do WhatsApp e caracteres não numéricos
const normalizePhone = (phone: string | null | undefined) => {
  return phone
    ?.replace(/@s\.whatsapp\.net/g, '')  // Remove sufixo WhatsApp
    .replace(/\D/g, '')                   // Remove não-numéricos
    || '';
};

// Exemplos:
// "5531992267220@s.whatsapp.net" → "5531992267220"
// "(31) 99226-7220" → "31992267220"
```

---

## 10. Problemas Comuns e Soluções

### Problema 1: Tela Preta no Mobile
**Sintoma:** Página fica preta ou branca após capturar selfie no mobile  
**Causa:** Quota exceeded no sessionStorage ao salvar imagens base64  
**Solução:**
```tsx
// ERRADO - NÃO fazer isso:
sessionStorage.setItem('selfie', imageBase64);  // ❌ Causa crash

// CORRETO - Manter apenas em React state:
const [selfieImage, setSelfieImage] = useState<string | null>(null);
setSelfieImage(imageBase64);  // ✅ Funciona no mobile
```

### Problema 2: Erro PGRST116 ao Finalizar
**Sintoma:** `Cannot coerce the result to a single JSON object`  
**Causa:** O sistema está usando ID em vez de access_token  
**Solução:**
```typescript
// Buscar contrato primeiro para obter access_token correto
let supabaseContract = await assinaturaSupabaseService.getContractByToken(id);
if (!supabaseContract) {
  supabaseContract = await assinaturaSupabaseService.getContractById(id);
}

// Usar o access_token correto do contrato encontrado
if (supabaseContract?.access_token) {
  result = await assinaturaSupabaseService.finalizeContractByToken(
    supabaseContract.access_token, 
    updateData
  );
}
```

### Problema 3: Contrato Não Encontrado
**Sintoma:** 404 ao acessar `/assinar/{token}`  
**Causa:** Token incorreto ou contrato não criado no Supabase  
**Solução:**
1. Verificar se Supabase está configurado: `data/supabase-config.json`
2. Verificar se contrato existe na tabela `contracts`
3. Verificar se `access_token` corresponde ao token na URL

### Problema 4: Dados Não Preenchendo Automaticamente
**Sintoma:** Formulário vazio mesmo com form_submission existente  
**Causa:** Telefone/email não corresponde  
**Solução:**
1. Verificar normalização do telefone (remover @s.whatsapp.net)
2. Verificar se tabela `form_submissions` existe no Supabase
3. Verificar logs: `[Assinatura] Supabase: buscando por telefone:`

### Problema 5: WebGL Error no Mobile
**Sintoma:** Erro de WebGL na câmera  
**Causa:** Navegador não suporta WebGL  
**Solução:**
- Este erro é normal em ambientes de teste (screenshots)
- Em dispositivos reais, funciona normalmente
- Se persistir, verificar permissões de câmera

---

## 11. Código Crítico - Referência Rápida

### Criar Contrato Após Reunião
```tsx
// src/pages/PublicMeetingRoom.tsx
const response = await fetch('/api/assinatura/public/contracts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_name: participantDataFromForm.nome || participantName,
    client_cpf: participantDataFromForm.cpf || '',
    client_email: participantDataFromForm.email || '',
    client_phone: participantDataFromForm.telefone || '',
  }),
});
const contract = await response.json();
window.location.href = `/assinar/${contract.access_token}`;
```

### Buscar Contrato por Token
```typescript
// server/routes/assinatura.ts
let contract = await assinaturaSupabaseService.getContractByToken(token);
if (!contract) {
  contract = await assinaturaSupabaseService.getContractById(token);
}
```

### Finalizar Contrato
```tsx
// src/components/assinatura/steps/ContractStep.tsx
const response = await fetch(`/api/assinatura/public/contracts/${clientData.id}/finalize`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    selfie_photo: selfiePhoto,
    document_photo: documentPhoto,
    signed_contract_html: html,
    status: 'signed'
  }),
});
```

### Configuração Supabase
```json
// data/supabase-config.json
{
  "url": "https://xxxxxxxx.supabase.co",
  "anon_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 12. Checklist de Debugging

### Se o Fluxo Não Funciona:

- [ ] **Supabase está configurado?**
  ```bash
  cat data/supabase-config.json
  ```

- [ ] **Tabela `contracts` existe com todas as colunas?**
  ```sql
  SELECT column_name FROM information_schema.columns WHERE table_name = 'contracts';
  ```

- [ ] **Logs do servidor mostram criação do contrato?**
  ```
  [Assinatura] Contrato criado no Supabase: {id}
  ```

- [ ] **Token está correto na URL?**
  - URL deve ser: `/assinar/{access_token}`
  - Não usar o `id` do contrato

- [ ] **Finalização está funcionando?**
  ```
  [Assinatura] Contrato finalizado no Supabase com sucesso: {id}
  ```

- [ ] **Imagens estão sendo salvas em React state (não sessionStorage)?**
  ```tsx
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  ```

- [ ] **N8N está fazendo polling correto?**
  ```sql
  SELECT * FROM contracts WHERE whatsapp_enviado = FALSE AND signature_url IS NOT NULL;
  ```

### Logs Importantes para Monitorar:

```
[Assinatura] Buscando contrato por token/id: {token}
[AssinaturaSupabase] Fetching contract by access_token: {token}
[AssinaturaSupabase] Contract found by token: {id, client_name, status}
[Assinatura] Finalizando contrato: {id}
[Assinatura] Tentando finalizar por access_token: {access_token}
[Assinatura] Contrato finalizado no Supabase com sucesso: {id}
```

---

## Histórico de Mudanças

| Data | Versão | Descrição |
|------|--------|-----------|
| 15/01/2026 | 2.0 | Documentação completa criada |
| 15/01/2026 | 1.9 | Correção do PGRST116 na finalização |
| 15/01/2026 | 1.8 | Correção de tela preta no mobile |
| 14/01/2026 | 1.7 | Adição de colunas selfie_photo, document_photo |
| 12/01/2026 | 1.6 | Integração N8N para WhatsApp |

---

**Mantido por:** ExecutiveAI Pro Team  
**Contato:** suporte@executiveai.pro
