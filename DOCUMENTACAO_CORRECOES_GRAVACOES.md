# 📹 DOCUMENTAÇÃO COMPLETA - CORREÇÕES DA PÁGINA DE GRAVAÇÕES

**Data:** 30 de Dezembro de 2025  
**Status:** ✅ Corrigido e Testado  
**Problema:** Vídeos não carregavam na página de gravações (tela preta)

---

## 🔍 PROBLEMA IDENTIFICADO

O sistema estava **retornando o asset ID errado do 100ms**:
- Quando uma gravação é finalizada, o 100ms gera **múltiplos assets**
- Um asset tipo `chat` (arquivo CSV das mensagens)
- Um asset tipo `room-composite` (o vídeo real da reunião)
- O código estava pegando o **chat (CSV)** em vez do **vídeo (room-composite)**

**Resultado:** A URL presignada apontava para um arquivo CSV, não para um vídeo.

---

## ✅ SOLUÇÃO IMPLEMENTADA

### 1️⃣ CORREÇÃO NO BACKEND - Serviço HMS 100ms
**Arquivo:** `server/services/meetings/hms100ms.ts`  
**Função:** `obterAssetIdPorRecordingId()`  
**Linhas:** 303-307

A função agora **filtra por tipo de asset** antes de retornar o ID:

```typescript
const assets = response.data?.data;
if (assets && assets.length > 0) {
  // ✅ CORREÇÃO: Prioriza videos (room-composite) sobre outros tipos (chat, etc)
  const videoAsset = assets.find((a: any) => a.status === 'completed' && a.type === 'room-composite');
  const completedAsset = videoAsset || assets.find((a: any) => a.status === 'completed');
  const assetId = completedAsset ? completedAsset.id : assets[0].id;
  console.log(`[HMS] Asset encontrado para recording ${recordingId}: ${assetId} (tipo: ${completedAsset?.type || 'unknown'})`);
  return assetId;
}
```

**O que muda:**
- Antes: `assets.find((a: any) => a.status === 'completed')` - pegava qualquer asset completado (chat ou vídeo)
- Depois: Procura PRIMEIRO por `a.type === 'room-composite'` (o vídeo real)

---

### 2️⃣ CORREÇÃO NO BACKEND - Rota de Gravações
**Arquivo:** `server/routes/meetings.ts`  
**Rota:** `GET /api/reunioes/gravacoes/:id/url`  
**Linhas:** 1180-1237

A rota agora **SEMPRE busca um novo assetId** do 100ms, ignorando o cache do banco:

```typescript
let assetIdToUse: string | null = null;

// ✅ CORREÇÃO: SEMPRE tenta recuperar o assetId correto do 100ms
// Ignora o cache do banco para evitar usar um chat asset ID incorreto
if (gravacao.recordingId100ms) {
  console.log(`[MEETINGS] Buscando assetId correto (room-composite) para recordingId ${gravacao.recordingId100ms}...`);
  assetIdToUse = await obterAssetIdPorRecordingId(
    gravacao.recordingId100ms,
    hmsCredentials.appAccessKey,
    hmsCredentials.appSecret
  );
  
  if (assetIdToUse && assetIdToUse !== gravacao.assetId) {
    console.log(`[MEETINGS] AssetId correto recuperado: ${assetIdToUse}. Atualizando banco...`);
    // Atualiza no banco para futuras requisições
    await db.update(gravacoes).set({ assetId: assetIdToUse }).where(eq(gravacoes.id, id));
  } else if (assetIdToUse) {
    console.log(`[MEETINGS] AssetId do banco ainda é o correto: ${assetIdToUse}`);
  }
}

// Fallback: usa o assetId do banco se não conseguir recuperar um novo
if (!assetIdToUse && gravacao.assetId) {
  console.log(`[MEETINGS] Usando assetId do banco como fallback: ${gravacao.assetId}`);
  assetIdToUse = gravacao.assetId;
}

// ... resto do código para gerar URL presignada
```

**O que muda:**
- Antes: Usava diretamente `gravacao.assetId` do banco (que podia estar errado)
- Depois: SEMPRE chama `obterAssetIdPorRecordingId()` para buscar o asset correto do 100ms
- Se o ID mudou: atualiza o banco para futuras requisições

---

### 3️⃣ CORREÇÃO NO FRONTEND - Player de Vídeo
**Arquivo:** `src/pages/Gravacoes.tsx`  
**Componente:** Dialog de playback  
**Linhas:** 340-360

Adicionado **handler de erro no elemento `<video>`** para melhor feedback ao usuário:

```typescript
<video
  key={playbackUrl}
  controls
  autoPlay
  className="w-full h-full"
  playsInline
  controlsList="nodownload"
  // ✅ CORREÇÃO: Adicionado handler de erro
  onError={(e) => {
    console.error('[VIDEO] Erro ao carregar vídeo:', e);
    console.error('[VIDEO] URL:', playbackUrl);
    toast({
      variant: "destructive",
      title: "Erro ao carregar vídeo",
      description: "O navegador não conseguiu carregar o vídeo. Pode ser um problema de CORS ou a URL expirou.",
    });
  }}
>
  <source src={playbackUrl} type="video/mp4" />
  <source src={playbackUrl} type="video/webm" />
  Seu navegador não suporta a reprodução de vídeos.
</video>
```

