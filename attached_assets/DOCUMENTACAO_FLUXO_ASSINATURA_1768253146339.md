# Documento de Arquitetura e Fluxo de Automação: Jornada do Cliente

## 1. Visão Geral
Este documento descreve o fluxo automatizado que integra a captura de dados de formulários, o processo de reunião por vídeo, a geração de contratos digitais e a logística de entrega da "Maleta".

## 2. A Jornada do Cliente (Passo a Passo)

### Passo 1: Captura de Dados (Formulário Inicial)
O fluxo começa quando um ou mais clientes preenchem o formulário de inscrição.
*   **Campos Obrigatórios para Contrato:** Nome Completo, CPF, E-mail e Telefone.
*   **Campos de Logística (Maleta):** CEP, Rua, Número, Complemento, Cidade e Estado.
*   **Armazenamento:** Esses dados são salvos na tabela `form_submissions` no Supabase.

### Passo 2: Reunião e Ativação
A reunião ocorre através da integração com 100ms. 
*   **Gatilho de Encerramento:** Assim que a reunião termina, o sistema identifica todos os participantes vinculados.
*   **Suporte Multi-Cliente:** O sistema é capaz de identificar se houve mais de um CPF/Cliente na mesma reunião e disparar o fluxo de contrato individualmente para cada um.

### Passo 3: Geração e Assinatura do Contrato
Os dados capturados no Passo 1 são transferidos automaticamente para o módulo de Assinatura.
*   **Campos Automáticos:** O contrato é gerado com Nome, CPF e E-mail já preenchidos, evitando que o cliente digite novamente.
*   **Validação:** O sistema garante que o CPF é válido antes de permitir a assinatura.

### Passo 4: Módulo Maleta (Entrega)
Após a assinatura do contrato, o cliente é direcionado para a tela de confirmação (Módulo Maleta).
*   **Confirmação de Endereço:** O sistema apresenta o endereço capturado no formulário inicial.
*   **Finalização:** O cliente confirma ou ajusta o endereço para garantir que a Maleta seja entregue no local correto.

## 3. Detalhes Técnicos de Implementação

### Integração Multi-Cliente
Para suportar múltiplos clientes em uma única reunião, o sistema utiliza uma relação "Muitos para Muitos":
1.  **ID da Reunião:** Vincula todas as `form_submissions` dos participantes.
2.  **Processamento em Lote:** O servidor percorre a lista de participantes e gera um `access_token` único para cada contrato.

### Persistência e Fallback
*   **Principal:** Supabase (Tabelas `contracts`, `app_promotion_configs`, `users`).
*   **Segurança:** Local JSON (`data/assinatura_contracts.json`) funciona como backup imediato caso a conexão com a nuvem falhe.

## 4. Requisitos para Implementação Final
*   **Ajuste de Frontend:** Garantir que o campo "Telefone" na página de Assinatura seja marcado como obrigatório (Required).
*   **Mapeamento de Campos:** Vincular os campos da tabela `form_submissions` (JSONB) aos campos da tabela `contracts`.
*   **Fluxo de Redirecionamento:** Implementar o gatilho "Post-Meeting" que redireciona o cliente para a URL de assinatura.

---
*Este documento serve como guia para a implementação técnica das funcionalidades solicitadas no módulo de Assinatura.*
