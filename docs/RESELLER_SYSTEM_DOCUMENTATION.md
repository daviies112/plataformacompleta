# Sistema de Revendedoras (NEXUS) - Documentação Completa

## Visão Geral

O sistema de revendedoras permite que cada revendedora tenha acesso a uma plataforma personalizada com credenciais do Supabase herdadas automaticamente do administrador. O fluxo é completamente automático: basta adicionar a revendedora na tabela `revendedoras` do Supabase Master.

## Fluxo Automático de Criação de Login

### 1. Adicionar Revendedora no Supabase Master

Na tabela `revendedoras` do Supabase Master, adicione um registro com:

```sql
INSERT INTO revendedoras (email, cpf, status, admin_id) VALUES (
  'email@revendedora.com',
  '12345678900',  -- CPF apenas números (11 dígitos)
  'ativo',
  '2854f799-d2c4-466c-995a-63537c057708'  -- ID do admin
);
```

**Campos obrigatórios:**
- `email`: Email da revendedora (usado para login)
- `cpf`: CPF normalizado (apenas 11 números, sem pontos ou traços)
- `status`: Deve ser `'ativo'` para permitir login
- `admin_id`: UUID do administrador (referência à tabela `admin_supabase_credentials`)

### 2. Configurar Credenciais do Admin

Na tabela `admin_supabase_credentials` do Supabase Master/Owner:

```sql
INSERT INTO admin_supabase_credentials (admin_id, project_name, supabase_url, supabase_anon_key, supabase_service_role_key) VALUES (
  '2854f799-d2c4-466c-995a-63537c057708',
  'Revendedora A',
  'https://seu-projeto.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);
```

### 3. Login da Revendedora

A revendedora acessa `/revendedora/login` e fornece:
- **Email**: O mesmo cadastrado na tabela `revendedoras`
- **CPF**: O CPF (pode ser com ou sem formatação - o sistema normaliza)

## Arquitetura do Sistema

### Tabelas Utilizadas

#### Supabase Master/Owner
- `revendedoras`: Cadastro de todas as revendedoras
- `admin_supabase_credentials`: Credenciais do Supabase de cada admin

#### PostgreSQL Local (Replit)
- `reseller_supabase_configs`: Cache local das credenciais da revendedora

```sql
CREATE TABLE reseller_supabase_configs (
  id SERIAL PRIMARY KEY,
  reseller_email VARCHAR(255) UNIQUE NOT NULL,
  supabase_url TEXT,
  supabase_anon_key TEXT,
  supabase_service_key TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Fluxo de Autenticação

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE LOGIN DA REVENDEDORA                │
└─────────────────────────────────────────────────────────────────┘

1. Revendedora acessa /revendedora/login
   └── Fornece email + CPF

2. Backend: POST /api/reseller/login
   ├── Busca revendedora no Supabase Master (tabela: revendedoras)
   ├── Valida email + CPF + status='ativo'
   └── Se válido:
       ├── Busca credenciais do admin (tabela: admin_supabase_credentials)
       ├── Salva credenciais localmente (tabela: reseller_supabase_configs)
       ├── Cria sessão com JWT
       └── Retorna token + tenant info

3. Frontend: Após login bem sucedido
   ├── Salva token no localStorage
   ├── Salva projectName no localStorage
   ├── Invalida cache do React Query
   └── Navega para /revendedora/reseller/dashboard

4. Página de Configurações
   ├── GET /api/reseller/supabase-config
   ├── Busca credenciais locais (reseller_supabase_configs)
   └── Exibe URL + Anon Key (Service Key apenas indicador)
```

### Arquivos Principais

#### Backend

| Arquivo | Descrição |
|---------|-----------|
| `server/routes/resellerAuth.ts` | Rotas de autenticação e configuração |
| `server/lib/masterSyncService.ts` | Serviço para buscar credenciais do admin |
| `server/middleware/multiTenantAuth.ts` | Middleware de autenticação multi-tenant |
| `server/config/supabaseOwner.ts` | Configuração do Supabase Owner/Master |

#### Frontend

