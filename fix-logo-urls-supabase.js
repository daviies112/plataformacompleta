#!/usr/bin/env node
/**
 * Script para atualizar URLs de logos no Supabase
 * Converte URLs absolutas para URLs relativas
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_ANON_KEY são necessários');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixLogoUrls() {
  console.log('🔍 Buscando formulários com URLs antigas de logos...');

  try {
    // Buscar todos os formulários
    const { data: forms, error } = await supabase
      .from('forms')
      .select('id, title, design_config');

    if (error) throw error;

    console.log(`📋 Encontrados ${forms?.length || 0} formulários`);

    let updated = 0;

    for (const form of forms || []) {
      if (!form.design_config?.logo) continue;

      const oldUrl = form.design_config.logo;
      let newUrl = oldUrl;
      let needsUpdate = false;

      // Converter URLs absolutas para relativas
      if (oldUrl.includes('://')) {
        // Extrair apenas o path: /uploads/logos/filename.png
        const match = oldUrl.match(/\/uploads\/logos\/[^"'\s]+/);
        if (match) {
          newUrl = match[0];
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        console.log(`  🔧 ${form.title}:`);
        console.log(`     Antes: ${oldUrl}`);
        console.log(`     Depois: ${newUrl}`);

        const updatedConfig = {
          ...form.design_config,
          logo: newUrl
        };

        const { error: updateError } = await supabase
          .from('forms')
          .update({
            design_config: updatedConfig,
            updated_at: new Date().toISOString()
          })
          .eq('id', form.id);

        if (updateError) {
          console.error(`     ❌ Erro: ${updateError.message}`);
        } else {
          updated++;
          console.log(`     ✅ Atualizado`);
        }
      }
    }

    console.log(`\n✅ Correção concluída: ${updated} formulário(s) corrigido(s)`);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }

  process.exit(0);
}

fixLogoUrls();
