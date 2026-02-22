
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

async function runMigration() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: false // Based on ?sslmode=disable in .env
    });

    try {
        console.log('🚀 Conectando ao banco de dados...');
        await client.connect();
        console.log('✅ Conectado!');

        const sqlPath = path.join(__dirname, 'FIX_TYPES.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📝 Executando migrações SQL...');
        // We split by ';' but be careful with functions/triggers. 
        // Actually, pg client can execute multiple statements if they are separated by semicolon.
        await client.query(sql);

        console.log('✨ Migrações concluídas com sucesso!');
    } catch (err) {
        console.error('❌ Erro ao executar migrações:', err.message);
        if (err.detail) console.error('Destaque:', err.detail);
        if (err.hint) console.error('Dica:', err.hint);
    } finally {
        await client.end();
    }
}

runMigration();
