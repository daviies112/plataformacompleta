
require('dotenv').config();
const { Pool } = require('pg');

async function check() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const columns = [
        'show_benefits_bar',
        'show_video_section',
        'show_mosaic_section',
        'mosaic_layout_columns',
        'hero_banner_autoplay',
        'hero_banner_interval',
        'show_active_campaign'
    ];

    console.log('--- Verificando Colunas em store_settings ---');
    for (const col of columns) {
        try {
            const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = '${col}'`);
            if (res.rows.length > 0) {
                console.log(`✅ Coluna '${col}' EXISTE.`);
            } else {
                console.log(`❌ Coluna '${col}' NÃO EXISTE.`);
            }
        } catch (e) {
            console.error(`Erro ao verificar ${col}: ${e.message}`);
        }
    }
    process.exit();
}
check();
