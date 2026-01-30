#!/bin/bash

# 🔍 Script de Diagnóstico Automático - Tela Branca
# Execute este script no Replit para coletar TODOS os dados necessários

echo "🔍 INICIANDO DIAGNÓSTICO COMPLETO..."
echo "=================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Diretório correto${NC}"
echo ""

# 2. Verificar tamanho dos bundles de produção
echo "📦 VERIFICANDO BUNDLES DE PRODUÇÃO..."
echo "-----------------------------------"

if [ -d "dist/assets" ]; then
    echo "Bundles existentes:"
    ls -lh dist/assets/*.js 2>/dev/null | awk '{print $5 "\t" $9}'
    echo ""
    
    # Verificar se há bundles muito grandes
    large_bundles=$(find dist/assets -name "*.js" -size +1M 2>/dev/null)
    if [ ! -z "$large_bundles" ]; then
        echo -e "${RED}🚨 PROBLEMA CRÍTICO: Bundles maiores que 1MB encontrados!${NC}"
        echo "$large_bundles"
        echo ""
    fi
else
    echo -e "${YELLOW}⚠️  Pasta dist/assets não encontrada. Rodando build...${NC}"
    npm run build 2>&1 | tail -20
    echo ""
    
    if [ -d "dist/assets" ]; then
        echo "Bundles criados:"
        ls -lh dist/assets/*.js 2>/dev/null | awk '{print $5 "\t" $9}'
        echo ""
    fi
fi

# 3. Verificar imports pesados nos wrappers
echo "🔎 VERIFICANDO IMPORTS PESADOS..."
echo "--------------------------------"

# Procura imports síncronos em arquivos críticos
critical_files=(
    "src/components/FormularioPublicoWrapper.tsx"
    "src/components/FormularioPublico.tsx"
    "src/components/ReuniaoPetWrapper.tsx"
    "src/components/AssinaturaPublicaWrapper.tsx"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        echo ""
        echo "📄 Arquivo: $file"
        
        # Conta imports no topo
        import_count=$(grep "^import" "$file" | wc -l)
        echo "   Total de imports: $import_count"
        
        # Verifica imports pesados específicos
        heavy_imports=$(grep "^import.*from.*\(antd\|@ant-design\|recharts\|lodash\)" "$file")
        if [ ! -z "$heavy_imports" ]; then
            echo -e "   ${YELLOW}⚠️  Imports pesados detectados:${NC}"
            echo "$heavy_imports" | sed 's/^/      /'
        fi
        
        # Verifica se usa React.lazy
        if grep -q "React.lazy" "$file"; then
            echo -e "   ${GREEN}✅ Usa React.lazy${NC}"
        else
            echo -e "   ${RED}❌ NÃO usa React.lazy${NC}"
        fi
    fi
done
echo ""

# 4. Verificar index.html
echo "🌐 VERIFICANDO INDEX.HTML..."
echo "----------------------------"

if [ -f "index.html" ]; then
    # Verifica se tem loader inicial
    if grep -q "loading\|spinner\|Carregando" "index.html"; then
        echo -e "${GREEN}✅ Tem loader inicial no HTML${NC}"
    else
        echo -e "${RED}❌ NÃO tem loader inicial no HTML${NC}"
        echo -e "${YELLOW}   Sugestão: Adicionar skeleton no <div id='root'>${NC}"
    fi
    
    # Verifica scripts no head vs body
    scripts_in_head=$(grep -c "<script" index.html | head -1)
    echo "   Scripts encontrados: $scripts_in_head"
    
    # Verifica se scripts têm defer/async
    if grep -q "defer\|async" "index.html"; then
        echo -e "   ${GREEN}✅ Usa defer/async${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Scripts podem estar bloqueando${NC}"
    fi
else
    echo -e "${RED}❌ index.html não encontrado!${NC}"
fi
echo ""

# 5. Verificar configuração do Vite
echo "⚙️  VERIFICANDO VITE.CONFIG.TS..."
echo "--------------------------------"

if [ -f "vite.config.ts" ]; then
    if grep -q "manualChunks" "vite.config.ts"; then
        echo -e "${GREEN}✅ Tem configuração de code splitting${NC}"
        echo "   Chunks configurados:"
        grep -A 5 "manualChunks" vite.config.ts | grep -v "}" | sed 's/^/      /'
    else
        echo -e "${RED}❌ NÃO tem configuração de code splitting${NC}"
        echo -e "${YELLOW}   Recomendação: Adicionar manualChunks no rollupOptions${NC}"
    fi
else
    echo -e "${RED}❌ vite.config.ts não encontrado!${NC}"
fi
echo ""

# 6. Verificar rotas públicas
echo "🛣️  VERIFICANDO ROTAS PÚBLICAS..."
echo "--------------------------------"

routes_file="src/App.tsx"
if [ -f "$routes_file" ]; then
    public_routes=$(grep -E "path=\"/(f|form|formulario|reuniao|assinar)" "$routes_file" | wc -l)
    echo "   Rotas públicas encontradas: $public_routes"
    
    if [ $public_routes -eq 0 ]; then
        echo -e "${RED}❌ Nenhuma rota pública encontrada em App.tsx${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  App.tsx não encontrado no caminho esperado${NC}"
fi
echo ""

# 7. Gerar relatório de dependências pesadas
echo "📚 ANALISANDO DEPENDÊNCIAS PESADAS..."
echo "-------------------------------------"

if [ -f "package.json" ]; then
    echo "Dependências grandes que impactam bundle:"
    
    heavy_deps=("antd" "@ant-design/icons" "recharts" "lodash" "moment" "axios")
    
    for dep in "${heavy_deps[@]}"; do
        if grep -q "\"$dep\"" package.json; then
            version=$(grep "\"$dep\"" package.json | sed 's/.*: "\(.*\)".*/\1/')
            echo "   📦 $dep: $version"
        fi
    done
