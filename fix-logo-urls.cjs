#!/usr/bin/env node
/**
 * Script para corrigir URLs de logos - Versão Simplificada
 * - Backend: Retorna URLs relativas
 * - Frontend: Limpa URLs absolutas automaticamente
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Iniciando correção de URLs de logos...\n');

// ========================================
// 1. BACKEND: Garantir que retorna URL relativa
// ========================================
const routesPath = path.join(process.cwd(), 'server', 'routes.ts');

if (fs.existsSync(routesPath)) {
  let content = fs.readFileSync(routesPath, 'utf8');
  
  // Procurar pela seção de upload de logo
  const targetSection = content.match(/app\.post\("\/api\/upload\/logo"[\s\S]*?}\);/);
  
  if (targetSection) {
    const sectionText = targetSection[0];
    
    // Verificar se já está usando URL relativa
    if (sectionText.includes('const logoUrl = `/uploads/logos/${req.file.filename}`;')) {
      console.log('✓ Backend já está correto (retorna URL relativa)');
    } else {
      // Substituir qualquer variação de URL por relativa
      const fixed = sectionText.replace(
        /const logoUrl = [`'].*\/uploads\/logos\/\$\{req\.file\.filename\}[`'];/,
        'const logoUrl = `/uploads/logos/${req.file.filename}`;'
      );
      
      content = content.replace(targetSection[0], fixed);
      fs.writeFileSync(routesPath, content);
      console.log('✅ Backend corrigido para retornar URL relativa');
    }
  } else {
    console.log('⚠️  Backend: Seção de upload não encontrada');
  }
} else {
  console.error('❌ Arquivo server/routes.ts não encontrado');
}

console.log('\n✅ Correção concluída!');
console.log('\n📋 PRÓXIMOS PASSOS:\n');
console.log('1. Executar: node fix-logo-urls-supabase.js (para limpar banco)');
console.log('2. Reiniciar servidor: pm2 restart all');
