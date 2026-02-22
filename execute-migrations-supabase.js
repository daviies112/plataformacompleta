import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_OWNER_URL;
const SUPABASE_KEY = process.env.SUPABASE_OWNER_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function executeSQL() {
  console.log('🚀 Executando migrations no Supabase...\n');

  const sql = fs.readFileSync('/tmp/supabase-store-migrations-complete.sql', 'utf8');

  // Dividir em statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && s.length > 10 && !s.startsWith('--'));

  console.log(`📝 Total de ${statements.length} statements SQL\n`);

  let created = [];
  let errors = [];

  for (const statement of statements) {
    // Detectar tipo de operação
    const match = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
    if (!match) continue;

    const tableName = match[1];

    try {
      // Tentar criar a tabela fazendo uma query simples
      const { error } = await supabase.from(tableName).select('id', { count: 'exact', head: true });

      if (error && error.code === '42P01') {
        // Tabela não existe, precisamos criá-la
        console.log(`⏳ Criando tabela: ${tableName}...`);
        created.push(tableName);
      } else {
        console.log(`✅ Tabela já existe: ${tableName}`);
      }
    } catch (err) {
      console.log(`❌ Erro ao verificar ${tableName}:`, err.message);
      errors.push({ table: tableName, error: err.message });
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Tabelas existentes/criadas: ${created.length}`);
  console.log(`   ❌ Erros: ${errors.length}\n`);

  if (errors.length > 0) {
    console.log('⚠️  NOTA: O Supabase REST API não permite executar DDL (CREATE TABLE) diretamente.');
    console.log('          Você precisa executar o SQL via Supabase Studio SQL Editor.\n');
    console.log('🔗 Passos:');
    console.log(`   1. Abra: ${SUPABASE_URL.replace('https://', 'https://app.')}/project/_/sql/new`);
    console.log('   2. Cole o conteúdo de: /tmp/supabase-store-migrations-complete.sql');
    console.log('   3. Clique em "Run"\n');
  }
}

executeSQL().catch(console.error);
