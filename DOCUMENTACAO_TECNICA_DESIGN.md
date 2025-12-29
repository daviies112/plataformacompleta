# Documentação Técnica: Sincronização de Design de Reuniões com Supabase

Este documento detalha a implementação técnica para o salvamento e carregamento das personalizações de design da plataforma de reuniões utilizando o Supabase como fonte de dados primária e multi-tenant.

## 1. Arquitetura de Dados

A sincronização utiliza um padrão de **Dual-Write com Fallback**, priorizando o Supabase do cliente para garantir que as personalizações sejam globais e persistentes.

### Estrutura de Tabelas (Supabase)
O sistema foi projetado para ser flexível, suportando duas possíveis nomenclaturas de tabela no Supabase do cliente:
- `meeting_tenant_config` (Primária/Sugerida)
- `meeting_tenants` (Fallback)

**Colunas mapeadas:**
- `id`: ID do Tenant (UUID ou Texto em ambiente de desenvolvimento)
- `room_design_config` / `roomDesignConfig`: Objeto JSONB contendo cores, logos, textos de lobby e configurações de tela final.
- `updated_at`: Timestamp da última modificação.

---

## 2. Implementação do Backend (Sincronização)

As rotas em `server/routes/meetings.ts` foram otimizadas para lidar com o ambiente multi-tenant dinamicamente.

### Salvamento (`PATCH /api/reunioes/room-design`)
1. **Identificação do Tenant**: O sistema extrai o `tenantId` da sessão autenticada.
2. **Injeção de Credenciais**: O frontend envia `x-supabase-url` e `x-supabase-key` nos headers.
3. **Upsert Inteligente**: 
   - O backend tenta realizar um `upsert` na tabela `meeting_tenant_config`.
   - Se a tabela não for encontrada (`PGRST205`), ele tenta automaticamente na tabela `meeting_tenants`.
4. **Proteção de Integridade**: Se o `tenantId` não for um UUID válido (comum em ambientes `dev`), o sistema ignora a gravação no banco de dados local (que exige UUID) mas confirma o sucesso se a gravação no Supabase ocorrer corretamente.

### Carregamento (`GET /api/reunioes/tenant-config`)
1. **Prioridade Supabase**: O sistema tenta buscar a configuração primeiro no Supabase injetado.
2. **Normalização de Dados**: Como o Supabase pode usar `snake_case` e o frontend espera `camelCase`, o backend normaliza `room_design_config` para `roomDesignConfig` antes de enviar a resposta.
3. **Fallback Local**: Caso o Supabase não retorne dados, o sistema busca no banco local (se for um UUID válido).

---

## 3. Implementação do Frontend

### Hook de Dados (`useQuery`)
Na página `RoomDesignSettings.tsx`, o carregamento foi modificado para incluir os headers necessários:
```typescript
const { data: tenant } = useQuery({
  queryKey: ["/api/reunioes/tenant-config"],
  queryFn: async () => {
    const headers = {
      "x-supabase-url": localStorage.getItem('supabase_url'),
      "x-supabase-key": localStorage.getItem('supabase_key')
    };
    const response = await api.get("/api/reunioes/tenant-config", { headers });
    return response.data.data;
  },
});
```

### Aplicação Visual
As configurações carregadas são injetadas no estado `config`, que por sua vez alimenta:
- **Cores**: Variáveis CSS aplicadas aos componentes de vídeo.
- **Branding**: Logos e nomes de empresa exibidos no Header da reunião.
- **Lobby**: Títulos e imagens de fundo personalizados.

---

## 4. Conclusão e Testes de Validação

O sistema agora garante que:
- ✅ Alterações salvas no Supabase aparecem imediatamente ao atualizar a página.
- ✅ Erros de "Table not found" são tratados automaticamente com fallback de nome de tabela.
- ✅ Ambientes de desenvolvimento com IDs não-UUID funcionam sem quebrar o banco de dados local.

**Data da Implementação**: 29 de Dezembro de 2025
**Status**: Operacional e Sincronizado.