| Arquivo | Descrição |
|---------|-----------|
| `src/features/revendedora/pages/Login.tsx` | Página de login |
| `src/features/revendedora/pages/reseller/Settings.tsx` | Página de configurações |
| `src/features/revendedora/layouts/ResellerLayout.tsx` | Layout com proteção de rota |
| `src/features/revendedora/lib/resellerAuth.ts` | Funções de autenticação |

### Endpoints da API

#### POST /api/reseller/login
Autentica a revendedora.

**Request:**
```json
{
  "email": "email@revendedora.com",
  "cpf": "12345678900"
}
```

**Response (sucesso):**
```json
{
  "success": true,
  "token": "jwt-token...",
  "tenant": {
    "id": "uuid",
    "projectName": "Revendedora A"
  },
  "reseller": {
    "email": "email@revendedora.com",
    "nome": "Nome da Revendedora"
  }
}
```

#### GET /api/reseller/supabase-config
Retorna as credenciais do Supabase da revendedora.

**Response:**
```json
{
  "supabase_url": "https://xxx.supabase.co",
  "supabase_anon_key": "eyJ...",
  "has_service_key": true,
  "configured": true,
  "inherited": false
}
```

**Nota de Segurança:** O `supabase_service_key` nunca é exposto no frontend.

#### PUT /api/reseller/supabase-config
Salva/atualiza as credenciais do Supabase.

#### POST /api/reseller/supabase-config/test
Testa a conexão com o Supabase configurado.

## Proteção de Rotas

O `ResellerLayout.tsx` verifica automaticamente se há token no localStorage:

```typescript
useEffect(() => {
  const token = getResellerToken();
  if (!token) {
    navigate('/revendedora/login', { replace: true });
  } else {
    setAuthChecked(true);
  }
}, [navigate]);
```

## Configuração de Sessão

A sessão é configurada com cookies seguros para funcionar no iframe do Replit:

```typescript
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: true,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
  }
}));
```

## Herança de Credenciais (Transitional)

Se a revendedora não tem credenciais próprias configuradas:

1. O sistema busca o `admin_id` da revendedora
2. Carrega as credenciais do admin da tabela `admin_supabase_credentials`
3. Usa essas credenciais como fallback (indicado por `inherited: true`)

## Segurança

### O que NUNCA é exposto no frontend:
- `supabase_service_role_key` - apenas indicador booleano `has_service_key`

### O que é exposto (apenas para revendedora autenticada):
- `supabase_url`
- `supabase_anon_key` (chave pública)

### Tokens JWT:
- Armazenados no localStorage
- Enviados via header `Authorization: Bearer <token>`
- Sessão também mantida via cookies HTTP-only

## Troubleshooting

### Credenciais não aparecem após login
1. Verifique se o cache foi invalidado (React Query)
2. Confira se a sessão foi criada corretamente nos logs
3. Verifique se as credenciais do admin estão na tabela `admin_supabase_credentials`

### Login retorna 401
1. Verifique se o email e CPF estão corretos na tabela `revendedoras`
2. Confirme que o `status` está como `'ativo'`
3. Verifique se o CPF está normalizado (apenas 11 dígitos)

### Página redireciona para login
1. Verifique se o token está no localStorage
2. Confira se o workflow está rodando
3. Verifique os cookies do navegador

## Variáveis de Ambiente Necessárias

```env
JWT_SECRET=sua-chave-secreta
DATABASE_URL=postgresql://...
SUPABASE_OWNER_URL=https://seu-owner.supabase.co
SUPABASE_OWNER_KEY=eyJ...
```

## Changelog

### 2026-01-20
- Implementada proteção de rotas no `ResellerLayout.tsx`
- Corrigido mapeamento de campos (`supabase_service_role_key` → `supabase_service_key`)
- Adicionada invalidação de cache do React Query após login
- Corrigido nome da tabela de credenciais (`admin_supabase_credentials`)
- **IMPORTANTE**: Implementado isolamento de dados completo - ver `docs/DATA_ISOLATION_IMPLEMENTATION.md`

## Documentação Relacionada

- `docs/DATA_ISOLATION_IMPLEMENTATION.md` - Implementação completa do isolamento de dados multi-tenant
- `docs/SUPABASE_TRIGGER_REQUIREMENTS.md` - Requisitos para triggers do Supabase
- `docs/CONTRACT_FORM_SUBMISSION_DATA_FLOW.md` - Fluxo de dados de formulários para contratos
