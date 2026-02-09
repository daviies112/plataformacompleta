import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_TABLES = [
  { name: 'workspace_pages', module: 'Workspace' },
  { name: 'workspace_databases', module: 'Workspace' },
  { name: 'workspace_boards', module: 'Workspace' },
  { name: 'forms', module: 'Formulários' },
  { name: 'form_submissions', module: 'Formulários' },
  { name: 'products', module: 'Produto' },
  { name: 'suppliers', module: 'Produto' },
  { name: 'resellers', module: 'Produto' },
  { name: 'categories', module: 'Produto' },
  { name: 'print_queue', module: 'Produto' },
  { name: 'files', module: 'Faturamento' },
  { name: 'dashboard_completo_v5_base', module: 'Dashboard' },
  { name: 'dados_cliente', module: 'Leads' },
  { name: 'company_settings', module: 'Configurações' },
  { name: 'cpf_compliance_cache', module: 'CPF Compliance' },
  { name: 'completion_pages', module: 'Formulários' },
];

async function exportSupabaseData() {
  console.log('🚀 Iniciando exportação de dados do Supabase...\n');

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Credenciais do Supabase não encontradas!');
    console.log('   Configure REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY nos Secrets');
    process.exit(1);
  }

  console.log(`🌐 Conectando ao Supabase: ${supabaseUrl}`);
  const client = createClient(supabaseUrl, supabaseAnonKey);

  const exportDir = path.join(process.cwd(), 'exports', 'supabase');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const allData: Record<string, any[]> = {};
  let totalRecords = 0;
  let tablesExported = 0;
  let tablesFailed = 0;

  console.log('\n📊 Exportando tabelas do Supabase...\n');

  for (const table of SUPABASE_TABLES) {
    try {
      const { data, error, count } = await client
        .from(table.name)
        .select('*', { count: 'exact' });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not found')) {
          console.log(`⚠️  ${table.name}: Tabela não existe`);
        } else {
          console.log(`❌ ${table.name}: ${error.message}`);
        }
        tablesFailed++;
        allData[table.name] = [];
        continue;
      }

      const recordCount = data?.length || 0;
      allData[table.name] = data || [];
      totalRecords += recordCount;
      tablesExported++;
      console.log(`✅ ${table.name} (${table.module}): ${recordCount} registros`);
    } catch (err: any) {
      console.log(`❌ ${table.name}: ${err.message}`);
      tablesFailed++;
      allData[table.name] = [];
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const metadata = {
    exportedAt: new Date().toISOString(),
    source: 'Supabase',
    supabaseUrl: supabaseUrl,
    totalTables: tablesExported,
    tablesFailed: tablesFailed,
    totalRecords: totalRecords,
  };

  const jsonData = {
    metadata,
    tables: allData,
  };
  const jsonPath = path.join(exportDir, `supabase-export-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  console.log(`\n📄 JSON exportado: ${jsonPath}`);

  const workbook = XLSX.utils.book_new();

  const metadataSheet = XLSX.utils.json_to_sheet([
    { Campo: 'Data de Exportação', Valor: metadata.exportedAt },
    { Campo: 'Fonte', Valor: metadata.source },
    { Campo: 'URL do Supabase', Valor: metadata.supabaseUrl },
    { Campo: 'Tabelas Exportadas', Valor: metadata.totalTables },
    { Campo: 'Tabelas Falharam', Valor: metadata.tablesFailed },
    { Campo: 'Total de Registros', Valor: metadata.totalRecords },
  ]);
  XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadados');

  const MAX_CELL_LENGTH = 32000;
  
  for (const [tableName, data] of Object.entries(allData)) {
    if (data.length > 0) {
      const processedData = data.map((row: any) => {
        const processed: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          let cellValue: any;
          if (typeof value === 'object' && value !== null) {
            cellValue = JSON.stringify(value);
          } else {
            cellValue = value;
          }
          if (typeof cellValue === 'string' && cellValue.length > MAX_CELL_LENGTH) {
            cellValue = cellValue.substring(0, MAX_CELL_LENGTH) + '...[TRUNCATED]';
          }
          processed[key] = cellValue;
        }
        return processed;
      });

      const sheetName = tableName.substring(0, 31);
      const sheet = XLSX.utils.json_to_sheet(processedData);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    }
  }

  const xlsxPath = path.join(exportDir, `supabase-export-${timestamp}.xlsx`);
  XLSX.writeFile(workbook, xlsxPath);
  console.log(`📊 Excel exportado: ${xlsxPath}`);

  const latestJsonPath = path.join(exportDir, 'supabase-latest.json');
  const latestXlsxPath = path.join(exportDir, 'supabase-latest.xlsx');
  fs.copyFileSync(jsonPath, latestJsonPath);
  fs.copyFileSync(xlsxPath, latestXlsxPath);

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  📊 EXPORTAÇÃO SUPABASE - RESUMO      ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`✅ Tabelas exportadas: ${tablesExported}/${SUPABASE_TABLES.length}`);
  console.log(`⚠️  Tabelas falharam: ${tablesFailed}`);
  console.log(`📈 Total de registros: ${totalRecords}`);
  console.log(`\n📁 Arquivos salvos em: ${exportDir}`);
  console.log(`   - ${path.basename(jsonPath)}`);
  console.log(`   - ${path.basename(xlsxPath)}`);
  console.log(`   - supabase-latest.json`);
  console.log(`   - supabase-latest.xlsx`);
  console.log('\n✅ Exportação do Supabase concluída com sucesso!\n');
}

exportSupabaseData().catch(console.error);
