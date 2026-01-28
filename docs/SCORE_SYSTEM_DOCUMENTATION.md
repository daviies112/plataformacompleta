# Sistema de Score de Confiabilidade - Documentação Completa

## Visão Geral

O Score de Confiabilidade é um sistema de pontuação (0-1000) para avaliar o risco de candidatas a revendedoras. **Quanto maior o score, mais confiável é a pessoa.**

Este sistema é baseado em dados da API BigDataCorp e calibrado com estatísticas reais do judiciário brasileiro.

## Estatísticas Brasileiras de Referência

Dados do CNJ (Conselho Nacional de Justiça) 2023:
- **Média brasileira:** 0,15 processos novos por pessoa por ano
- **Em 3 anos:** ~0,45 processos por pessoa
- **Realidade:** A maioria das pessoas tem 0 ou 1 processo
- **Conclusão:** Alguém com 5+ processos como réu está 30x+ acima da média

## Escala de Score

| Score | Classificação | Cor | Significado |
|-------|---------------|-----|-------------|
| 851-1000 | Risco Muito Baixo | Verde | Pessoa muito confiável - pode aprovar |
| 701-850 | Risco Baixo | Verde Claro | Pessoa confiável com atenção |
| 501-700 | Risco Médio | Amarelo | Alguns fatores de atenção - avaliar |
| 301-500 | Risco Alto | Laranja | Preocupante - não recomendado |
| 0-300 | Risco Muito Alto | Vermelho | Múltiplos problemas - reprovar |

## Fórmula de Cálculo

### Base
- Score inicial: **1000** (máximo)
- Deduções são aplicadas por fatores de risco

### Penalidades por Processos como RÉU (Principal Indicador)

| Processos como Ré | Penalidade | Score Resultante |
|-------------------|------------|------------------|
| 0 | 0 | 1000 |
| 1 | -120 | ~880 |
| 2 | -220 | ~780 |
| 3 | -350 | ~650 |
| 4 | -450 | ~550 |
| 5 | -550 | ~450 |
| 6 | -620 | ~380 |
| 7+ | -700 + (n-7)*40 | <300 |

### Outras Penalidades

| Fator | Penalidade |
|-------|------------|
| Por processo como AUTOR | -15 cada |
| Por processo como OUTRO | -25 cada |
| Dívidas ativas (cobrança) | -200 |
| Dívidas passadas (resolvidas) | -60 |
| CPF irregular | -300 |
| Processos últimos 30 dias | -40 cada |
| Processos últimos 90 dias | -25 cada |
| Processos último ano | -10 cada |

### Bônus

| Fator | Bônus |
|-------|-------|
| Sem processos recentes (365 dias) mas tem histórico | +25 |
| Ficha completamente limpa | +50 |

## Exemplos de Cálculo

### Exemplo 1: Pessoa Limpa
- 0 processos
- CPF Regular
- Sem dívidas
- **Score: 1000 + 50 (bônus) = 1000** (máximo)

### Exemplo 2: Manuela (5 como ré, 1 outro)
- Base: 1000
- 5 como ré: -550
- 1 outro: -25
- Sem processos recentes: +25
- **Score: 1000 - 550 - 25 + 25 = 450** (Risco Alto)

### Exemplo 3: Davidson (63 processos, 6+ como ré)
- Base: 1000
- 7+ como ré: -700 - ((n-7)*40)
- **Score: <100** (Risco Muito Alto)

## Arquivos Relevantes

### Código Principal
- `src/components/compliance/process-details-modal.tsx` - Componente ScoreGauge e cálculo universalScore

### Tipos e Schemas
- `shared/schema.ts` - Tipos TypeScript para compliance

### Documentação
- `docs/SCORE_SYSTEM_DOCUMENTATION.md` - Este arquivo
- `replit.md` - Documentação geral do projeto

## Integração com BigDataCorp

O score é calculado a partir dos dados retornados pela API BigDataCorp:

```typescript
// Campos utilizados do payload:
processData.TotalLawsuitsAsDefendant  // Processos como réu
processData.TotalLawsuitsAsAuthor     // Processos como autor
processData.TotalLawsuitsAsOther      // Processos outros
processData.TotalLawsuits             // Total de processos
processData.Last30DaysLawsuits        // Processos últimos 30 dias
processData.Last90DaysLawsuits        // Processos últimos 90 dias
processData.Last365DaysLawsuits       // Processos último ano
basicDataPayload.TaxIdStatus          // Status do CPF (REGULAR ou não)
collectionsPayload.HasActiveCollections // Dívidas ativas
collectionsPayload.TotalOccurrences   // Total de ocorrências de cobrança
```

## Componente Visual (ScoreGauge)

O componente ScoreGauge exibe:
1. Arco visual colorido (vermelho → verde)
2. Número do score em destaque
3. Badge com classificação de risco
4. Descrição do que significa o score
5. Barra de referência visual com todas as faixas

### Cores por Faixa
- 0-300: `#dc2626` (red-600)
- 301-500: `#ea580c` (orange-600)
- 501-700: `#ca8a04` (yellow-600)
- 701-850: `#65a30d` (lime-600)
- 851-1000: `#16a34a` (green-600)

## Decisão de Negócio

Este sistema foi calibrado para o contexto de **revendedoras de cosméticos/produtos**:

1. **Objetivo:** Identificar pessoas confiáveis para parcerias de revenda
2. **Risco:** Primeira maleta tem pouco produto, mas ainda há risco de não pagamento
3. **Calibragem:** Baseada em estatísticas reais do judiciário brasileiro
4. **Filosofia:** Score reflete a realidade - muitos processos como réu = não confiável

## Histórico de Alterações

- **2026-01-28:** Calibragem inicial baseada em estatísticas CNJ
- **2026-01-28:** Ajuste de penalidades para 5 processos = score < 500
- **2026-01-28:** Documentação completa criada para exportação GitHub

---

**IMPORTANTE:** Esta documentação deve ser preservada em todas as exportações do projeto.
