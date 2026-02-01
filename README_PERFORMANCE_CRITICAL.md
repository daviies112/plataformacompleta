# ⚠️ LEIA ANTES DE MODIFICAR QUALQUER CÓDIGO ⚠️

## Problema Resolvido

As páginas públicas (formulários, reuniões, assinaturas) estavam demorando **15+ segundos** para carregar. Após debugging extensivo custando **$30+**, a causa raiz foi identificada e corrigida.

## Arquivos Críticos - NÃO MODIFICAR SEM ENTENDER

| Arquivo | Função | ⚠️ NUNCA Fazer |
|---------|--------|----------------|
| `src/main.tsx` | Detecção precoce de rotas | Importar dependências pesadas |
| `src/PublicFormApp.tsx` | Formulários ultra-leve | Importar TanStack Query, shadcn, lucide |
| `src/PublicMeetingApp.tsx` | Reuniões ultra-leve | Importar TanStack Query, shadcn, lucide |
| `src/PublicSignatureApp.tsx` | Assinaturas ultra-leve | Importar TanStack Query, shadcn, lucide |
| `server/lib/publicCache.ts` | Cache multi-camada | Remover cache |
| `server/routes/meetings.ts` | Endpoints com cache | Remover cache |

## Imports PROIBIDOS nos Public*App.tsx

```typescript
// ❌ NUNCA IMPORTAR:
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

// ✅ PERMITIDO:
import { useState, useEffect, useCallback, useMemo } from "react";
```

## Documentação Completa

- `CRITICAL_PERFORMANCE_FILES.md` - Guia técnico rápido
- `docs/PUBLIC_FORM_PERFORMANCE_FIX.md` - Documentação completa
- `replit.md` - Arquitetura e decisões

## Como Testar

1. Limpar cache do navegador
2. Acessar uma URL pública (ex: `/f/slug/form/formSlug`)
3. Verificar no DevTools:
   - Bundle < 500KB (não 2MB+)
   - Tempo de carregamento < 2s (não 15+)
   - ~10 módulos carregados (não 80+)

---

**💰 Custo para descobrir esta correção: $30+ em debugging**

**Qualquer modificação incorreta causará regressão severa de performance.**
