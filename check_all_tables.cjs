
require('dotenv').config();
const { Pool } = require('pg');

async function check() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const tables = ['store_benefits', 'store_videos', 'store_mosaics', 'store_campaigns'];
    console.log('--- Verificando Tabelas no Banco ---');

    for (const table of tables) {
        try {
            const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}'`);
            if (res.rows.length > 0) {
                const colRes = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}' AND column_name = 'tenant_id'`);
                console.log(`✅ Tabela '${table}' EXISTE. Tipo tenant_id: ${colRes.rows[0]?.data_type}`);
            } else {
                console.log(`❌ Tabela '${table}' NÃO EXISTE.`);
            }
        } catch (e) {
            console.error(`Erro ao verificar ${table}: ${e.message}`);
        }
    }
    process.exit();
}
check();
