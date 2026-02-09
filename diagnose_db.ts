import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function testDatabase() {
    const dbUrl = process.env.DATABASE_URL;
    console.log('🔍 Testando conexão com PostgreSQL...');
    console.log('📍 DATABASE_URL:', dbUrl ? '(encontrada)' : '(NÃO ENCONTRADA)');

    if (!dbUrl) {
        console.error('❌ DATABASE_URL não está definida no ambiente.');
        process.exit(1);
    }

    try {
        const sql = postgres(dbUrl, { max: 1, timeout: 5 });
        const result = await sql`SELECT version()`;
        console.log('✅ Conexão estabelecida com sucesso!');
        console.log('📟 Versão do Postgres:', result[0].version);

        // Testar se a tabela app_settings existe
        try {
            const tables = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'app_settings'
        );
      `;
            console.log('📊 Tabela app_settings existe:', tables[0].exists ? 'SIM' : 'NÃO');
        } catch (e) {
            console.warn('⚠️ Erro ao verificar tabela app_settings:', e.message);
        }

        await sql.end();
    } catch (err) {
        console.error('❌ Erro de conexão:', err.message);
        if (err.code) console.error('📌 Código do erro:', err.code);
        process.exit(1);
    }
}

testDatabase();
