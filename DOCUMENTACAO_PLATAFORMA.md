# Documentação da Plataforma ExecutiveAI Pro

## Visão Geral
A ExecutiveAI Pro é uma plataforma SaaS multi-tenant robusta, desenvolvida para gestão de leads, videoconferência integrada, consulta de CPF e automação de vendas. A plataforma foi projetada para funcionar tanto em desktop quanto em dispositivos móveis, oferecendo uma experiência otimizada para cada plataforma.

## Principais Funcionalidades Criadas e Integradas

### 1. Sistema de Videoconferência (100ms)
- **Reuniões Instantâneas**: Possibilidade de criar e entrar em salas de vídeo com um único clique.
- **Agendamento de Reuniões**: Sistema de agendamento via modal com integração direta à API do 100ms para criação automática de salas.
- **Gravações SFU (Server-Side)**: Implementação de gravação de alta qualidade que captura o stream diretamente do servidor, resolvendo problemas de telas de carregamento.
- **Design de Sala Customizável**: Painel para configurar cores, logos e branding das salas de reunião por tenant.
- **Páginas Públicas de Reunião**: Endpoints que permitem que convidados externos participem das reuniões sem necessidade de login.

### 2. Gestão de Leads e CRM (Kanban)
- **Pipeline de Vendas**: Visualização em formato Kanban para gerenciar o progresso dos leads.
- **Integração de Formulários**: Captura automática de leads através de formulários públicos customizáveis.
- **Histórico de Interações**: Registro de atividades e dados de compliance para cada lead.

### 3. Compliance e Consulta de CPF
- **Consulta em Tempo Real**: Integração com BigDataCorp para validação de dados cadastrais.
- **Histórico de Consultas**: Registro completo de todas as consultas realizadas para auditoria e controle.
- **Compliance Automático**: Sistema que verifica a regularidade de novos leads automaticamente.

### 4. Plataforma de Revenda (Reseller)
- **Multi-Tenant App**: Plataforma dedicada para revendedores gerenciarem suas próprias sub-contas e operações.
- **Dashboard Executivo**: Visão consolidada de métricas de vendas e performance.

### 5. Comunicação e Automação
- **WhatsApp Business**: Integração via Evolution API para envio de mensagens automáticas.
- **Notificações Push e Email**: Sistema de alertas para novos leads, reuniões agendadas e atualizações do sistema.
- **Exportação de Dados**: Ferramentas para exportar relatórios em diversos formatos (PDF, XLSX).

## Arquitetura Técnica
- **Frontend**: React 18 com TypeScript, Vite e Shadcn UI.
- **Backend**: Node.js com Express e Drizzle ORM.
- **Banco de Dados**: PostgreSQL (Neon/Supabase).
- **Gerenciamento de Estado**: TanStack Query e Zustand para uma interface reativa e rápida.
- **Segurança**: Autenticação via JWT e isolamento de dados por Tenant (Multi-tenancy).

## Otimizações de Desempenho
- **Exportação Otimizada**: Scripts personalizados que reduzem o tamanho do projeto em 95% para migrações rápidas.
- **Cache Inteligente**: Uso de Redis e cache em memória para reduzir latência em consultas repetitivas.

---
*Documento gerado em 05 de Janeiro de 2026.*
