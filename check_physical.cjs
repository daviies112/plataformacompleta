
require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');

async function check() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    console.log('--- Verificando Configuração Física ---');
    try {
        const colRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'store_campaigns' AND column_name = 'tenant_id'");
        console.log('Physical Column Type:', JSON.stringify(colRes.rows, null, 2));

        const configRes = await pool.query("SELECT tenant_id, supabase_url FROM supabase_config WHERE tenant_id = 'system'");
        console.log('System Config in DB:', JSON.stringify(configRes.rows, null, 2));

    } catch (e) {
        console.error(e.message);
    }
    process.exit();
}
check();
