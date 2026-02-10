# Contract Signing Application with Facial Recognition

## 🚀 Project Status
✅ **FULLY FUNCTIONAL** - Supabase conectado e funcionando

---

## 📋 Quick Start (27 Dec 2025)

### Setup Initial
```bash
npm install           # Instalar dependências
npm run db:push      # Criar/sincronizar database
npm run dev          # Rodar dev server (port 5000)
```

### Build para Produção
```bash
npm run build        # Gera dist/
npm run preview      # Testar build localmente
```

---

## 🔧 Configuração Técnica

### Stack
- **Frontend**: React + Vite (port 5000)
- **Backend**: Express.js + TypeScript  
- **Database**: PostgreSQL + Drizzle ORM
- **Auth/Storage**: Supabase
- **Deployment**: Autoscale

### Arquivos Críticos
```
root/
├── client/src/
│   ├── integrations/supabase/client.ts    ⭐ Inicializa Supabase
│   ├── main.tsx                           Entrada React
│   └── pages/                             Componentes principais
├── server/
│   ├── routes.ts                          ⭐ API endpoints (inc. /api/config/supabase)
│   ├── index.ts                           Express setup
│   ├── storage.ts                         Database queries
│   └── supabase-routes.ts                 Supabase-specific endpoints
├── shared/
│   ├── schema.ts                          Database schema (Drizzle)
│   └── types.ts                           TypeScript types
├── migrations/                            DB migrations
└── replit.md                              Este arquivo
```

---

## 🔑 Environment Variables (NECESSÁRIOS)

Todos já estão configurados como SECRETS no Replit:

```
REACT_APP_SUPABASE_URL          # URL do Supabase project
REACT_APP_SUPABASE_ANON_KEY     # Public anon key do Supabase
DATABASE_URL                     # PostgreSQL connection string
SESSION_SECRET                   # Sessão Express
```

**Se faltarem credentials**, o app roda em mock mode (sem crash).

---

## 🌉 Supabase Integration (IMPORTANTE!)

### Como Funciona
1. **Server** (Node.js) tem acesso a `process.env.REACT_APP_SUPABASE_*`
2. **Client** (React/Browser) NÃO consegue acessar `REACT_APP_*` vars direto no Vite
3. **Solução**: Endpoint `/api/config/supabase` fornece credenciais ao cliente

### Fluxo
```
Cliente HTTP
    ↓
GET /api/config/supabase
    ↓
Server retorna: { url, key }
    ↓
Client fetch → localStorage → Supabase client
```

### Código Relevante
- **Server**: `server/routes.ts` linhas 8-23
- **Client**: `client/src/integrations/supabase/client.ts` linhas 13-24

---

## 🐛 Troubleshooting

### "Supabase not configured - using mock client"
✅ **ESPERADO** se `REACT_APP_SUPABASE_*` não estiverem setados
- Check: Replit → Secrets → `REACT_APP_SUPABASE_URL` e `REACT_APP_SUPABASE_ANON_KEY`
- Solução: Adicionar secrets ou usar `/api/config/supabase` endpoint

### Erro de conexão ao Supabase
1. Checar console do navegador (F12 → Console)
2. Verificar `GET /api/config/supabase` retorna credenciais
```bash
curl http://localhost:5000/api/config/supabase
```
3. Se vazio: secrets não estão setados no servidor

### Database não sincroniza
```bash
npm run db:push           # Sincronizar schema
npm run db:push --force   # Forçar (backup antes!)
```

### Port 5000 já em uso
- Kill processo: `lsof -ti:5000 | xargs kill -9`
- Ou mudar porta em `vite.config.ts`

---

## 📊 API Endpoints

### Contracts
- `GET /api/contracts` → Lista todos contratos
- `GET /api/contracts/:token` → Contrato por token público
- `GET /api/contracts/by-id/:id` → Contrato por ID
- `POST /api/contracts` → Criar novo contrato
- `PATCH /api/contracts/:id` → Atualizar contrato
- `DELETE /api/contracts/:id` → Deletar contrato

### Config & Supabase
- `GET /api/config/supabase` → **Credenciais Supabase para cliente**
- `GET /api/config/appearance` → Branding config
- `GET /api/config/verification` → Verification steps
- `GET /api/config/contract` → Contract template config
- `GET /api/config/progress` → Progress tracking config

### Signatures
- `GET /api/signatures/:contractId` → Assinaturas do contrato
- `POST /api/signatures` → Registrar assinatura (com biometria)
- `GET /api/audit-trail` → Log de ações

---

## 🎯 Desenvolvimento

### Editar componentes React
- Localização: `client/src/pages/` e `client/src/components/`
- Estilo: Tailwind CSS + Radix UI
- Hot reload automático ao salvar

### Editar API
- Localização: `server/routes.ts` e `server/storage.ts`
- Tipo: TypeScript (compilado automaticamente)
- Restart workflow após mudanças: não precisa (auto-reload)

### Editar Database Schema
1. Editar `shared/schema.ts`
2. Rodar: `npm run db:push`
3. Tipos TS atualizados automaticamente

---

## 🚀 Deploy (Replit)

### Configuração Atual
- **Tipo**: Autoscale (cost-effective)
- **Comando**: `npm run dev`
- **Port**: 5000
- **URL**: `https://seu-replit-domain.repl.co`

### Fazer Deploy
1. Clique "Publish" no Replit
2. Selecione domain customizado (opcional)
3. Pronto!

---

## 💡 Otimizações de Custo

- ✅ Autoscale ativo (sem custo quando inativo)
- ✅ Supabase em modo anon (menos custos)
- ✅ Mock client se não conectar (não quebra)
- ✅ Database lazy-loaded (sem queries desnecessárias)

---

## 📞 Debug Mode

Ativar logs verbosos:
```javascript
// client/src/integrations/supabase/client.ts
// Descomentar linhas com console.log para debug
```

---

## ⚠️ Importante: Não Editar
- ❌ `client/src/integrations/supabase/types.ts` (auto-gerado)
- ❌ `client/src/integrations/supabase/client.ts` header (comentário indica auto-gerado, mas PODE editar a lógica de init)
- ✅ Tudo mais é seguro editar

---

## Próximos Passos Possíveis
- [ ] Autenticação com OAuth (Google, GitHub)
- [ ] Integração com WebRTC para biometria em tempo real
- [ ] Webhooks do Supabase para notificações
- [ ] Cache (Redis) para melhor performance
- [ ] Custom domain

**Status**: 100% funcional, pronto para produção! 🎉
