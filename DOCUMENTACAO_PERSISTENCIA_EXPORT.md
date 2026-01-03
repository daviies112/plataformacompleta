# DOCUMENTAÇÃO DE PERSISTÊNCIA E EXPORTAÇÃO

Este documento garante que as correções críticas de 03/01/2026 sejam preservadas durante o processo de exportação/importação.

## 📁 Arquivos Críticos para Backup
Para manter as configurações entre diferentes instâncias do Replit, os seguintes arquivos **DEVEM** ser incluídos no Git (não estão no .gitignore):

1. `data/credentials.json`: Contém as credenciais criptografadas de integrações.
2. `data/supabase-config.json`: Configuração de conexão com o banco de dados.
3. `data/automation_state.json`: Estado atual das automações.

## 🛠️ Correções Aplicadas (03/01/2026)
As seguintes alterações foram consolidadas no código-fonte e serão exportadas automaticamente:

1. **Identity Fallback**: Localizado em `server/routes/meetings.ts`. Permite alternar entre IDs de e-mail e UUIDs.
2. **Config Endpoints**: Localizados em `server/routes/config.ts`. Novos endpoints para gerenciar o 100ms.
3. **Recording AssetPath**: Melhoria no sistema de gravações para evitar erro "RemotePath is missing".

## 🚀 Como Exportar com Segurança
Sempre use o script otimizado:
```bash
npm run export:clean
```
Este script foi atualizado para **NÃO** deletar a pasta `data/`, garantindo que suas chaves e configurações viajem com o código.

---
**Data:** 03 de Janeiro de 2026
**Status:** 🛡️ Persistência Garantida
