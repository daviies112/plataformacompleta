/**
 * Script para rodar migrations das tabelas store_* no Supabase
 * Usa as credenciais do SUPABASE_OWNER do .env
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_OWNER_URL;
const SUPABASE_KEY = process.env.SUPABASE_OWNER_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERRO: SUPABASE_OWNER_URL ou SUPABASE_OWNER_SERVICE_KEY não encontrados no .env');
  process.exit(1);
}

console.log('🚀 Conectando no Supabase:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration(migrationFile) {
  console.log(`\n📝 Rodando migration: ${path.basename(migrationFile)}`);

  const sql = fs.readFileSync(migrationFile, 'utf8');

  // Dividir em statements individuais (separados por ponto e vírgula)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Pular comentários e statements vazios
    if (!statement || statement.startsWith('--') || statement.length < 10) continue;

    try {
      // Usar rpc para executar SQL direto
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Se o erro for "already exists", não é um erro crítico
        if (error.message?.includes('already exists') || error.message?.includes('já existe')) {
          console.log(`⚠️  ${i + 1}/${statements.length}: Objeto já existe, pulando...`);
        } else {
          console.error(`❌ ${i + 1}/${statements.length}: ERRO:`, error.message);
          errorCount++;
        }
      } else {
        console.log(`✅ ${i + 1}/${statements.length}: OK`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ ${i + 1}/${statements.length}: ERRO:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Resumo: ${successCount} sucesso, ${errorCount} erros`);
}

async function checkTables() {
  console.log('\n🔍 Verificando tabelas criadas...');

  const tables = [
    'store_banners',
    'store_benefits',
    'store_campaigns',
    'store_mosaics',
    'store_videos'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: NÃO EXISTE`);
      } else {
        console.log(`✅ ${table}: OK`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ERRO - ${err.message}`);
    }
  }
}

async function main() {
  console.log('🎯 Iniciando migrations das tabelas Store...\n');

  const migrationsDir = path.join(__dirname, '../migrations');

  const migrationFiles = [
    path.join(migrationsDir, 'create-store-tables.sql'),
    path.join(migrationsDir, 'add-store-enhancements.sql')
  ];

  for (const file of migrationFiles) {
    if (fs.existsSync(file)) {
      await runMigration(file);
    } else {
      console.log(`⚠️  Migration não encontrada: ${path.basename(file)}`);
    }
  }

  await checkTables();

  console.log('\n✅ Migrations concluídas!\n');
}

main().catch(err => {
  console.error('❌ ERRO FATAL:', err);
  process.exit(1);
});
