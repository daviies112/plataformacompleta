# Arquitetura Híbrida Inteligente: Migração para Controle Centralizado no VPS

## Contexto para o Agente Claude no Servidor

Este documento descreve a transição da arquitetura atual (Supabase Cloud espalhado) para uma arquitetura híbrida centralizada no servidor VPS (Easypanel). O objetivo é que **VOCÊ (Agente Claude no Servidor)** assuma o controle total da operação, entendendo a estrutura, validando conexões e executando a migração dos dados críticos para dentro do ambiente local sob sua gestão.

---

## 🏗️ A Nova Arquitetura Híbrida

A estratégia é combinar a facilidade do Supabase Cloud (Google) para autenticação global com a robustez e controle do PostgreSQL local no VPS para dados sensíveis e de clientes.

### 1. Componentes Externos (Supabase Cloud)
Mantemos no Google (Cloud) apenas o estritamente necessário para login global, aproveitando o Free Tier e a segurança isolada.
- **Supabase OWNER (Login/Multitenant):**
  - **Função:** Autenticação dos administradores (login na plataforma).
  - **Status:** Continua no Supabase Cloud.
  - **Ação:** O servidor deve se conectar apenas como cliente para validar sessões.

### 2. Componentes Internos (VPS / Easypanel) - **SUA RESPONSABILIDADE**
Aqui é onde a mágica acontece. Trazemos para "dentro de casa" os dados que exigem performance, controle e conformidade.

#### A. Banco de Dados MASTER (CPF & Compliance)
- **O que é:** Base de dados massiva de CPFs, logs de auditoria e checagens de compliance.
- **Mudança:** Sai do Supabase Cloud e vem para um **PostgreSQL Dedicado no VPS**.
- **Motivo:** Performance (latência zero para a aplicação), Custo (zero) e Segurança (dados sensíveis sob controle total).

#### B. Banco de Dados da PLATAFORMA (Local Postgres)
- **O que é:** Armazena configurações internas do sistema, credenciais criptografadas de integrações (Evolution API, etc.) e estado da aplicação.
- **Mudança:** Já existe ou será consolidado em um **PostgreSQL Local no VPS**.

#### C. Bancos de Dados dos CLIENTES (Tenants)
- **O que é:** Os dados de negócio de cada cliente (Leads, Vendas, CRMs).
- **Mudança:**
  - **Clientes Atuais:** Serão migrados do Supabase Cloud para **Schemas isolados ou Bancos dedicados no PostgreSQL do VPS**.
  - **Novos Clientes:** Scripts de automação criarão automaticamente a estrutura localmente, sem depender de APIs externas.

---

## 🛠️ Metodologia de Execução (Sua Missão)

Você, Agente no Servidor, deve seguir este roteiro para garantir a migração sem interrupção:

### Fase 1: Reconhecimento do Terreno
1.  **Identificar Conexões:** Verificar as variáveis de ambiente atuais (`SUPABASE_URL`, `DATABASE_URL`) para mapear onde cada serviço está conectando hoje.
2.  **Validar Acesso Local:** Testar conexão com o PostgreSQL local do Easypanel (`postgres-master` ou similar). Garantir que você tem permissão de `SUPERUSER` ou similar para criar bancos e schemas.

### Fase 2: Migração dos Dados (Master & Clientes)
Para cada banco externo (CPF Master e Clientes) que deve vir para o VPS:
1.  **Extração (Dump):** Utilizar as credenciais fornecidas (connection strings) para baixar os dados brutos (`pg_dump`).
    - *Atenção:* Usar a senha mestra (`230723Davi#b`) e o endereço do Pooler (porta 6543) se necessário para evitar bloqueios de IP.
2.  **Preparação Local:** Criar os bancos de dados (`db_master_cpf`, `db_cliente_xyz`) no PostgreSQL do VPS.
3.  **Importação (Restore):** Injetar os dados (`psql < backup.sql`) no ambiente local.
4.  **Validação:** Comparar contagem de linhas (rows) entre o banco externo e o local para garantir integridade.

### Fase 3: Virada de Chave (Switch)
1.  **Reconfiguração:** Atualizar as variáveis de ambiente (`.env` ou configurações do Easypanel) da aplicação e do n8n.
    - `DATABASE_URL_CPF` ➔ Aponta para o PostgreSQL Local.
    - `DATABASE_URL_CLIENTE_X` ➔ Aponta para o PostgreSQL Local.
2.  **Teste de Fogo:** Reiniciar a aplicação e verificar se ela consegue ler/escrever nos bancos locais.

### Fase 4: Governança Contínua
1.  **Backup Rotineiro:** Configurar script para backup periódico dos bancos locais para um Storage externo (ex: S3/MinIO) para desastre recovery.
2.  **Documentação Automática:** Manter o script `generate-db-schema-docs.ts` rodando para que tenhamos sempre um mapa atualizado da estrutura do banco.

---

## 📝 Inventário de Credenciais (Para Uso Interno)
*Utilizar estas chaves apenas para a etapa de extração (Dump).*

- **Senha Padrão:** `230723Davi#b`
- **Owner (Manter Externo):** `postgresql://postgres:[SENHA]@db.uniewwcpalbctkahdyxv.supabase.co:5432/postgres`
- **Master CPF (Trazer para VPS):** `postgresql://postgres:[SENHA]@db.fsojiujwjfseqwrqesch.supabase.co:5432/postgres`
- **Cliente Exemplo (Trazer para VPS):** `postgresql://postgres:[SENHA]@db.qvcsyhdgfeseyehfqcff.supabase.co:5432/postgres`

---

**Assinado:** Equipe de Engenharia (Claude & User)
**Data:** 12/02/2026
