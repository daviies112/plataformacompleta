import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente
import 'dotenv/config';

interface ColumnInfo {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
}

interface TableInfo {
    table_name: string;
    columns: ColumnInfo[];
}

async function getSchema(connectionString: string): Promise<TableInfo[]> {
    if (!connectionString) return [];

    const pool = new Pool({ connectionString });

    try {
        const client = await pool.connect();

        // Lista todas as tabelas do schema public
        const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

        const { rows: tables } = await client.query(tablesQuery);
        const result: TableInfo[] = [];

        for (const table of tables) {
            const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `;

            const { rows: columns } = await client.query(columnsQuery, [table.table_name]);

            result.push({
                table_name: table.table_name,
                columns: columns
            });
        }

        client.release();
        return result;
    } catch (error) {
        console.error('Erro ao conectar ou buscar schema:', error);
        return [];
    } finally {
        await pool.end();
    }
}

function generateMarkdown(dbName: string, schema: TableInfo[]): string {
    let md = `## Schema do Banco de Dados: ${dbName}\n\n`;

    if (schema.length === 0) {
        md += "*Nenhuma tabela encontrada ou erro de conexão.*\n\n";
        return md;
    }

    md += `Total de tabelas: ${schema.length}\n\n`;

    for (const table of schema) {
        md += `### Tabela: \`${table.table_name}\`\n`;
        md += `| Coluna | Tipo | Nulo? | Default |\n`;
        md += `|---|---|---|---|\n`;

        for (const col of table.columns) {
            const def = col.column_default ? `\`${col.column_default}\`` : '-';
            md += `| **${col.column_name}** | ${col.data_type} | ${col.is_nullable} | ${def} |\n`;
        }
        md += `\n---\n`;
    }

    return md;
}

async function main() {
    console.log('🔍 Iniciando Raio-X dos Bancos de Dados...');

    const outputDir = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    let fullReport = `# 🕵️ Relatório de Raio-X do Banco de Dados\n`;
    fullReport += `Gerado em: ${new Date().toLocaleString()}\n\n`;

    // 1. Owner (Login)
    console.log('📡 Analisando Banco OWNER...');
    const ownerUrl = process.env.SUPABASE_OWNER_URL || process.env.DATABASE_URL; // Fallback
    if (ownerUrl) {
        const ownerSchema = await getSchema(ownerUrl);
        fullReport += generateMarkdown('OWNER (Login)', ownerSchema);
    } else {
        fullReport += `## OWNER (Login)\n*URL não configurada no .env*\n\n`;
    }

    // 2. Master (CPF) - Se houver variável, adicione aqui
    // const masterUrl = process.env.SUPABASE_MASTER_URL;
    // ... lógica igual acima ...

    // 3. Cliente Exemplo (Local Postgres)
    console.log('📡 Analisando Banco LOCAL/CLIENTE...');
    const localUrl = process.env.DATABASE_URL;
    if (localUrl && localUrl !== ownerUrl) {
        const localSchema = await getSchema(localUrl);
        fullReport += generateMarkdown('CLIENTE (Exemplo Local)', localSchema);
    }

    const outputPath = path.join(outputDir, 'database_schema_snapshot.md');
    fs.writeFileSync(outputPath, fullReport);

    console.log(`✅ Relatório salvo em: ${outputPath}`);
    console.log('📄 O Claude agora pode ler este arquivo para entender a estrutura do seu banco.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { main };