else
    echo -e "${RED}❌ package.json não encontrado!${NC}"
fi
echo ""

# 8. Resumo final e recomendações
echo "=================================="
echo "📊 RESUMO DO DIAGNÓSTICO"
echo "=================================="
echo ""

# Análise dos bundles
if [ -d "dist/assets" ]; then
    total_js_size=$(du -sh dist/assets/*.js 2>/dev/null | awk '{sum+=$1} END {print sum}')
    largest_bundle=$(ls -lh dist/assets/*.js 2>/dev/null | sort -k5 -hr | head -1 | awk '{print $5 " - " $9}')
    
    echo "📦 Bundles JavaScript:"
    echo "   Maior bundle: $largest_bundle"
    
    # Verificar se algum bundle é maior que 500KB
    if find dist/assets -name "*.js" -size +500k | grep -q .; then
        echo -e "   ${RED}🚨 STATUS: CRÍTICO - Bundle muito grande${NC}"
        echo -e "   ${YELLOW}➡️  AÇÃO: Implementar code splitting agressivo${NC}"
    else
        echo -e "   ${GREEN}✅ STATUS: Tamanho OK${NC}"
    fi
fi
echo ""

# Verificar problemas principais
echo "🎯 PROBLEMAS IDENTIFICADOS:"
problems_found=0

# Problema 1: Bundle grande
if find dist/assets -name "*.js" -size +500k 2>/dev/null | grep -q .; then
    problems_found=$((problems_found + 1))
    echo -e "${RED}   $problems_found. Bundle JavaScript muito grande (>500KB)${NC}"
fi

# Problema 2: Falta de React.lazy
for file in "${critical_files[@]}"; do
    if [ -f "$file" ] && ! grep -q "React.lazy" "$file"; then
        problems_found=$((problems_found + 1))
        echo -e "${RED}   $problems_found. $file não usa React.lazy${NC}"
        break
    fi
done

# Problema 3: Falta de loader no HTML
if [ -f "index.html" ] && ! grep -q "loading\|spinner" "index.html"; then
    problems_found=$((problems_found + 1))
    echo -e "${RED}   $problems_found. index.html não tem loader inicial${NC}"
fi

# Problema 4: Falta de code splitting no Vite
if [ -f "vite.config.ts" ] && ! grep -q "manualChunks" "vite.config.ts"; then
    problems_found=$((problems_found + 1))
    echo -e "${RED}   $problems_found. vite.config.ts sem configuração de code splitting${NC}"
fi

if [ $problems_found -eq 0 ]; then
    echo -e "${GREEN}   ✅ Nenhum problema óbvio detectado${NC}"
    echo -e "${YELLOW}   ℹ️  O problema pode estar no servidor/rede${NC}"
fi
echo ""

# Recomendações
echo "💡 PRÓXIMAS AÇÕES RECOMENDADAS:"
echo ""
echo "1. Cole o snippet de 'Ferramenta 2' do DIAGNOSTICO_TELA_BRANCA.md"
echo "   no seu index.html dentro do <div id='root'>"
echo "   → Isso mostrará um loader INSTANTÂNEO"
echo ""
echo "2. Abra o navegador em modo anônimo e:"
echo "   - Abra o F12 (DevTools)"
echo "   - Vá na aba 'Network'"
echo "   - Recarregue a página"
echo "   - Ordene por 'Time' (decrescente)"
echo "   - Identifique qual recurso demora mais"
echo ""
echo "3. Cole o snippet 'Ferramenta 3' do DIAGNOSTICO_TELA_BRANCA.md"
echo "   no console antes de recarregar"
echo "   → Isso mostrará EXATAMENTE o que está travando"
echo ""
echo "=================================="
echo "✅ DIAGNÓSTICO COMPLETO!"
echo "=================================="
echo ""
echo "📋 Copie este output e compartilhe para análise detalhada."
