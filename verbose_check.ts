
import { pool } from './server/db';
import { decrypt } from './server/lib/credentialsManager';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
    console.log('--- Verificando Configuração ---');
    try {
        const res = await pool!.query("SELECT * FROM supabase_config WHERE tenant_id = 'system'");
        if (res.rows.length > 0) {
            const config = res.rows[0];
            console.log('Database Supabase URL:', config.supabase_url);
            try {
                const dUrl = decrypt(config.supabase_url);
                console.log('Decrypted URL:', dUrl);
            } catch (e) {
                console.log('Url is not encrypted or decryption failed');
            }
        } else {
            console.log('No config for system in supabase_config table');
        }

        console.log('.env SUPABASE_OWNER_URL:', process.env.SUPABASE_OWNER_URL);
        console.log('.env DATABASE_URL Host:', process.env.DATABASE_URL?.split('@')[1]?.split(':')[0]);

        // Check column type physically
        const colRes = await pool!.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'store_campaigns' AND column_name = 'tenant_id'");
        console.log('Physical Column Type:', JSON.stringify(colRes.rows, null, 2));

    } catch (e) {
        console.error(e);
    }
    process.exit();
}
check();
