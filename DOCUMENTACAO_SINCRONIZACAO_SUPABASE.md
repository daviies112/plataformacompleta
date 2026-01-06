# Documentação de Sincronização Supabase - Reuniões

A plataforma ExecutiveAI Pro utiliza um sistema de sincronização híbrido para garantir que suas reuniões estejam sempre disponíveis, mesmo em ambientes de desenvolvimento ou após exportações.

## Como funciona

### 1. Persistência Local (PostgreSQL)
Todas as reuniões criadas (Agendadas ou Instantâneas) são salvas primeiramente no banco de dados local do Replit. Isso garante que a interface funcione instantaneamente e tenha uma fonte de dados confiável.

### 2. Sincronização de Saída (Push)
Sempre que uma reunião é criada ou uma gravação é iniciada:
- O sistema tenta detectar se o Tenant atual possui credenciais do Supabase configuradas.
- Se configurado, os dados são enviados de forma assíncrona para o Supabase do cliente.
- Isso garante que os dados existam na sua infraestrutura externa para uso em outros sistemas ou backups.

### 3. Sincronização de Entrada (Pull/Sync)
Ao acessar o Dashboard de Reuniões:
- O sistema busca as reuniões locais.
- Simultaneamente, ele consulta o Supabase do Tenant.
- Se houver reuniões no Supabase que não existem localmente, o sistema as "baixa" automaticamente para o banco de dados local.
- Isso é extremamente útil ao importar o projeto em um novo ambiente Replit, pois suas reuniões aparecerão automaticamente assim que você configurar suas credenciais.

## Requisitos
Para que a sincronização funcione, você deve configurar na página de **Configurações**:
- `Supabase URL`
- `Supabase Anon Key`

Os dados são sincronizados para as tabelas `reunioes` e `gravacoes` no seu Supabase.