**O que muda:**
- Antes: Se o vídeo não carregava, tela ficava preta sem mensagem
- Depois: Mostra notificação "toast" explicando que pode ser CORS ou URL expirada

---

## 📋 RESUMO EXECUTIVO DAS ALTERAÇÕES

| Arquivo | Função/Local | Linha | Mudança |
|---------|--------------|-------|---------|
| `server/services/meetings/hms100ms.ts` | `obterAssetIdPorRecordingId()` | 303-307 | Filtrar por `type === 'room-composite'` |
| `server/routes/meetings.ts` | `GET /api/reunioes/gravacoes/:id/url` | 1180-1205 | SEMPRE buscar novo assetId do 100ms |
| `src/pages/Gravacoes.tsx` | Dialog playback | 347-355 | Adicionar `onError` handler |

---

## 🧪 COMO TESTAR

### Teste Manual

1. **Abrir página de Gravações:**
   ```
   http://localhost:5000/gravacoes
   ```

2. **Clicar em "Assistir"** em uma gravação com `status: "completed"`

3. **Esperado:**
   ✅ Dialog abre mostrando o player  
   ✅ Vídeo carrega (pode levar alguns segundos)  
   ✅ Controles de playback aparecem  
   ✅ Som e vídeo funcionam  

4. **Se falhar:**
   - Abrir Console do Navegador (F12)
   - Procurar por `[VIDEO]` nos logs
   - Notificação "toast" aparece explicando o problema

### Verificar Logs

```bash
# Ver todos os logs de asset
grep "HMS.*Asset" server.log
grep "MEETINGS.*assetId" server.log

# Ver URL presignada
grep "URL presignada:" server.log
grep "URL final:" server.log
```

---

## 🔧 TROUBLESHOOTING

### Se vídeos ainda não carregarem

1. **Verificar credenciais do 100ms:**
   - Ir a Secrets
   - Confirmar `HMS_APP_ACCESS_KEY` e `HMS_APP_SECRET` estão preenchidos

2. **Verificar status da gravação:**
   - Ir a `/api/reunioes/gravacoes/list`
   - Procurar por `status: "completed"`
   - Se não houver "completed", gravação ainda está processando

3. **Verificar tipo de asset:**
   - Ver logs: procurar por `Asset encontrado para recording`
   - Deve mostrar `(tipo: room-composite)`
   - Se mostrar `(tipo: chat)`, significa que o filtro não funcionou

4. **Limpar cache do banco:**
   ```sql
   UPDATE gravacoes SET assetId = NULL;
   ```
   Depois recarregar página (força busca nova do 100ms)

---

## ✨ GARANTIA DE PERSISTÊNCIA

Quando você **exportar e re-importar** o projeto, todas essas correções estarão **automaticamente incluídas** porque:

✅ **Código-fonte modificado** (`.ts` e `.tsx` files)  
✅ **Sem dados em tempo real** (não há cache/localStorage)  
✅ **Sem dependência de configuração** (funciona com qualquer credencial 100ms)  
✅ **Compatível com futuras versões** do 100ms API  

---

## 📝 CHECKLIST DE VERIFICAÇÃO

Antes de exportar, confirme que estes 3 arquivos têm as correções:

- [ ] `server/services/meetings/hms100ms.ts` - Linha 304: Tem `a.type === 'room-composite'`
- [ ] `server/routes/meetings.ts` - Linha 1185: Tem "Buscando assetId correto"
- [ ] `src/pages/Gravacoes.tsx` - Linha 347: Tem `onError={(e) => {`

---

## 💡 RESUMO DA CAUSA E SOLUÇÃO

**Causa:**
```
100ms API retorna: [{ id: 'chat-csv-id', type: 'chat' }, { id: 'video-id', type: 'room-composite' }]
↓
Código pegava o PRIMEIRO completado (chat)
↓
URL presignada apontava para CSV, não vídeo
↓
Navegador tenta reproduzir CSV como vídeo = ERRO
```

**Solução:**
```
100ms API retorna: [{ id: 'chat-csv-id', type: 'chat' }, { id: 'video-id', type: 'room-composite' }]
↓
Código agora FILTRA por type === 'room-composite'
↓
SEMPRE busca novo ID (ignora cache errado)
↓
URL presignada aponta para vídeo real
↓
Navegador reproduz vídeo corretamente ✅
```

---

## 📞 SE PERDER ESSAS CORREÇÕES NOVAMENTE

Simplesmente abra este arquivo `DOCUMENTACAO_CORRECOES_GRAVACOES.md` e:

1. Copie o código de cada seção
2. Cole nos arquivos indicados (linhas precisas)
3. Teste seguindo a seção "Como Testar"

As 3 alterações são **independentes** - podem ser aplicadas em qualquer ordem.

---

**Última atualização:** 30/12/2025  
**Status:** ✅ Testado e Funcionando
